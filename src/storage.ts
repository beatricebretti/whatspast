import { openDB } from 'idb';
import type { Chat, Favorites, FavoriteMap, ConversationProfile } from './types';
const db = openDB('whatspast', 3, {
  blocked() {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('whatspast-storage-blocked'));
  },
  blocking() {
    void db.then((connection) => connection.close());
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('whatspast-storage-reload'));
  },
  upgrade(db) {
    if (!db.objectStoreNames.contains('chats')) db.createObjectStore('chats', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
    if (!db.objectStoreNames.contains('favorites')) db.createObjectStore('favorites');
    if (!db.objectStoreNames.contains('profiles'))
      db.createObjectStore('profiles', { keyPath: 'id' });
  },
});
export async function allChats(): Promise<Chat[]> {
  const d = await db,
    tx = d.transaction(['chats', 'profiles']);
  const [chats, profiles] = await Promise.all([
    tx.objectStore('chats').getAll(),
    tx.objectStore('profiles').getAll(),
  ]);
  const byId = new Map<string, ConversationProfile>(profiles.map((p) => [p.id, p]));
  return chats.map((chat: Chat) => ({ ...chat, ...byId.get(chat.id) }));
}
export async function saveConversationProfile(id: string, name: string, avatar?: Blob) {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80)
    throw new Error('Use a conversation name between 1 and 80 characters.');
  const d = await db;
  await d.put('profiles', { id, name: trimmed, avatar } satisfies ConversationProfile);
}
export async function saveChat(chat: Chat, files: File[] = []): Promise<Chat> {
  const d = await db,
    archiveKeys = [...(chat.archiveKeys || [])];
  const writes = files.map((file) => {
    const key = /\.zip$/i.test(file.name)
      ? `${chat.id}/archives/${crypto.randomUUID()}/${file.name}`
      : `${chat.id}/${file.name}`;
    if (/\.zip$/i.test(file.name)) archiveKeys.unshift(key);
    return { key, file };
  });
  const saved = { ...chat, archiveKeys, updatedAt: Date.now() };
  const tx = d.transaction(['chats', 'files'], 'readwrite');
  // Queue writes together; failed imports roll back metadata and files atomically.
  const operations = [
    tx.objectStore('chats').put(saved),
    ...writes.map(({ key, file }) => tx.objectStore('files').put(file, key)),
  ];
  await Promise.all([...operations, tx.done]);
  return saved;
}
export const getFile = async (id: string, name: string) =>
  (await db).get('files', `${id}/${name}`) as Promise<Blob | undefined>;
export async function allFavorites(): Promise<FavoriteMap> {
  const d = await db,
    tx = d.transaction('favorites'),
    result: FavoriteMap = {};
  let cursor = await tx.store.openCursor();
  while (cursor) {
    result[String(cursor.key)] = cursor.value;
    cursor = await cursor.continue();
  }
  return result;
}
export async function saveFavorites(id: string, favorites: Favorites) {
  const d = await db;
  await d.put('favorites', favorites, id);
}
export const removeChat = async (id: string) => {
  const d = await db;
  const tx = d.transaction(['chats', 'files', 'favorites', 'profiles'], 'readwrite');
  await tx.objectStore('chats').delete(id);
  await tx.objectStore('favorites').delete(id);
  await tx.objectStore('profiles').delete(id);
  let cursor = await tx
    .objectStore('files')
    .openCursor(IDBKeyRange.bound(id + '/', id + '/\uffff'));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
};

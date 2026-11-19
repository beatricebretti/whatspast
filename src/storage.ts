import { openDB } from 'idb';
import type { Chat, Favorites, FavoriteMap } from './types';
const db = openDB('whatspast', 2, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('chats')) db.createObjectStore('chats', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
    if (!db.objectStoreNames.contains('favorites')) db.createObjectStore('favorites');
  },
});
export const allChats = async () => (await db).getAll('chats') as Promise<Chat[]>;
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
  const tx = d.transaction(['chats', 'files', 'favorites'], 'readwrite');
  await tx.objectStore('chats').delete(id);
  await tx.objectStore('favorites').delete(id);
  let cursor = await tx
    .objectStore('files')
    .openCursor(IDBKeyRange.bound(id + '/', id + '/\uffff'));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
};

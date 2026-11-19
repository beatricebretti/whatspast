export function mediaName(text) {
  const match =
    text.match(
      /(?:<attached:\s*|<adjunto:\s*|(?:^|\n))([^\n<>]+?\.(?:webp|jpe?g|png|gif|mp4|mov|opus|ogg|mp3|m4a|pdf))(?:>|\s*\([^\n]*\)|\s*$)/i,
    ) || text.match(/([\w-]+\.(?:webp|jpe?g|png|gif|mp4|mov|opus|ogg|mp3|m4a|pdf))/i);
  return match?.[1]?.trim();
}
export function mediaKind(text) {
  const name = mediaName(text);
  if (!name) return null;
  if (/\.webp$/i.test(name)) return 'sticker';
  if (/\.(jpe?g|png|gif)$/i.test(name)) return 'image';
  if (/\.(mp4|mov)$/i.test(name)) return 'video';
  if (/\.(opus|ogg|mp3|m4a)$/i.test(name)) return 'audio';
  return 'document';
}
export function dayKey(timestamp) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function filterMessages(messages, { day = '', search = '', kind = 'all' } = {}) {
  return messages.filter(
    (m) =>
      (!day || dayKey(m.timestamp) === day) &&
      (!search || `${m.sender || ''} ${m.text}`.toLowerCase().includes(search.toLowerCase())) &&
      (kind === 'all' || mediaKind(m.text) === kind),
  );
}

export function sortByTimestamp(items, order = 'newest', getTimestamp = (item) => item.timestamp) {
  const direction = order === 'oldest' ? 1 : -1;
  return [...items].sort((a, b) => direction * (getTimestamp(a) - getTimestamp(b)));
}

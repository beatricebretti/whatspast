import { messageContent } from './insights.mjs';
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function pattern(query, wholeWord) {
  return new RegExp(
    wholeWord ? `(?<![\\p{L}\\p{N}_])${escape(query)}(?![\\p{L}\\p{N}_])` : escape(query),
    'giu',
  );
}
export function matchingMessageIndexes(messages, query, wholeWord = false) {
  if (!query.trim()) return [];
  const regex = pattern(query, wholeWord),
    indexes = [];
  messages.forEach((message, index) => {
    regex.lastIndex = 0;
    const text = wholeWord
      ? messageContent(message.text)
      : `${message.sender || ''} ${message.text}`;
    if (regex.test(text)) indexes.push(index);
  });
  return indexes;
}
export function highlightParts(text, query, wholeWord = false) {
  if (!query.trim()) return [{ text, match: false }];
  const regex = pattern(query, wholeWord),
    parts = [];
  let start = 0;
  for (const match of text.matchAll(regex)) {
    if (match.index > start) parts.push({ text: text.slice(start, match.index), match: false });
    parts.push({ text: match[0], match: true });
    start = match.index + match[0].length;
  }
  if (start < text.length) parts.push({ text: text.slice(start), match: false });
  return parts;
}
export function nextSearchIndex(current, step, count) {
  return count ? (((current + step) % count) + count) % count : 0;
}

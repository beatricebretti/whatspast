import { messageContent } from './insights.mjs';
const clean = (s) => s.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '');
export function parseChat(text, dateOrder = 'auto') {
  const lines = clean(text).split(/\r\n|\r|\n/);
  const pattern =
    /^\[?(\d{1,4})[/.\-](\d{1,2})[/.\-](\d{1,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]\.?m\.?)?\]?\s*(?:-\s*)?(.*)$/i;
  const matches = lines.map((l) => l.match(pattern)).filter(Boolean);
  let order = dateOrder;
  if (order === 'auto')
    order = matches.some((m) => Number(m[1]) > 12 && m[1].length < 4)
      ? 'dmy'
      : matches.some((m) => Number(m[2]) > 12)
        ? 'mdy'
        : 'dmy';
  const messages = [];
  let current;
  for (const line of lines) {
    const m = line.match(pattern);
    if (!m) {
      if (current) current.text += '\n' + line;
      continue;
    }
    let a = +m[1],
      b = +m[2],
      c = +m[3];
    let year = m[1].length === 4 ? a : c;
    if (year < 100) year += 2000;
    const month = m[1].length === 4 ? b : order === 'mdy' ? a : b,
      day = m[1].length === 4 ? c : order === 'mdy' ? b : a;
    let h = +m[4];
    if (m[7]) h = (h % 12) + (/^p/i.test(m[7]) ? 12 : 0);
    const body = m[8],
      separator = body.indexOf(': ');
    const sender = separator >= 0 ? body.slice(0, separator) : null;
    current = {
      id: messages.length,
      timestamp: new Date(year, month - 1, day, h, +m[5], +(m[6] || 0)).getTime(),
      sender,
      text: separator >= 0 ? body.slice(separator + 2) : body,
    };
    messages.push(current);
  }
  return {
    messages,
    dateOrder: order,
    ambiguous: dateOrder === 'auto' && !matches.some((m) => +m[1] > 12 || +m[2] > 12),
  };
}
export function analyze(messages) {
  const counts = {},
    words = new Map(),
    hours = Array(24).fill(0),
    days = Array(7).fill(0);
  let wordCount = 0;
  const stop = new Set(
    'the a an and or to of in on for is it i you we me my your our this that was are be have has with so but at as do not no yes un una el la los las de del que y en por para con es se lo me te mi tu si o a'.split(
      ' ',
    ),
  );
  for (const m of messages) {
    if (!m.sender) continue;
    counts[m.sender] = (counts[m.sender] || 0) + 1;
    const d = new Date(m.timestamp);
    hours[d.getHours()]++;
    days[d.getDay()]++;
    const tokens =
      messageContent(m.text)
        .toLowerCase()
        .match(/[\p{L}]{2,}/gu) || [];
    wordCount += tokens.length;
    for (const w of tokens) if (!stop.has(w) && !isNoise(w)) words.set(w, (words.get(w) || 0) + 1);
  }
  return {
    counts,
    words: [...words].sort((a, b) => b[1] - a[1]).slice(0, 40),
    hours,
    days,
    wordCount,
  };
}

function isNoise(word) {
  return (
    /^(?:(?:ha|he|hi|ho|hu|ja|je|ji|jo|ju|ka){2,}|a?ha+h?a*|a?h[ah]+|a?j[aj]+|h[eh]+|h{2,}|(?:l+o+l+)+|lmao+|lmfao+|rofl+|xd+|x{2,})$/i.test(
      word,
    ) || noiseWords.has(word)
  );
}
const noiseWords = new Set([
  'haha',
  'hehe',
  'jaja',
  'hahaha',
  'sticker',
  'stickers',
  'omitted',
  'omitido',
  'omitida',
  'multimedia',
  'media',
  'attached',
  'archivo',
  'adjunto',
  'image',
  'imagen',
  'photo',
  'foto',
  'video',
  'audio',
  'opus',
  'jpg',
  'jpeg',
  'webp',
  'mp4',
  'png',
  'gif',
  'pdf',
  'document',
  'documento',
  'excluded',
  'excluido',
  'note',
  'notes',
  'voicenote',
  'voicenotes',
  'voice',
  'ptt',
]);

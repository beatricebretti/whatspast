import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChat, analyze } from '../src/parser.mjs';
test('iOS export handles direction marks, narrow spaces, AM/PM and multiline messages', () => {
  const { messages } = parseChat(
    '\u200e[21-07-25, 4:37:32\u202fAM] Alex: hello\r\nsecond line\r\n[21-07-25, 12:01:00 PM] Bea: hi',
  );
  assert.equal(messages.length, 2);
  assert.equal(messages[0].sender, 'Alex');
  assert.equal(messages[0].text, 'hello\nsecond line');
  assert.equal(new Date(messages[1].timestamp).getHours(), 12);
});
test('Android export and system events', () => {
  const { messages } = parseChat(
    '11/19/26, 09:10 - Messages are encrypted\n11/19/26, 09:11 - Alex: hello: there',
  );
  assert.equal(messages[0].sender, null);
  assert.equal(messages[1].text, 'hello: there');
  assert.equal(new Date(messages[0].timestamp).getMonth(), 10);
});
test('ambiguous dates allow explicit override', () => {
  assert.equal(parseChat('[03/04/26, 10:00] Alex: hi').ambiguous, true);
  assert.equal(
    new Date(parseChat('[03/04/26, 10:00] Alex: hi', 'mdy').messages[0].timestamp).getMonth(),
    2,
  );
});
test('Unicode word counts and participant totals exclude system events', () => {
  const { messages } = parseChat(
    '[21/07/25, 10:00] Alex: café café hello\n[21/07/25, 11:00] Bea: café hola\n[21/07/25, 12:00] Messages encrypted',
  );
  const stats = analyze(messages);
  assert.deepEqual(stats.counts, { Alex: 1, Bea: 1 });
  assert.equal(stats.words[0][0], 'café');
  assert.equal(stats.words[0][1], 3);
});
test('word rankings exclude laughter, sticker labels, omitted media and attachment filenames', () => {
  const texts = [
    'sticker omitted',
    'image omitted',
    'audio omitted',
    'video omitted',
    'haha hahaha hahahah HAHAHA ahahahaha hehehe heheheh jajaja jajajajaj LOL loooool lmao xD',
    '<attached: 0001-STICKER-2026-06-10.webp>',
    '0002-PHOTO-2026-06-10.jpg (file attached)',
    'coffee coffee mountains',
  ];
  const messages = texts.map((text, id) => ({ id, sender: 'Alex', text, timestamp: Date.now() }));
  const stats = analyze(messages);
  assert.deepEqual(stats.words, [
    ['coffee', 2],
    ['mountains', 1],
  ]);
  assert.equal(stats.counts.Alex, texts.length);
});
test('attachment captions remain available to word rankings', () => {
  const stats = analyze([
    {
      id: 0,
      sender: 'Alex',
      text: '<attached: 001-STICKER.webp>\nbeautiful mountains',
      timestamp: Date.now(),
    },
  ]);
  assert.deepEqual(stats.words, [
    ['beautiful', 1],
    ['mountains', 1],
  ]);
});
test('voice note labels are excluded from repeated words', () => {
  const stats = analyze([
    {
      id: 0,
      sender: 'Alex',
      timestamp: Date.now(),
      text: 'Voice note omitted notes voicenote voicenotes coffee coffee',
    },
  ]);
  assert.deepEqual(stats.words, [['coffee', 2]]);
});

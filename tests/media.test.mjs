import test from 'node:test';
import assert from 'node:assert/strict';
import { mediaName, mediaKind, dayKey, filterMessages } from '../src/media.mjs';
test('media classification separates stickers, photos, videos, audio and documents', () => {
  for (const [name, kind] of [
    ['001.webp', 'sticker'],
    ['photo.JPG', 'image'],
    ['clip.mp4', 'video'],
    ['note.opus', 'audio'],
    ['music.m4a', 'audio'],
    ['ticket.pdf', 'document'],
  ]) {
    assert.equal(mediaName(`<attached: ${name}>`), name);
    assert.equal(mediaKind(`<attached: ${name}>`), kind);
  }
  assert.equal(mediaKind('sticker omitted'), null);
  assert.equal(mediaKind('hello'), null);
  assert.equal(mediaName('photo with spaces.jpg (file attached)'), 'photo with spaces.jpg');
});
test('day filter uses local calendar dates and includes both text and media', () => {
  const messages = [
    { id: 0, sender: 'Alex', timestamp: new Date(2026, 10, 18, 23, 59).getTime(), text: 'hello' },
    {
      id: 1,
      sender: 'Alex',
      timestamp: new Date(2026, 10, 19, 0, 1).getTime(),
      text: '<attached: sunrise.jpg>',
    },
    { id: 2, sender: 'Bea', timestamp: new Date(2026, 10, 19, 22).getTime(), text: 'hello again' },
    {
      id: 3,
      sender: 'Bea',
      timestamp: new Date(2026, 10, 20, 0).getTime(),
      text: '<attached: sticker.webp>',
    },
  ];
  assert.equal(dayKey(messages[1].timestamp), '2026-11-19');
  assert.deepEqual(
    filterMessages(messages, { day: '2026-11-19' }).map((m) => m.id),
    [1, 2],
  );
  assert.deepEqual(
    filterMessages(messages, { day: '2026-11-19', kind: 'image' }).map((m) => m.id),
    [1],
  );
  assert.deepEqual(
    filterMessages(messages, { day: '2026-11-19', search: 'HELLO' }).map((m) => m.id),
    [2],
  );
  assert.equal(filterMessages(messages, { day: '2026-11-21' }).length, 0);
  assert.equal(filterMessages(messages).length, 4);
});

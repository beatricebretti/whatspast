import test from 'node:test';
import assert from 'node:assert/strict';
import { conversationInsights, callRecord } from '../src/insights.mjs';
const m = (sender, text, day = 19, hour = 12, id = 0) => ({
  id,
  sender,
  text,
  timestamp: new Date(2026, 10, day, hour).getTime(),
});
test('emojis count grapheme clusters, joined families, skin tones, flags and keycaps', () => {
  const stats = conversationInsights([m('Alex', '❤️❤️ 👍🏽 👨‍👩‍👧‍👦 🇨🇱 1️⃣'), m('Bea', '👍🏽👍🏽 ❤️')]);
  assert.equal(new Map(stats.emojis).get('❤️'), 3);
  assert.equal(new Map(stats.emojis).get('👍🏽'), 3);
  for (const emoji of ['👨‍👩‍👧‍👦', '🇨🇱', '1️⃣']) assert.equal(new Map(stats.emojis).get(emoji), 1);
  assert.equal(stats.emojiByPerson.Alex['👍🏽'], 1);
  assert.equal(stats.emojiByPerson.Bea['👍🏽'], 2);
});
test('daily starters use first timestamp per local day, exclude system and call records, and allow media', () => {
  const stats = conversationInsights([
    m('Alex', 'later', 19, 15),
    m(null, 'Encrypted', 19, 0),
    m('Bea', 'hello', 19, 8),
    m('Alex', '<attached: photo.jpg>', 20, 7),
    m('Bea', 'Voice call, 5 min', 20, 6),
  ]);
  assert.deepEqual(stats.starters, { Bea: 1, Alex: 1 });
  assert.equal(stats.days, 2);
});
test('call attribution requires explicit caller evidence and does not infer missed call initiators', () => {
  const stats = conversationInsights([
    m('Alex', 'Started a voice call'),
    m(null, 'Bea started a video call'),
    m('Bea', 'Voice call, 2 min'),
    m('Bea', 'Missed voice call'),
    m('Alex', 'Please call me later'),
    m('Bea', 'hello'),
  ]);
  assert.deepEqual(stats.calls.byCaller, { Alex: 1, Bea: 1 });
  assert.equal(stats.calls.events, 4);
  assert.equal(stats.calls.unattributed, 2);
  assert.equal(stats.calls.missed, 1);
  assert.equal(callRecord(m('Bea', 'Please call me later')), null);
});
test('empty history has no inferred emoji, starter or call values', () => {
  const stats = conversationInsights([]);
  assert.deepEqual(stats.emojis, []);
  assert.deepEqual(stats.starters, {});
  assert.equal(stats.calls.events, 0);
});

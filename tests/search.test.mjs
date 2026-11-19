import test from 'node:test';
import assert from 'node:assert/strict';
import { matchingMessageIndexes, highlightParts, nextSearchIndex } from '../src/search.mjs';
const messages = [
  { sender: 'Alex', text: 'Coffee is great' },
  { sender: 'Bea', text: 'coffeehouse' },
  { sender: 'Alex', text: 'Coffee again, coffee!' },
  { sender: 'Alex', text: '<attached: coffee.jpg>' },
];
test('word search finds whole-word messages and excludes attachment filenames', () => {
  assert.deepEqual(matchingMessageIndexes(messages, 'coffee', true), [0, 2]);
  assert.deepEqual(matchingMessageIndexes(messages, 'coffee'), [0, 1, 2, 3]);
});
test('Unicode word boundaries distinguish words from longer words', () => {
  const rows = [
    { sender: 'A', text: 'café caféine' },
    { sender: 'B', text: 'caféine' },
  ];
  assert.deepEqual(matchingMessageIndexes(rows, 'café', true), [0]);
  assert.equal(highlightParts(rows[0].text, 'café', true).filter((p) => p.match).length, 1);
});
test('search punctuation is literal and highlighting preserves original text', () => {
  const text = 'A (coffee)? Coffee!';
  const parts = highlightParts(text, '(coffee)?');
  assert.equal(parts.filter((p) => p.match).length, 1);
  assert.equal(parts.map((p) => p.text).join(''), text);
  assert.deepEqual(matchingMessageIndexes(messages, '['), []);
});
test('navigation wraps forward and backward and handles no matches', () => {
  assert.equal(nextSearchIndex(2, 1, 3), 0);
  assert.equal(nextSearchIndex(0, -1, 3), 2);
  assert.equal(nextSearchIndex(0, 1, 0), 0);
  assert.deepEqual(matchingMessageIndexes(messages, '  '), []);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAppearance } from '../src/appearance.mjs';
test('appearance validates saved settings and follows system preference on first visit', () => {
  assert.deepEqual(normalizeAppearance(null), { mode: 'light', palette: 'rose' });
  assert.deepEqual(normalizeAppearance(null, true), { mode: 'dark', palette: 'rose' });
  assert.deepEqual(normalizeAppearance({ mode: 'dark', palette: 'ocean' }), {
    mode: 'dark',
    palette: 'ocean',
  });
  assert.deepEqual(normalizeAppearance({ mode: 'invalid', palette: 'other' }, true), {
    mode: 'dark',
    palette: 'rose',
  });
});

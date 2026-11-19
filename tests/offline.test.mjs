import test from 'node:test';
import assert from 'node:assert/strict';
import { renderServiceWorker } from '../scripts/offline-template.mjs';
const urls = ['/', '/assets/main.js', '/appearance-init.js'];
test('compact offline template receives every application asset and the build version', () => {
  const result = renderServiceWorker(
    "const CACHE='whatspast-__BUILD_VERSION__';const PRECACHE=/* __PRECACHE__ */[];",
    'abc',
    urls,
  );
  assert.ok(result.includes('whatspast-abc'));
  assert.deepEqual(JSON.parse(result.match(/const PRECACHE=(.*);/)[1]), urls);
});
test('formatted offline template keeps its complete precache', () => {
  const result = renderServiceWorker(
    "const CACHE = 'whatspast-__BUILD_VERSION__';\nconst PRECACHE = /* __PRECACHE__ */ [];",
    'def',
    urls,
  );
  assert.deepEqual(JSON.parse(result.match(/const PRECACHE = (.*);/)[1]), urls);
});
test('missing placeholders fail rather than silently producing an empty offline cache', () => {
  assert.throws(() => renderServiceWorker('const PRECACHE=[];', 'abc', urls), /missing/);
  assert.throws(
    () => renderServiceWorker("const CACHE='__BUILD_VERSION__';const PRECACHE=[];", 'abc', urls),
    /missing/,
  );
});

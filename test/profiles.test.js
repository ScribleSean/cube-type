import { test } from 'node:test';
import assert from 'node:assert/strict';

// profiles.js reads storage when it loads, so each case stubs localStorage and imports a fresh copy.
let n = 0;
async function loadWith(blob) {
  const store = new Map([['cubetype:profiles', JSON.stringify(blob)]]);
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const { profiles } = await import(`../src/profiles.js?case=${n++}`);
  return profiles;
}

test('profiles that are not objects are dropped and a usable one remains', async () => {
  const profiles = await loadWith({ active: 'a', profiles: { a: 'oops', b: null, c: [1] } });
  assert.equal(profiles.list().length, 1);
  assert.equal(profiles.active().name, 'player');
});

test('a stored active id of __proto__ does not resolve to Object.prototype', async () => {
  const profiles = await loadWith({ active: '__proto__', profiles: { a: { name: 'sam', records: [] } } });
  assert.equal(profiles.active().name, 'sam');
});

test('stored records reach the UI with a known mode and numeric fields only', async () => {
  const profiles = await loadWith({ active: 'a', profiles: { a: { name: 'sam', records: [
    { mode: '<img src=x onerror=alert(1)>', time: 1 },
    { mode: 'zen', solves: '<b>9</b>', time: 300 },
    { mode: 'sprint', time: 30, segments: { cross: 4, f2l: '<i>' } },
    'junk',
  ] } } });
  const recs = profiles.active().records;
  assert.deepEqual(recs.map((r) => r.mode), ['zen', 'sprint']);
  assert.equal(recs[0].solves, undefined);
  assert.deepEqual(recs[1].segments, { cross: 4 });
});

test('names and settings of the wrong type fall back to defaults', async () => {
  const profiles = await loadWith({ active: 'a', profiles: { a: { name: { x: 1 }, settings: 'loud' } } });
  assert.equal(profiles.active().name, 'player');
  assert.equal(profiles.active().settings.theme, 'soft');
  assert.deepEqual(profiles.active().records, []);
});

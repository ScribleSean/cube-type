import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS } from '../src/profiles.js';

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
    { mode: 'sprint', time: 30, wpm: 50, acc: 1, finesse: 1, faults: 0, turns: 20, segments: { cross: 4, f2l: '<i>' } },
    'junk',
  ] } } });
  const recs = profiles.active().records;
  assert.deepEqual(recs.map((r) => r.mode), ['sprint']);
  assert.deepEqual(recs[0].segments, { cross: 4 });
});

test('names and settings of the wrong type fall back to defaults', async () => {
  const profiles = await loadWith({ active: 'a', profiles: { a: { name: { x: 1 }, settings: 'loud' } } });
  assert.equal(profiles.active().name, 'player');
  assert.equal(profiles.active().settings.theme, 'soft');
  assert.deepEqual(profiles.active().records, []);
});

test('crafted non-string active profile falls back safely', async () => {
  const p = await loadWith({ active: { toString: null }, profiles: { a: { name: 'sam' } } });
  assert.equal(p.active().id, 'a');
});

test('every stored setting is validated and inherited drill sets are rejected', async () => {
  const { createDrill } = await import('../src/drill.js');
  const settings = Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map((k) => [k, '__proto__']));
  const p = await loadWith({ active: 'a', profiles: { a: { settings: { ...settings, unexpected: true } } } });
  assert.deepEqual(p.active().settings, DEFAULT_SETTINGS);
  assert.doesNotThrow(() => createDrill('__proto__'));
});

test('incomplete and out-of-range records are discarded per mode', async () => {
  const sprint = { mode: 'sprint', time: 30, wpm: 50, acc: 1, finesse: 1, faults: 0, turns: 20 };
  const zen = { mode: 'zen', time: 30, solves: 1, wpm: 50, acc: 1, finesse: 1, turns: 20 };
  const drill = { mode: 'drill', time: 30, done: 10, rate: 20, streak: 10, misses: 0, wpm: 50, acc: 1 };
  const bad = [{ mode: 'sprint' }, { ...zen, solves: undefined }];
  for (const record of [sprint, zen, drill]) {
    for (const key of Object.keys(record).filter((k) => k !== 'mode')) {
      bad.push({ ...record, [key]: -1 }, { ...record, [key]: undefined }, { ...record, [key]: Infinity });
    }
    bad.push({ ...record, acc: 1.1 });
  }
  bad.push({ ...sprint, finesse: 1.1 }, { ...zen, solves: 1.5 }, { ...drill, done: 0.5 });
  const p = await loadWith({ active: 'a', profiles: { a: { records: [...bad, sprint, zen, drill] } } });
  assert.deepEqual(p.active().records, [sprint, zen, drill]);
});

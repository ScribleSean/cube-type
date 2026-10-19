import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDrill, DRILL_SETS } from '../src/drill.js';

test('drill never repeats or undoes the previous move', () => {
  const d = createDrill('all');
  let prev = d.current;
  for (let i = 0; i < 500; i++) {
    const next = d.hit();
    assert.notEqual(next, prev);
    assert.notEqual(next, prev.endsWith("'") ? prev.slice(0, -1) : prev + "'");
    prev = next;
  }
});

test('the faces set only asks for face turns', () => {
  const d = createDrill('faces');
  for (let i = 0; i < 100; i++) assert.ok(DRILL_SETS.faces.includes(d.hit()));
});

test('streaks reset on a miss and the best is kept', () => {
  const d = createDrill();
  d.hit(); d.hit(); d.hit(); d.miss(); d.hit();
  assert.equal(d.streak, 1);
  assert.equal(d.bestStreak, 3);
  assert.equal(d.done, 4);
  assert.equal(d.misses, 1);
});

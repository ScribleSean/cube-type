import { test } from 'node:test';
import assert from 'node:assert/strict';
import { averageOf, summarize } from '../src/stats.js';

test('averageOf drops the best and worst', () => {
  assert.equal(averageOf([10, 20, 30, 40, 50], 5), 30);
  assert.equal(averageOf([1, 2, 3], 5), null);
  assert.equal(averageOf([99, 10, 12, 11, 13, 1], 5), 11, 'uses only the last five');
});

test('summarize splits records by mode', () => {
  const recs = [
    { mode: 'sprint', time: 40, wpm: 50, finesse: 0.9, segments: { cross: 5, f2l: 20, oll: 8, pll: 7 } },
    { mode: 'sprint', time: 30, wpm: 60, finesse: 1, segments: { cross: 4, f2l: 15, oll: 6, pll: 5 } },
    { mode: 'zen', time: 300, solves: 4 },
    { mode: 'drill', time: 60, rate: 42, streak: 17 },
  ];
  const s = summarize(recs);
  assert.equal(s.sprint.count, 2);
  assert.equal(s.sprint.best, 30);
  assert.equal(s.sprint.bestWpm, 60);
  assert.equal(s.sprint.splits.cross, 4.5);
  assert.equal(s.zen.bestSolves, 4);
  assert.equal(s.drill.bestRate, 42);
  assert.equal(s.drill.bestStreak, 17);
  assert.equal(s.recent[0].mode, 'drill');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFinesse } from '../src/finesse.js';

const run = (moves) => { const f = createFinesse(); moves.forEach((m) => f.turn(m)); return f; };

test('efficient sequences have no waste', () => {
  assert.equal(run(['R', 'U', "R'", "U'"]).waste, 0);
  assert.equal(run(['R', 'R']).waste, 0, 'a double typed as two words is fine');
  assert.equal(run(['R', 'L']).waste, 0);
});

test('cancelled, tripled and commuting turns are waste', () => {
  assert.equal(run(['R', "R'"]).waste, 2);
  assert.equal(run(['R', 'R', 'R']).waste, 2, "three R should be one R'");
  assert.equal(run(['R', 'L', "R'"]).waste, 2, "R and L commute, so R L R' is just L");
  assert.equal(run(['R', 'R', 'R', 'R']).waste, 4);
});

test('a move on another axis starts a new group', () => {
  assert.equal(run(['R', 'U', "R'"]).waste, 0);
});

test('score is the share of turns that were not wasted', () => {
  const f = run(['R', "R'", 'U', 'F']);
  assert.equal(f.turns, 4);
  assert.equal(f.score, 0.5);
  assert.equal(f.faults, 1);
});

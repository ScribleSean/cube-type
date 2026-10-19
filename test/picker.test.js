import { test } from 'node:test';
import assert from 'node:assert/strict';
import { features, score, pick, makeContext } from '../src/picker.js';

test('hand alternation and same-finger pairs are measured', () => {
  assert.equal(features('pane').flow, 1, 'every pair switches hands');
  assert.equal(features('were').flow, 0, 'all left hand');
  assert.ok(features('fun').noSfb < 1, 'u-n is the same finger');
});

test('smoother words score higher', () => {
  assert.ok(score('pane', {}) > score('were', {}));
});

test('pick never repeats one of the last two words when it can avoid it', () => {
  const ctx = makeContext();
  ctx.push('rush'); ctx.push('ride');
  for (let i = 0; i < 50; i++) assert.ok(!['rush', 'ride'].includes(pick(['rush', 'ride', 'roll'], ctx)));
});

test('pick respects exclusions', () => {
  assert.equal(pick(['a', 'b'], { exclude: (w) => w === 'a' }), 'b');
});

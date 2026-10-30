import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORDS, BOARD_MOVES } from '../src/words.js';

test('every word starts with its move letter and belongs to one move', () => {
  const owner = new Map();
  for (const [move, tiers] of Object.entries(WORDS)) {
    assert.equal(tiers.length, 3, `${move} has calm, building and intense pools`);
    for (const w of tiers.flat()) {
      assert.equal(w[0], move[0].toLowerCase(), `${move}: ${w}`);
      assert.ok(!owner.has(w), `${w} is in both ${owner.get(w)} and ${move}`);
      owner.set(w, move);
    }
  }
  for (const m of BOARD_MOVES) assert.ok(WORDS[m], `board move ${m} has words`);
});

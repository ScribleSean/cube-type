import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordsForMoves, REPEAT } from '../src/ui/stream.js';
import { WORDS } from '../src/words.js';
import { makeContext } from '../src/picker.js';

const run = (moves, calm = false) => wordsForMoves(moves, { calm, ctx: makeContext() });
const times = (n, fn) => { for (let i = 0; i < n; i++) fn(); };

test('a repeated move becomes REPEAT once, never twice in a row', () => {
  const out = run(['R', 'R']);
  assert.equal(out.length, 2);
  assert.ok(WORDS.R[1].concat(WORDS.R[2]).includes(out[0]));
  assert.equal(out[1], REPEAT);

  const three = run(['R', 'R', 'R']);
  assert.equal(three[1], REPEAT);
  assert.notEqual(three[2], REPEAT, 'the third turn gets a word again');
  assert.notEqual(three[2], three[0]);
});

test('different moves and non-adjacent repeats are not collapsed', () => {
  times(20, () => assert.ok(!run(['R', 'U', 'R', 'U']).includes(REPEAT)));
});

test('calm draws only from pool 0, otherwise from pools 1 and 2', () => {
  const moves = ['R', "U'", 'L', 'F', "B'", 'D'];
  times(50, () => {
    run(moves, true).forEach((w, i) => assert.ok(WORDS[moves[i]][0].includes(w), `${w} is calm for ${moves[i]}`));
    run(moves, false).forEach((w, i) => {
      assert.ok([...WORDS[moves[i]][1], ...WORDS[moves[i]][2]].includes(w), `${w} is not calm for ${moves[i]}`);
      assert.ok(!WORDS[moves[i]][0].includes(w));
    });
  });
});

test('no word is used twice in one call', () => {
  const moves = ['R', 'U', 'R', 'U', 'R', 'U', 'R', 'U', 'L', 'D', 'L', 'D'];
  times(100, () => {
    for (const calm of [true, false]) {
      const out = run(moves, calm);
      assert.equal(new Set(out).size, out.length, out.join(' '));
    }
  });
});

test('the last two words in the context are avoided', () => {
  const ctx = makeContext();
  const calmR = WORDS.R[0];
  ctx.push(calmR[0]); ctx.push(calmR[1]);
  times(50, () => assert.ok(!calmR.slice(0, 2).includes(wordsForMoves(['R'], { calm: true, ctx })[0])));
});

test('lowercase and alternate tokens resolve through WORDS', () => {
  times(20, () => {
    const [u, uPrime, r, rPrime, m, x] = run(['u', "u'", 'r', "r'", 'M', 'x']);
    assert.ok([...WORDS.U[1], ...WORDS.U[2]].includes(u), 'u falls back to U');
    assert.ok([...WORDS["U'"][1], ...WORDS["U'"][2]].includes(uPrime), "u' falls back to U'");
    assert.ok([...WORDS.r[1], ...WORDS.r[2]].includes(r), 'r has its own words');
    assert.ok([...WORDS["r'"][1], ...WORDS["r'"][2]].includes(rPrime));
    assert.ok([...WORDS.M[1], ...WORDS.M[2]].includes(m));
    assert.ok([...WORDS.x[1], ...WORDS.x[2]].includes(x));
  });
  assert.deepEqual(run(['u', 'u']).slice(1), [REPEAT]);
});

test('the caller context is not changed', () => {
  const ctx = makeContext();
  ctx.push('rush');
  wordsForMoves(['R', 'U'], { calm: false, ctx });
  assert.deepEqual(ctx.recent, ['rush']);
});

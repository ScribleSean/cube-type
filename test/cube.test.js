import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/cube.js';

const ALL_ALGS = [...C.OLL_EDGES, ...C.OLL_CORNERS, ...C.PLL];

test('every move undoes itself after four quarter turns and with its inverse', () => {
  for (const t of ['R', 'U', 'F', 'M', 'E', 'S', 'x', 'y', 'z', 'r', 'f']) {
    assert.ok(C.isSolved(C.applyAll(C.solved(), [t, t, t, t])), `${t} x4`);
    assert.ok(C.isSolved(C.applyAll(C.solved(), [t, t + "'"])), `${t} ${t}'`);
  }
  const st = C.solved();
  for (let i = 0; i < 6; i++) C.applyAll(st, C.split("R U R' U'"));
  assert.ok(C.isSolved(st), 'sexy move x6');
});

test('phase and progress', () => {
  assert.equal(C.phase(C.solved()), 'done');
  assert.equal(C.phase(C.applyAll(C.solved(), ['R'])), 'pll', 'one R turn leaves F2L on L');
  assert.deepEqual(C.progress(C.solved()), { edges: 4, pairs: 4 });
  assert.equal(C.progress(C.applyAll(C.solved(), C.split("R U R'"))).pairs, 3);
});

test('every algorithm keeps F2L, and every PLL keeps OLL', () => {
  for (const a of ALL_ALGS) {
    assert.ok(['oll', 'pll', 'done'].includes(C.phase(C.applyAll(C.solved(), C.split(a.alg)))), a.name);
  }
  for (const a of C.PLL) assert.ok(['pll', 'done'].includes(C.phase(C.applyAll(C.solved(), C.split(a.alg)))), a.name);
});

test('the last-layer planner solves random cases from any orientation and frame', () => {
  const gens = ALL_ALGS.map((a) => C.split(a.alg));
  const rots = ['x', "x'", 'y', "y'", 'z', "z'"];
  const used = new Set();
  for (let trial = 0; trial < 2000; trial++) {
    const st = C.solved();
    for (let i = 0; i < 4; i++) {
      C.applyAll(st, gens[Math.floor(Math.random() * gens.length)]);
      C.applyAll(st, [['U'], ['U2'], ["U'"], []][Math.floor(Math.random() * 4)]);
    }
    for (let i = 0; i < 3; i++) C.apply(st, rots[Math.floor(Math.random() * 6)]);
    const k = Math.floor(Math.random() * 4);
    for (let steps = 0; !C.isSolved(st); steps++) {
      assert.ok(steps < 6, `trial ${trial} did not finish`);
      const plan = C.planLLFor(st, k);
      assert.ok(plan, `no plan at trial ${trial}`);
      used.add(plan.name);
      for (const t of plan.moves) C.apply(st, C.toWorld(t, k));
    }
  }
  const unused = ALL_ALGS.map((a) => a.name).filter((n) => !used.has(n));
  assert.deepEqual(unused, [], 'every algorithm gets used');
});

test('player-frame moves equal turning the whole cube, moving, and turning back', () => {
  const moves = ['R', "R'", 'L', 'U', "U'", 'D', 'F', "F'", 'B', 'M', "M'", 'E', 'S', "S'", 'x', "x'", 'y', 'z', "z'", 'r', "f'"];
  for (let k = 0; k < 4; k++) {
    for (const m of moves) {
      const viaRotation = C.applyAll(C.solved(), [...Array(k).fill('y'), m, ...Array(k).fill("y'")]);
      const viaWorld = C.applyAll(C.solved(), [C.toWorld(m, k)]);
      const key = (st) => st.map((s) => s.p + s.n + s.c).sort().join();
      assert.equal(key(viaWorld), key(viaRotation), `${m} with k=${k} -> ${C.toWorld(m, k)}`);
      assert.equal(C.toPlayer(C.toWorld(m, k), k), m, `round trip ${m} k=${k}`);
    }
  }
});

test('a scramble is never solved', () => {
  assert.ok(!C.isSolved(C.applyAll(C.solved(), C.scramble())));
});

test('the dot case is planned as the line algorithm, then replanned', () => {
  const st = C.applyAll(C.solved(), C.split("F R U R' U' F' f R U R' U' f'"));
  const dot = C.planLLFor(st, 0);
  assert.equal(dot.name, 'dot');
  assert.deepEqual(dot.moves, C.split("F R U R' U' F'"));
  C.applyAll(st, dot.moves);
  assert.notEqual(C.planLLFor(st, 0).name, 'dot');
});

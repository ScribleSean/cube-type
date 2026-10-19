// Pure cube logic, no DOM.
// The cube is a list of stickers, each with a cubie position p (-1..1 per axis),
// an outward normal n, and a color c. A move rotates every selected sticker.
const FACES = { U: [0, 1, 0], D: [0, -1, 0], R: [1, 0, 0], L: [-1, 0, 0], F: [0, 0, 1], B: [0, 0, -1] };
const COLOR_OF = { U: 'W', D: 'Y', R: 'R', L: 'O', F: 'G', B: 'B' };
const DIRS = Object.values(FACES);

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const neg = (a) => [-a[0], -a[1], -a[2]];
const add = (...vs) => vs.reduce((s, v) => [s[0] + v[0], s[1] + v[1], s[2] + v[2]], [0, 0, 0]);

// Rotate v a quarter turn about unit axis d. s = 1 is clockwise looking at the face d points to.
function rot(v, d, s) {
  const c = cross(d, v), k = dot(d, v);
  return [d[0] * k - s * c[0], d[1] * k - s * c[1], d[2] * k - s * c[2]];
}

// Parse a token like R, R', R2, r, M, x' into an axis, a layer selector, a direction and a turn count.
function moveSpec(tok) {
  const m = /^([URFDLBurfdlbMESxyz])(2'|2|')?$/.exec(tok);
  if (!m) throw new Error('bad move ' + tok);
  const b = m[1], suf = m[2] || '';
  const turns = suf.startsWith('2') ? 2 : 1;
  const s = suf === "'" ? -1 : 1;
  let d, sel;
  if ('URFDLB'.includes(b)) { d = FACES[b]; sel = (p) => dot(p, d) === 1; }
  else if ('urfdlb'.includes(b)) { d = FACES[b.toUpperCase()]; sel = (p) => dot(p, d) >= 0; }
  else if (b === 'M') { d = FACES.L; sel = (p) => p[0] === 0; }
  else if (b === 'E') { d = FACES.D; sel = (p) => p[1] === 0; }
  else if (b === 'S') { d = FACES.F; sel = (p) => p[2] === 0; }
  else { d = { x: FACES.R, y: FACES.U, z: FACES.F }[b]; sel = () => true; }
  return { d, sel, s, turns };
}

function solved() {
  const st = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    for (const f in FACES) if (dot([x, y, z], FACES[f]) === 1) st.push({ p: [x, y, z], n: FACES[f].slice(), c: COLOR_OF[f] });
  }
  return st;
}

const clone = (st) => st.map((s) => ({ p: s.p.slice(), n: s.n.slice(), c: s.c }));

function apply(st, tok) {
  const { d, sel, s, turns } = moveSpec(tok);
  for (const k of st) {
    if (!sel(k.p)) continue;
    for (let t = 0; t < turns; t++) { k.p = rot(k.p, d, s); k.n = rot(k.n, d, s); }
  }
  return st;
}
const applyAll = (st, toks) => { for (const t of toks) apply(st, t); return st; };
const split = (alg) => alg.trim().split(/\s+/).filter(Boolean);

// Lookup helper: color at (position, normal).
function index(st) {
  const m = new Map();
  for (const k of st) m.set(k.p.join() + '|' + k.n.join(), k.c);
  return (p, n) => m.get(p.join() + '|' + n.join());
}
const perps = (n) => DIRS.filter((d) => dot(d, n) === 0);
const center = (at, n) => at(n, n);

function faceUniform(at, n) {
  const c = center(at, n);
  for (const a of perps(n)) for (const b of [[0, 0, 0], ...perps(n)]) {
    if (dot(a, b) !== 0) continue;
    if (at(add(n, a, b), n) !== c) return false;
  }
  return true;
}
function crossOn(at, n) {
  for (const a of perps(n)) {
    const p = add(n, a);
    if (at(p, n) !== center(at, n) || at(p, a) !== center(at, a)) return false;
  }
  return true;
}
function f2lOn(at, n) {
  if (!crossOn(at, n)) return false;
  const ps = perps(n);
  for (const a of ps) for (const b of ps) {
    if (dot(a, b) !== 0) continue;
    const corner = add(n, a, b), edge = add(a, b);
    if (at(corner, n) !== center(at, n) || at(corner, a) !== center(at, a) || at(corner, b) !== center(at, b)) return false;
    if (at(edge, a) !== center(at, a) || at(edge, b) !== center(at, b)) return false;
  }
  return true;
}
const isSolved = (st) => { const at = index(st); return DIRS.every((n) => faceUniform(at, n)); };

// cross -> f2l -> oll -> pll -> done
function phase(st) {
  const at = index(st);
  if (DIRS.every((n) => faceUniform(at, n))) return 'done';
  for (const n of DIRS) if (f2lOn(at, n)) return faceUniform(at, neg(n)) ? 'pll' : 'oll';
  for (const n of DIRS) if (crossOn(at, n)) return 'f2l';
  return 'cross';
}

// Progress inside a stage: best cross (edges 0-4) and, on a face with a full cross, solved F2L pairs (0-4).
function progress(st) {
  const at = index(st);
  let edges = 0, pairs = 0;
  for (const n of DIRS) {
    const c = center(at, n);
    const e = perps(n).filter((a) => { const p = add(n, a); return at(p, n) === c && at(p, a) === center(at, a); }).length;
    edges = Math.max(edges, e);
    if (e < 4) continue;
    let k = 0;
    const ps = perps(n);
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], b = ps[j];
      if (dot(a, b) !== 0) continue;
      const corner = add(n, a, b), edge = add(a, b);
      if (at(corner, n) === c && at(corner, a) === center(at, a) && at(corner, b) === center(at, b) &&
          at(edge, a) === center(at, a) && at(edge, b) === center(at, b)) k++;
    }
    pairs = Math.max(pairs, k);
  }
  return { edges, pairs };
}

// Last-layer algorithms, written with the last layer on U.
const OLL_EDGES = [
  { name: 'line', alg: "F R U R' U' F'" },
  { name: 'angle', alg: "F U R U' R' F'" },
];
const OLL_CORNERS = [
  { name: 'sune', alg: "R U R' U R U2 R'" },
  { name: 'antisune', alg: "R U2 R' U' R U' R'" },
  { name: 'h', alg: "R U R' U R U' R' U R U2 R'" },
  { name: 'pi', alg: "R U2 R2 U' R2 U' R2 U2 R" },
  { name: 'headlights', alg: "R2 D R' U2 R D' R' U2 R'" },
  { name: 't', alg: "r U R' U' r' F R F'" },
  { name: 'bowtie', alg: "F' r U R' U' r' F R" },
];
const PLL = [
  { name: 'aaperm', alg: "x R' U R' D2 R U' R' D2 R2 x'" },
  { name: 'abperm', alg: "x R2 D2 R U R' D2 R U' R x'" },
  { name: 'eperm', alg: "x' R U' R' D R U R' D' R U R' D R U' R' D' x" },
  { name: 'fperm', alg: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R" },
  { name: 'gaperm', alg: "R2 U R' U R' U' R U' R2 U' D R' U R D'" },
  { name: 'gbperm', alg: "R' U' R U D' R2 U R' U R U' R U' R2 D" },
  { name: 'gcperm', alg: "R2 U' R U' R U R' U R2 U D' R U' R' D" },
  { name: 'gdperm', alg: "R U R' U' D R2 U' R U' R' U R' U R2 D'" },
  { name: 'hperm', alg: "M2 U M2 U2 M2 U M2" },
  { name: 'japerm', alg: "L' U' L F L' U' L U L F' L2 U L" },
  { name: 'jbperm', alg: "R U R' F' R U R' U' R' F R2 U' R'" },
  { name: 'naperm', alg: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'" },
  { name: 'nbperm', alg: "R' U R U' R' F' U' F R U R' F R' F' R U' R" },
  { name: 'raperm', alg: "R U' R' U' R U R D R' U' R D' R' U2 R'" },
  { name: 'rbperm', alg: "R2 F R U R U' R' F' R U2 R' U2 R" },
  { name: 'tperm', alg: "R U R' U' R' F R2 U' R' U' R U R' F'" },
  { name: 'uaperm', alg: "M2 U M U2 M' U M2" },
  { name: 'ubperm', alg: "M2 U' M U2 M' U' M2" },
  { name: 'vperm', alg: "R' U R' U' y R' F' R2 U' R' U R' F R F" },
  { name: 'yperm', alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'" },
  { name: 'zperm', alg: "M' U M2 U M2 U M' U2 M2" },
];

const AUF = [[], ['U'], ['U', 'U'], ["U'"]];
// Doubles become two single turns, so every token is one word in the game.
const singles = (toks) => toks.flatMap((t) => (t.length > 1 && t[1] === '2' ? [t[0], t[0]] : [t]));

function edgesOriented(at) {
  const u = FACES.U;
  return perps(u).every((a) => at(add(u, a), u) === center(at, u));
}

// Plan the next last-layer step. Returns { step, name, moves } with single-turn tokens, or null.
function planLL(st) {
  const at0 = index(st);
  const base = DIRS.find((n) => f2lOn(at0, n));
  if (!base) return null;
  const ll = neg(base).join();
  // Rotate the whole cube so the last layer faces up.
  const pre = { '0,1,0': [], '0,-1,0': ['x', 'x'], '0,0,1': ['x'], '0,0,-1': ["x'"], '1,0,0': ["z'"], '-1,0,0': ['z'] }[ll];
  const s0 = applyAll(clone(st), pre);
  const at = index(s0);
  let step, set, goal;
  if (!edgesOriented(at)) { step = 'oll'; set = OLL_EDGES; goal = (s) => edgesOriented(index(s)); }
  else if (!faceUniform(at, FACES.U)) { step = 'oll'; set = OLL_CORNERS; goal = (s) => faceUniform(index(s), FACES.U); }
  else { step = 'pll'; set = [{ name: 'auf', alg: '' }, ...PLL]; goal = isSolved; }

  let best = null;
  for (const a of set) {
    const toks = singles(split(a.alg));
    for (const k of AUF) for (const m of step === 'pll' ? AUF : [[]]) {
      const moves = [...k, ...toks, ...m];
      if (best && moves.length >= best.moves.length) continue;
      if (goal(applyAll(clone(s0), moves))) best = { name: a.name, moves };
    }
  }
  // Dot case: no single edge alg finishes, so do the line alg once and replan.
  if (!best && set === OLL_EDGES) best = { name: 'dot', moves: singles(split(OLL_EDGES[0].alg)) };
  if (!best) return null;
  return { step, name: best.name, moves: [...pre, ...best.moves] };
}

// Player frame. The camera can show the cube from any side, so the face on the player's
// left is "F" and the face on their right is "R". That frame is the world turned by k
// quarter turns about the vertical axis (k = 0 when world F is on the left).
const Y_CYCLE = ['F', 'R', 'B', 'L'];
const SLICE_LIKE = { L: 'M', R: "M'", F: 'S', B: "S'" };   // slice that turns like this face
const ROTATION_LIKE = { R: 'x', L: "x'", F: 'z', B: "z'" }; // whole-cube turn like this face
const spinFace = (f, k) => Y_CYCLE[(Y_CYCLE.indexOf(f) + k) % 4];

// Translate a move from the player's frame (turned by k) into world coordinates.
function toWorld(tok, k) {
  k = ((k % 4) + 4) % 4;
  if (!k) return tok;
  const m = /^([URFDLBurfdlbMESxyz])(2'|2|')?$/.exec(tok);
  const base = m[1], suffix = m[2] || '';
  let out;
  if (Y_CYCLE.includes(base.toUpperCase())) {
    const f = spinFace(base.toUpperCase(), k);
    out = base === base.toUpperCase() ? f : f.toLowerCase();
  } else if (base === 'M') out = SLICE_LIKE[spinFace('L', k)];
  else if (base === 'S') out = SLICE_LIKE[spinFace('F', k)];
  else if (base === 'x') out = ROTATION_LIKE[spinFace('R', k)];
  else if (base === 'z') out = ROTATION_LIKE[spinFace('F', k)];
  else out = base; // U, D, E, y, u, d keep their meaning
  const flipped = out.endsWith("'");
  const core = flipped ? out.slice(0, -1) : out;
  if (suffix.startsWith('2')) return core + '2';
  return core + ((suffix === "'") !== flipped ? "'" : '');
}
// Plan the next last-layer step in the player's frame. Returned moves are player moves.
const planLLFor = (st, k) => planLL(applyAll(clone(st), Array(((k % 4) + 4) % 4).fill('y')));
const toPlayer = (tok, k) => toWorld(tok, 4 - (((k % 4) + 4) % 4));
// k for a player whose left-hand side face is `leftFace` (one of F R B L).
const frameFor = (leftFace) => Y_CYCLE.indexOf(leftFace);

// Random-state-ish scramble: 20 face turns, no two in a row on the same axis.
function scramble(len = 20, rnd = Math.random) {
  const axis = { U: 0, D: 0, R: 1, L: 1, F: 2, B: 2 };
  const out = [];
  let last = -1;
  while (out.length < len) {
    const f = 'URFDLB'[Math.floor(rnd() * 6)];
    if (axis[f] === last) continue;
    last = axis[f];
    out.push(f + ['', "'", '2'][Math.floor(rnd() * 3)]);
  }
  return out;
}

export { toWorld, toPlayer, frameFor, planLLFor, FACES, COLOR_OF, moveSpec, solved, clone, apply, applyAll, split, singles, isSolved, phase, progress, planLL, scramble, OLL_EDGES, OLL_CORNERS, PLL };

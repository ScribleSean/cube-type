export const WEIGHTS = { flow: 0.55, noSfb: 0.20, balance: 0.10, ease: 0.075, novelty: 0.075 };
export const TEMPERATURE = 0.08;

const FINGER = {};
[['qaz', 0], ['wsx', 1], ['edc', 2], ['rfvtgb', 3], ['yhnujm', 4], ['ik', 5], ['ol', 6], ['p', 7]]
  .forEach(([keys, f]) => { for (const k of keys) FINGER[k] = f; });
const hand = (ch) => (FINGER[ch] < 4 ? 'L' : 'R');

export function features(w, ctx = {}) {
  const pairs = [];
  for (let i = 1; i < w.length; i++) pairs.push([w[i - 1], w[i]]);
  const n = Math.max(pairs.length, 1);
  const flow = pairs.filter(([a, b]) => hand(a) !== hand(b)).length / n;
  const sfb = pairs.filter(([a, b]) => a !== b && FINGER[a] === FINGER[b]).length / n;

  const left = [...w].filter((c) => hand(c) === 'L').length / w.length;
  const recentLeft = ctx.leftShare === undefined ? 0.5 : ctx.leftShare;
  const want = 1 - recentLeft;
  const balance = 1 - Math.abs(left - want);

  const ease = Math.max(0, Math.min(1, (9 - w.length) / 5));

  const recent = ctx.recent || [];
  const idx = recent.lastIndexOf(w);
  const recency = idx < 0 ? 0 : Math.max(0, 1 - (recent.length - 1 - idx) / 12);
  const shown = (ctx.visible || []).join('');
  const overlap = shown ? [...new Set(w)].filter((c) => shown.includes(c)).length / new Set(w).size : 0;
  const novelty = Math.max(0, 1 - recency - 0.3 * overlap);

  return { flow, noSfb: 1 - sfb, balance, ease, novelty };
}

export function score(w, ctx) {
  const f = features(w, ctx);
  let s = 0;
  for (const k in WEIGHTS) s += WEIGHTS[k] * f[k];
  return s;
}

export function pick(pool, ctx = {}, rnd = Math.random) {
  const recent = ctx.recent || [];
  const last2 = recent.slice(-2);
  let cands = pool.filter((w) => !last2.includes(w) && !(ctx.exclude && ctx.exclude(w)));
  if (!cands.length) cands = pool.filter((w) => !(ctx.exclude && ctx.exclude(w)));
  if (!cands.length) return null;
  const scores = cands.map((w) => score(w, ctx));
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp((s - max) / TEMPERATURE));
  const total = exps.reduce((a, b) => a + b, 0);
  let r = rnd() * total;
  for (let i = 0; i < cands.length; i++) { r -= exps[i]; if (r <= 0) return cands[i]; }
  return cands[cands.length - 1];
}

export function makeContext() {
  const keys = [];
  const ctx = {
    recent: [],
    get leftShare() { return keys.length ? keys.filter((h) => h === 'L').length / keys.length : 0.5; },
    push(word) {
      ctx.recent.push(word);
      if (ctx.recent.length > 40) ctx.recent.shift();
      for (const c of word) { if (FINGER[c] !== undefined) keys.push(hand(c)); }
      while (keys.length > 60) keys.shift();
    },
  };
  return ctx;
}

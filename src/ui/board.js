// The word board: one chip per move, placed around the cube, filled by the word picker.
import { WORDS, BOARD_MOVES } from '../words.js';
import { pick } from '../picker.js';

const isAlt = (m) => /^[MESxyz]/.test(m);
const LIKE = { M: 'L', E: 'D', S: 'F', x: 'R', y: 'U', z: 'F' };
// Eight cells around the cube, counter-clockwise from the right, matching screen angles.
const CELLS = ['r', 'tr', 't', 'tl', 'l', 'bl', 'b', 'br'];

export function createBoard({ arena, slices, rotations }) {
  const chips = {};
  let words = {};

  function makeChip(move) {
    const el = document.createElement('div');
    el.className = 'chip' + (isAlt(move) ? ' alt' : '');
    el.innerHTML = `<span class="nota">${move}</span><span class="w"><span class="typed"></span><span class="rest"></span></span>`;
    chips[move] = el;
    return el;
  }
  // Slices and rotations get their own panels, each pair captioned with the face it turns like.
  for (const [panel, bases] of [[slices, ['M', 'E', 'S']], [rotations, ['x', 'y', 'z']]]) {
    for (const b of bases) {
      const pair = document.createElement('div');
      pair.className = 'pair';
      pair.innerHTML = `<div class="pcap">${b} <span>· like ${LIKE[b]}</span></div><div class="chips"></div>`;
      pair.lastChild.append(makeChip(b), makeChip(b + "'"));
      panel.appendChild(pair);
    }
  }
  for (const f of 'RLUDFB') { makeChip(f); makeChip(f + "'"); }

  return {
    get words() { return words; },

    // Put each face's chips in the cell its face points toward on screen.
    // `directions` comes from the scene; `worldFace` maps a player face to the world face it shows.
    layout(directions, worldFace) {
      const byWorld = Object.fromEntries(directions.map((d) => [d.face, d]));
      const faces = 'RLUDFB'.split('').map((f) => ({ f, ...byWorld[worldFace(f)] })).sort((a, b) => b.mag - a.mag);
      const taken = new Set();
      arena.querySelectorAll('.slot').forEach((s) => s.classList.remove('behind'));
      for (const fc of faces) {
        const want = ((Math.round(fc.angle / (Math.PI / 4)) % 8) + 8) % 8;
        const idx = [0, 1, -1, 2, -2, 3, -3, 4].map((k) => (want + k + 8) % 8).find((c) => !taken.has(c));
        taken.add(idx);
        const slot = arena.querySelector(`.slot[data-cell="${CELLS[idx]}"]`);
        slot.append(chips[fc.f], chips[fc.f + "'"]);
        slot.classList.toggle('behind', !fc.visible);
      }
    },

    // Choose a word for every move. `keep` holds the word just typed so it can be typed
    // again for a double. `levelUp` plays the flip animation.
    assign({ tier, keep, ctx, levelUp }) {
      const next = {}, used = [];
      const clash = (w) => used.some((u) => u.startsWith(w) || w.startsWith(u));
      if (keep && words[keep]) { next[keep] = words[keep]; used.push(words[keep]); }
      for (const m of BOARD_MOVES) {
        if (next[m]) continue;
        const opts = { recent: ctx.recent, leftShare: ctx.leftShare, visible: used, exclude: clash };
        const w = pick(WORDS[m][tier], opts) || pick(WORDS[m].flat(), opts) || WORDS[m][tier][0];
        next[m] = w;
        used.push(w);
      }
      const old = words;
      words = next;
      BOARD_MOVES.forEach((m, i) => {
        if (old[m] === words[m]) return;
        const w = chips[m].querySelector('.w');
        w.classList.remove('fresh', 'flip');
        void w.offsetWidth; // restart the animation
        w.style.animationDelay = levelUp ? i * 14 + 'ms' : '0ms';
        w.classList.add(levelUp ? 'flip' : 'fresh');
      });
    },

    // Moves whose word starts with `prefix` (optionally only `only`).
    matches(prefix, only) {
      return BOARD_MOVES.filter((m) => words[m] && words[m].startsWith(prefix) && (!only || m === only));
    },

    draw({ buffer, target }) {
      for (const m of BOARD_MOVES) {
        const el = chips[m], w = words[m] || '';
        const hit = buffer && w.startsWith(buffer) && (!target || m === target);
        el.classList.toggle('dim', !!buffer && !hit && !target);
        el.classList.toggle('match', !!hit);
        el.classList.toggle('target', m === target);
        el.querySelector('.typed').textContent = hit ? buffer : '';
        el.querySelector('.rest').textContent = hit ? w.slice(buffer.length) : w;
      }
    },

    fire(move) {
      const el = chips[move];
      el.classList.add('fire');
      setTimeout(() => el.classList.remove('fire'), 90);
    },
  };
}

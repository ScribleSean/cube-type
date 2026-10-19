// The word stream: a last-layer algorithm shown as a Monkeytype line of words.
import { WORDS } from '../words.js';
import { pick } from '../picker.js';

const isAlt = (m) => /^[MESxyz]/.test(m);

// The second half of a double: press enter instead of typing the word again.
export const REPEAT = '⏎';

// One word per move, and no word twice in the same algorithm. The second turn of a
// double (two identical moves in a row) is REPEAT.
export function wordsForMoves(moves, { calm, ctx }) {
  const used = new Set(), recent = [...ctx.recent], out = [];
  moves.forEach((tok, i) => {
    if (i && moves[i - 1] === tok && out[i - 1] !== REPEAT) { out.push(REPEAT); return; }
    const src = WORDS[tok] || WORDS[tok.toUpperCase()];
    const pool = calm ? src[0] : [...src[1], ...src[2]];
    const w = pick(pool, { recent, leftShare: ctx.leftShare, exclude: (x) => used.has(x) }) || pick(pool, { recent });
    used.add(w);
    recent.push(w);
    out.push(w);
  });
  return out;
}

export function createStream({ root, caseLabel, line, caret }) {
  let caretTimer = null;
  return {
    // `good` = how many typed letters are right. The rest show in red in place, and letters
    // past the end of the word are added after it, also in red.
    draw(stream, buffer, good = buffer.length) {
      root.hidden = !stream;
      document.body.classList.toggle('streaming', !!stream);
      if (!stream) return;
      const { plan } = stream;
      const label = plan.name === 'dot' ? 'dot · line first' : plan.name;
      caseLabel.innerHTML = stream.naming ? `${plan.step} · name the case` : `${plan.step} · <b>${label}</b>`;
      line.querySelectorAll('.sw').forEach((n) => n.remove());

      const items = stream.naming
        ? [{ w: plan.name, nota: '?', state: 'cur', hidden: true }]
        : stream.words.map((w, i) => ({ w, nota: stream.notation[i], state: i < stream.i ? 'done' : i === stream.i ? 'cur' : 'next' }));
      let caretAt = null;
      for (const it of items) {
        const el = document.createElement('span');
        el.className = 'sw' + (it.state === 'done' ? ' done' : '') + (it.w === REPEAT ? ' repeat' : '');
        const nota = document.createElement('span');
        nota.className = 'nota' + (isAlt(it.nota) ? ' alt' : '');
        nota.textContent = it.nota;
        const word = document.createElement('span');
        const cur = it.state === 'cur';
        const length = cur ? Math.max(it.w.length, buffer.length) : it.w.length;
        for (let j = 0; j < length; j++) {
          const l = document.createElement('span');
          const typed = cur && j < buffer.length;
          const bad = typed && j >= good;
          l.className = 'l' + (typed && !bad ? ' ok' : '') + (bad ? ' bad' : '') + (j >= it.w.length ? ' extra' : '');
          l.textContent = bad ? buffer[j] : typed ? it.w[j] : it.hidden ? '_' : it.w[j];
          word.appendChild(l);
          if (cur && j === buffer.length) caretAt = { el: l, end: false };
        }
        if (cur && buffer.length >= length) caretAt = { el: word.lastChild, end: true };
        el.append(nota, word);
        line.appendChild(el);
      }
      if (caretAt) {
        const lr = line.getBoundingClientRect(), cr = caretAt.el.getBoundingClientRect();
        caret.style.left = (caretAt.end ? cr.right : cr.left) - lr.left - 1 + 'px';
        caret.style.top = cr.top - lr.top + 'px';
        caret.style.height = cr.height + 'px';
      }
      caret.classList.add('typing');
      clearTimeout(caretTimer);
      caretTimer = setTimeout(() => caret.classList.remove('typing'), 500);
    },
  };
}

// The word stream: a last-layer algorithm shown as a Monkeytype line of words.
import { WORDS } from '../words.js';
import { pick } from '../picker.js';

const isAlt = (m) => /^[MESxyz]/.test(m);

// One word per move. A double (two identical moves in a row) repeats its word on purpose;
// otherwise no word appears twice in the same algorithm.
export function wordsForMoves(moves, { calm, ctx }) {
  const used = new Set(), recent = [...ctx.recent], out = [];
  moves.forEach((tok, i) => {
    if (i && moves[i - 1] === tok) { out.push(out[i - 1]); return; }
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
    draw(stream, buffer) {
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
        el.className = 'sw' + (it.state === 'done' ? ' done' : '');
        const nota = document.createElement('span');
        nota.className = 'nota' + (isAlt(it.nota) ? ' alt' : '');
        nota.textContent = it.nota;
        const word = document.createElement('span');
        [...it.w].forEach((ch, j) => {
          const l = document.createElement('span');
          const typed = it.state === 'cur' && j < buffer.length;
          l.className = 'l' + (typed ? ' ok' : '');
          l.textContent = it.hidden && !typed ? '_' : ch;
          word.appendChild(l);
          if (it.state === 'cur' && j === buffer.length) caretAt = { el: l, end: false };
        });
        if (it.state === 'cur' && buffer.length >= it.w.length) caretAt = { el: word.lastChild, end: true };
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

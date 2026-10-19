// Top-of-screen readouts: timer, combo, wpm, finesse, stage bar, toasts.
const STAGES = ['cross', 'f2l', 'oll', 'pll'];
const fmt = (s) => s.toFixed(2);

export function createHud({ timer, label, combo, wpm, finesse, stages, toasts }) {
  const segs = {};
  for (const p of STAGES) {
    const el = document.createElement('div');
    el.className = 'seg';
    stages.appendChild(el);
    segs[p] = el;
  }

  return {
    // g: { time, showTimer, label, combo, wpm, finesse, reached, current, splits, progress, hideSplits }
    draw(g) {
      timer.hidden = !g.showTimer;
      timer.textContent = fmt(g.time);
      label.textContent = g.label || '';
      combo.textContent = g.combo >= 3 ? `x${g.combo}` : '';
      combo.classList.toggle('hot', g.combo >= 10);
      combo.style.fontSize = Math.min(1 + g.combo / 40, 1.6) + 'rem';
      wpm.textContent = g.wpm === null ? '' : `${Math.round(g.wpm)} wpm`;
      finesse.textContent = g.finesse === null ? '' : `${Math.round(g.finesse * 100)}% finesse`;

      STAGES.forEach((p, i) => {
        const el = segs[p];
        // A finished stage that is temporarily broken (say, the cross while inserting a pair).
        const broken = i < g.reached && g.current <= i && g.current !== 4;
        let right = '';
        if (broken) right = '!';
        else if (g.reached > i && g.splits[p] !== undefined) right = g.hideSplits ? '✓' : fmt(g.splits[p] - (i ? g.splits[STAGES[i - 1]] || 0 : 0));
        else if (p === 'cross' && g.reached === 0) right = `${g.progress.edges}/4`;
        else if (p === 'f2l' && g.reached === 1) right = `${g.progress.pairs}/4`;
        const html = `<span>${p}</span><b>${right}</b>`;
        if (el.innerHTML !== html) el.innerHTML = html;
        el.classList.toggle('done', g.reached > i);
        el.classList.toggle('now', g.reached === i);
        el.classList.toggle('broken', broken);
      });
    },
    bump(stage) {
      const el = segs[stage];
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    },
    flash(el) {
      el.classList.add('errflash');
      setTimeout(() => el.classList.remove('errflash'), 160);
    },
    toast(text, kind = '') {
      const t = document.createElement('div');
      t.className = 'toast' + (kind ? ' ' + kind : '');
      t.textContent = text;
      toasts.appendChild(t);
      setTimeout(() => t.remove(), 1700);
    },
  };
}

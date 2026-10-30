const STAGES = ['cross', 'f2l', 'oll', 'pll'];
const DONE = STAGES.length;
const fmt = (s) => s.toFixed(2);

export function createHud({ timer: timerEl, label: labelEl, combo: comboEl, wpm: wpmEl, finesse: finesseEl, stages, toasts }) {
  const segs = {};
  for (const p of STAGES) {
    const el = document.createElement('div');
    el.className = 'seg';
    stages.appendChild(el);
    segs[p] = el;
  }

  return {
    draw({ time, label, combo, wpm, finesse, reached, current, splits, progress }) {
      timerEl.textContent = fmt(time);
      labelEl.textContent = label || '';
      comboEl.textContent = combo >= 3 ? `x${combo}` : '';
      comboEl.classList.toggle('hot', combo >= 10);
      comboEl.style.fontSize = Math.min(1 + combo / 40, 1.6) + 'rem';
      wpmEl.textContent = wpm === null ? '' : `${Math.round(wpm)} wpm`;
      finesseEl.textContent = finesse === null ? '' : `${Math.round(finesse * 100)}% finesse`;

      STAGES.forEach((p, i) => {
        const el = segs[p];
        const broken = i < reached && current <= i && current !== DONE;
        let right = '';
        if (broken) right = '!';
        else if (reached > i && splits[p] !== undefined) right = fmt(splits[p] - (i ? splits[STAGES[i - 1]] || 0 : 0));
        else if (p === 'cross' && reached === 0) right = `${progress.edges}/4`;
        else if (p === 'f2l' && reached === 1) right = `${progress.pairs}/4`;
        const html = `<span>${p}</span><b>${right}</b>`;
        if (el.innerHTML !== html) el.innerHTML = html;
        el.classList.toggle('done', reached > i);
        el.classList.toggle('now', reached === i);
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

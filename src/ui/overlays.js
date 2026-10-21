// Full-screen overlays: the results screen after a run, and the stats screen.
import { summarize } from '../stats.js';

const fmt = (s) => (s == null ? '–' : s.toFixed(2));
const pct = (x) => (x == null ? '–' : Math.round(x * 100) + '%');
const stat = (k, v, small) => `<div class="stat${small ? ' sm' : ''}"><div class="k">${k}</div><div class="v">${v}</div></div>`;

export function createOverlays({ results, resultsBody, statsEl, statsBody, statsButton, getProfile, getAccent }) {
  function line(canvas, points, label, invert) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const g = canvas.getContext('2d');
    g.scale(dpr, dpr);
    const css = getComputedStyle(document.documentElement), token = (n) => css.getPropertyValue(n).trim();
    g.font = `11px ${token('--font-words')}`;
    g.fillStyle = token('--sub');
    if (points.length < 2) { g.fillText('not enough data yet', 0, h / 2); return; }
    const hi = Math.max(...points) * 1.1, lo = invert ? Math.min(...points) * 0.9 : 0;
    const y = (v) => h - 18 - ((v - lo) / (hi - lo || 1)) * (h - 28);
    g.strokeStyle = token('--bg-alt'); g.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const v = lo + ((hi - lo) * i) / 3;
      g.beginPath(); g.moveTo(34, y(v)); g.lineTo(w, y(v)); g.stroke();
      g.fillText(Math.round(v), 0, y(v) + 4);
    }
    g.strokeStyle = getAccent(); g.lineWidth = 2.5; g.lineJoin = 'round';
    g.beginPath();
    points.forEach((v, i) => { const x = 34 + (i / (points.length - 1)) * (w - 38); i ? g.lineTo(x, y(v)) : g.moveTo(x, y(v)); });
    g.stroke();
    g.fillStyle = token('--sub');
    g.fillText(label, 34, h - 2);
  }

  const api = {
    get resultsOpen() { return !results.hidden; },
    get statsOpen() { return !statsEl.hidden; },

    // run: { mode, time, wpm, acc, finesse, faults, turns, segments, solves, samples, first }
    showResults(run) {
      const s = summarize(getProfile().records);
      let head = '', body = '';
      if (run.mode === 'drill') {
        head = run.done && run.rate >= s.drill.bestRate ? 'drill · new best' : 'drill';
        body = `<div class="big">${stat('moves / min', Math.round(run.rate))}${stat('moves', run.done)}${stat('acc', pct(run.acc))}</div>
          <div class="row">${stat('best streak', run.streak, 1)}${stat('misses', run.misses, 1)}${stat('time', fmt(run.time), 1)}${stat('wpm', Math.round(run.wpm), 1)}</div>`;
      } else if (run.mode === 'zen') {
        head = run.solves && run.solves >= s.zen.bestSolves ? 'new best' : '';
        body = `<div class="big">${stat('time', fmt(run.time))}${stat('solves', run.solves)}</div>
          <div class="row">${stat('avg / solve', run.solves ? fmt(run.time / run.solves) : '–', 1)}${stat('wpm', Math.round(run.wpm), 1)}${stat('acc', pct(run.acc), 1)}${stat('finesse', pct(run.finesse), 1)}</div>`;
      } else {
        const seg = run.segments || {};
        if (run.time <= s.sprint.best) head = 'new pb';
        body = `<div class="big">${stat('time', fmt(run.time))}${stat('wpm', Math.round(run.wpm))}${stat('acc', pct(run.acc))}${stat('finesse', pct(run.finesse))}</div>
          <div class="row">${stat('cross', fmt(seg.cross), 1)}${stat('f2l', fmt(seg.f2l), 1)}${stat('oll', fmt(seg.oll), 1)}${stat('pll', fmt(seg.pll), 1)}${stat('turns', run.turns, 1)}${stat('faults', run.faults, 1)}</div>
          <div class="row">${stat('ao5', fmt(s.sprint.ao5), 1)}${stat('ao12', fmt(s.sprint.ao12), 1)}${stat('best', fmt(s.sprint.best), 1)}</div>`;
      }
      resultsBody.innerHTML = (head ? `<div class="pb">${head}</div>` : '') + body +
        '<canvas class="graph"></canvas><div class="again"><kbd>enter</kbd> or <kbd>tab</kbd> to go again · <kbd>esc</kbd> to close</div>';
      results.hidden = false;
      line(resultsBody.querySelector('.graph'), run.samples, 'wpm over time');
    },
    hideResults() { results.hidden = true; },

    toggleStats(open = statsEl.hidden) {
      statsEl.hidden = !open;
      statsButton.classList.toggle('on', open);
      if (!open) return;
      const p = getProfile(), s = summarize(p.records), sp = s.sprint;
      const recent = s.recent.map((r) => `<tr><td>${r.mode}</td><td>${r.mode === 'zen' ? `${r.solves} solves` : fmt(r.time)}</td><td>${Math.round(r.wpm || 0)}</td><td>${pct(r.acc)}</td><td>${pct(r.finesse)}</td><td>${new Date(r.at).toLocaleDateString()}</td></tr>`).join('');
      statsBody.innerHTML = `
        <div class="pb">stats · ${p.name.replace(/[<>&]/g, '')}</div>
        <div class="big">${stat('best', fmt(sp.best))}${stat('ao5', fmt(sp.ao5))}${stat('ao12', fmt(sp.ao12))}</div>
        <div class="row">${stat('solves', sp.count, 1)}${stat('mean', fmt(sp.mean), 1)}${stat('best wpm', sp.bestWpm == null ? '–' : Math.round(sp.bestWpm), 1)}${stat('finesse', pct(sp.finesse), 1)}</div>
        <div class="row">${stat('avg cross', fmt(sp.splits.cross), 1)}${stat('avg f2l', fmt(sp.splits.f2l), 1)}${stat('avg oll', fmt(sp.splits.oll), 1)}${stat('avg pll', fmt(sp.splits.pll), 1)}</div>
        <div class="row">${stat('zen best', s.zen.bestSolves ?? '–', 1)}${stat('zen solves', s.zen.totalSolves, 1)}${stat('drill best', s.drill.bestRate == null ? '–' : Math.round(s.drill.bestRate) + '/min', 1)}${stat('drill streak', s.drill.bestStreak ?? '–', 1)}</div>
        <canvas class="graph"></canvas>
        <div class="table-wrap"><table><thead><tr><th>mode</th><th>result</th><th>wpm</th><th>acc</th><th>finesse</th><th>date</th></tr></thead><tbody>${recent || '<tr><td colspan="6">no runs yet · finish a sprint to see stats here</td></tr>'}</tbody></table></div>
        <div class="again"><kbd>esc</kbd> to close</div>`;
      line(statsBody.querySelector('.graph'), sp.recentTimes, 'last 30 sprint times (s)', true);
    },
  };
  statsButton.addEventListener('click', () => api.toggleStats());
  return api;
}

// Stats from a profile's records. Pure functions.

// WCA-style average of the last n times: drop the best and worst, mean the rest.
export function averageOf(times, n) {
  if (times.length < n) return null;
  const last = times.slice(-n).sort((a, b) => a - b).slice(1, -1);
  return last.reduce((s, t) => s + t, 0) / last.length;
}

const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const max = (xs) => (xs.length ? Math.max(...xs) : null);
const min = (xs) => (xs.length ? Math.min(...xs) : null);

export function summarize(records) {
  const sprint = records.filter((r) => r.mode === 'sprint');
  const zen = records.filter((r) => r.mode === 'zen');
  const drill = records.filter((r) => r.mode === 'drill');
  const times = sprint.map((r) => r.time);
  const split = (name) => mean(sprint.map((r) => r.segments && r.segments[name]).filter((x) => x != null));
  return {
    sprint: {
      count: sprint.length,
      best: min(times),
      ao5: averageOf(times, 5),
      ao12: averageOf(times, 12),
      mean: mean(times),
      bestWpm: max(sprint.map((r) => r.wpm)),
      finesse: mean(sprint.map((r) => r.finesse)),
      splits: { cross: split('cross'), f2l: split('f2l'), oll: split('oll'), pll: split('pll') },
      recentTimes: times.slice(-30),
    },
    zen: { runs: zen.length, bestSolves: max(zen.map((r) => r.solves)), totalSolves: zen.reduce((s, r) => s + r.solves, 0) },
    drill: { runs: drill.length, bestRate: max(drill.map((r) => r.rate)), bestStreak: max(drill.map((r) => r.streak)) },
    recent: records.slice(-10).reverse(),
  };
}

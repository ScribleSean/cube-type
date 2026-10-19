// Drill: an endless loop of random moves. Pure logic, no DOM.
// Never repeats the previous move, and never asks for its inverse right after it
// (that would just undo the last turn).
const FACES = ['R', 'L', 'U', 'D', 'F', 'B'];
const SLICES = ['M', 'E', 'S'];
const ROTATIONS = ['x', 'y', 'z'];
const withPrimes = (bases) => bases.flatMap((b) => [b, b + "'"]);

export const DRILL_SETS = {
  faces: withPrimes(FACES),
  all: withPrimes([...FACES, ...SLICES, ...ROTATIONS]),
};
const inverse = (m) => (m.endsWith("'") ? m.slice(0, -1) : m + "'");

export function createDrill(set = 'faces', rnd = Math.random) {
  const moves = DRILL_SETS[set] || DRILL_SETS.faces;
  let current = null, done = 0, streak = 0, best = 0, misses = 0;
  const next = () => {
    const options = moves.filter((m) => m !== current && m !== (current && inverse(current)));
    current = options[Math.floor(rnd() * options.length)];
    return current;
  };
  next();
  return {
    get current() { return current; },
    get done() { return done; },
    get streak() { return streak; },
    get bestStreak() { return best; },
    get misses() { return misses; },
    hit() { done++; streak++; best = Math.max(best, streak); return next(); },
    miss() { misses++; streak = 0; },
  };
}

const AXIS = { R: 'x', L: 'x', M: 'x', x: 'x', U: 'y', D: 'y', E: 'y', y: 'y', F: 'z', B: 'z', S: 'z', z: 'z' };
const cheapest = (net) => (net === 0 ? 0 : net === 2 ? 2 : 1);

export function createFinesse() {
  let axis = null, layers = {}, turns = 0, waste = 0, faults = 0;
  const groupWaste = () => Object.values(layers).reduce((sum, l) => sum + l.count - cheapest(l.net), 0);

  return {
    turn(move) {
      const base = move[0];
      turns++;
      if (AXIS[base] !== axis) { axis = AXIS[base]; layers = {}; }
      const before = groupWaste();
      const layer = layers[base] || (layers[base] = { net: 0, count: 0 });
      layer.net = (layer.net + (move.endsWith("'") ? 3 : 1)) % 4;
      layer.count++;
      const added = Math.max(0, groupWaste() - before);
      waste += added;
      if (added) faults++;
      return added;
    },
    reset() { axis = null; layers = {}; },
    get turns() { return turns; },
    get waste() { return waste; },
    get faults() { return faults; },
    get score() { return turns ? Math.max(0, 1 - waste / turns) : 1; },
  };
}

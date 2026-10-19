// Finesse: wasted turns, the way Tetris counts wasted inputs.
// Moves on one axis commute (R L R' is just L), so turns are grouped by axis until a
// move on another axis arrives. Within a group each layer's quarter turns add up to a
// net rotation; the cheapest way to make it costs 0 (net 0), 1 (net 1 or 3) or 2 (net 2,
// typed as a double). Anything above that is waste.
const AXIS = { R: 'x', L: 'x', M: 'x', x: 'x', U: 'y', D: 'y', E: 'y', y: 'y', F: 'z', B: 'z', S: 'z', z: 'z' };
const cheapest = (net) => (net === 0 ? 0 : net === 2 ? 2 : 1);

export function createFinesse() {
  let axis = null, layers = {}, turns = 0, waste = 0, faults = 0;
  const groupWaste = () => Object.values(layers).reduce((sum, l) => sum + l.count - cheapest(l.net), 0);

  return {
    // Record a player-chosen turn. Returns the wasted turns it added (0 if efficient).
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
    // Forced moves (algorithms) end the current group without being scored.
    reset() { axis = null; layers = {}; },
    get turns() { return turns; },
    get waste() { return waste; },
    get faults() { return faults; },
    get score() { return turns ? Math.max(0, 1 - waste / turns) : 1; },
  };
}

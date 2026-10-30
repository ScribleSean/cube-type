// The typing model every mode shares. Pure functions, so the rules are tested in one place:
// a typed letter is never dropped or corrected, letters that don't fit stay until deleted,
// and each wrong letter counts as one error, once.

export const MAX_TYPED = 24;

// How many typed letters are right: the longest start of `typed` that some candidate shares.
export function goodLength(typed, candidates) {
  let best = 0;
  for (const w of candidates) {
    let i = 0;
    while (i < typed.length && typed[i] === w[i]) i++;
    best = Math.max(best, i);
  }
  return best;
}

// Add one letter. Returns null when the buffer is full. Otherwise the letter is always kept:
// `ok` says whether it fits a candidate, `firstSlip` whether it is the first wrong letter of the word.
export function addLetter(typed, ch, candidates) {
  if (typed.length >= MAX_TYPED) return null;
  const wasClean = goodLength(typed, candidates) === typed.length;
  const next = typed + ch;
  const ok = goodLength(next, candidates) === next.length;
  return { typed: next, ok, firstSlip: !ok && wasClean };
}

// Errors to add when an algorithm line moves past `want` with `typed`. Wrong letters were
// already counted as they were typed, so only letters never typed are added here.
export const missedLetters = (typed, want) => Math.max(0, want.length - typed.length);

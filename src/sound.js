// Small synthesized sounds (no audio files). `enabled` is read on every call.
const SCALE = [0, 2, 4, 7, 9];

export function createSound(enabled) {
  let ctx = null;
  function blip(freq, dur, type = 'sine', gain = 0.05, delay = 0) {
    if (!enabled()) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t = ctx.currentTime + delay;
      const osc = ctx.createOscillator(), amp = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      amp.gain.setValueAtTime(gain, t);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(amp).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch {}
  }
  return {
    key: () => blip(1500 + Math.random() * 250, 0.025, 'triangle', 0.02),
    // Each clean word climbs a pentatonic scale, so streaks sound like they build.
    word: (combo) => blip(330 * 2 ** ((SCALE[combo % 5] + 12 * (Math.floor(combo / 5) % 3)) / 12), 0.09),
    error: () => blip(110, 0.12, 'square', 0.025),
    fault: () => blip(180, 0.1, 'sawtooth', 0.02),
    progress: (freq) => blip(freq, 0.08, 'sine', 0.04),
    stage: () => { blip(660, 0.12); blip(990, 0.16, 'sine', 0.05, 0.07); },
    solve: () => [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.3, 'sine', 0.06, i * 0.06)),
  };
}

// First-run onboarding: name, how it works, settings, then a mode to start in.
const CHOICES = [
  { key: 'layout', title: 'board', options: [
    { value: 'full', label: 'full', note: 'every word is always on screen' },
    { value: 'focus', label: 'focus', note: 'type a face letter and only its words appear' }] },
  { key: 'words', title: 'words', options: [
    { value: 'steady', label: 'steady', note: 'words change only when you reach a new stage' },
    { value: 'flux', label: 'flux', note: 'words reshuffle after every turn' }] },
  { key: 'drillSet', title: 'drill moves', options: [
    { value: 'faces', label: 'faces', note: 'R L U D F B and their primes' },
    { value: 'all', label: 'everything', note: 'faces plus slices (M E S) and rotations (x y z)' }] },
  { key: 'sound', title: 'sound', options: [
    { value: true, label: 'on', note: 'clicks and a note that climbs with your streak' },
    { value: false, label: 'off', note: 'silent' }] },
];
const MODES = [
  { mode: 'drill', title: 'drill', note: 'random moves on a loop. The best way to learn the words.' },
  { mode: 'sprint', title: 'sprint', note: 'one timed solve with splits, WPM and finesse.' },
  { mode: 'zen', title: 'zen', note: 'no pressure. Cubes keep coming until you press esc.' },
];
const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function createOnboarding({ root, profiles, onDone }) {
  let step = 0;
  const steps = [welcome, setup, pickMode];

  function welcome() {
    const p = profiles.active();
    return `
      <div class="ob-step">1 / 3</div>
      <h1>cube<span>·</span>type</h1>
      <p class="ob-lead">Solve a Rubik's cube by typing words.</p>
      <ul class="ob-how">
        <li><b>type a word</b> and its layer turns. <code>rush</code> turns R, <code>recoil</code> turns R'.</li>
        <li><b>first letter = face.</b> r words turn R, u words turn U.</li>
        <li><b>word, then enter</b> is a double turn: <code>rush</code> ⏎ is R2.</li>
        <li><b>swipe</b> the cube or use the <b>arrow keys</b> to rotate it (x, y, z).</li>
        <li>after F2L, your <b>OLL and PLL</b> appear as a line of words. Type it like Monkeytype, with <b>space</b> between words.</li>
      </ul>
      <label class="ob-name">what should we call you?
        <input id="ob-name" maxlength="20" value="${escapeHtml(p.name)}" autocomplete="off">
      </label>
      <div class="ob-nav"><button class="ob-primary" data-go="next">next</button></div>`;
  }

  function setup() {
    const s = profiles.active().settings;
    return `
      <div class="ob-step">2 / 3</div>
      <h2>how do you like to play?</h2>
      <p class="ob-lead">You can change all of this later from the top bar.</p>
      ${CHOICES.map((c) => `
        <div class="ob-choice"><div class="ob-ctitle">${c.title}</div><div class="ob-opts">
          ${c.options.map((o) => `<button class="ob-opt${s[c.key] === o.value ? ' on' : ''}" data-key="${c.key}" data-value="${o.value}"><b>${o.label}</b><span>${o.note}</span></button>`).join('')}
        </div></div>`).join('')}
      <div class="ob-nav"><button data-go="back">back</button><button class="ob-primary" data-go="next">next</button></div>`;
  }

  function pickMode() {
    return `
      <div class="ob-step">3 / 3</div>
      <h2>where do you want to start?</h2>
      <p class="ob-lead">New to the words? Start with drill.</p>
      <div class="ob-modes">
        ${MODES.map((m) => `<button class="ob-mode" data-mode="${m.mode}"><b>${m.title}</b><span>${m.note}</span></button>`).join('')}
      </div>
      <div class="ob-nav"><button data-go="back">back</button></div>`;
  }

  function draw() {
    root.querySelector('.sheet').innerHTML = steps[step]();
    const first = root.querySelector('#ob-name, .ob-primary, .ob-mode');
    if (first) setTimeout(() => first.focus(), 0);
  }

  root.addEventListener('keydown', (e) => {
    e.stopPropagation(); // keep typing here out of the game
    if (e.key === 'Enter' && e.target.id === 'ob-name') { e.preventDefault(); go('next'); }
  });
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.go) return go(b.dataset.go);
    if (b.dataset.key) {
      const raw = b.dataset.value, value = raw === 'true' ? true : raw === 'false' ? false : raw;
      profiles.setting(b.dataset.key, value);
      return draw();
    }
    if (b.dataset.mode) {
      profiles.markOnboarded();
      root.hidden = true;
      onDone(b.dataset.mode);
    }
  });

  function go(dir) {
    if (step === 0) {
      const name = root.querySelector('#ob-name').value;
      if (name.trim()) profiles.rename(profiles.active().id, name);
    }
    step = Math.max(0, Math.min(steps.length - 1, step + (dir === 'next' ? 1 : -1)));
    draw();
  }

  return {
    get open() { return !root.hidden; },
    start() { step = 0; root.hidden = false; draw(); },
  };
}

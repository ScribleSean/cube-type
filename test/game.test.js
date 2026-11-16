import { test } from 'node:test';
import assert from 'node:assert/strict';
import { game } from './helpers/game.js';

test('pending zen solve cannot replace a new drill cube', () => {
  const g = game();
  g.run("mode = 'zen'; newGame(); solved(); mode = 'drill'; newGame()");
  g.advance(380);
  assert.equal(g.run('phase'), 'done', 'old zen callback replaced drill cube');
});

test('pending sprint results cannot cover a restarted or changed-profile game', () => {
  for (const transition of ['newGame()', null]) {
    const g = game();
    g.run('solved()');
    if (transition) g.run(transition); else g.profileChange();
    g.advance(450);
    assert.equal(g.results, 0, 'old sprint results covered new game');
  }
});

test('IME updates wait for compositionend and composing keys do nothing', () => {
  const g = game();
  g.node('#inp').emit('compositionstart');
  g.input('red', { isComposing: true });
  assert.equal(g.api.check().turns, 0, 'composition update made a move');
  g.key('Enter', { isComposing: true });
  g.key('Escape', { isComposing: true });
  g.node('#inp').emit('compositionend');
  g.node('#inp').emit('input'); // final input observes the reset placeholder
  assert.equal(g.api.check().turns, 1);
});

test('elapsed time excludes hidden intervals including a restart while hidden', () => {
  const g = game();
  g.api.type('r');
  g.advance(1000);
  g.document.hidden = true; g.document.emit('visibilitychange');
  g.advance(5000);
  assert.equal(g.run('elapsed()'), 1, 'hidden time advanced clock');
  g.document.hidden = false; g.document.emit('visibilitychange');
  g.advance(1000);
  assert.equal(g.run('elapsed()'), 2);
  g.document.hidden = true; g.document.emit('visibilitychange');
  g.run('newGame()'); g.api.type('r'); g.advance(5000);
  g.document.hidden = false; g.document.emit('visibilitychange');
  assert.equal(g.run('elapsed()'), 0);
});

test('held Enter and other single-action keys do not repeat actions', () => {
  const g = game();
  g.api.type('red');
  g.key('Enter', { repeat: true });
  assert.equal(g.api.check().turns, 1, 'held Enter repeated move');
  g.key('Escape', { repeat: true });
  g.key('Tab', { repeat: true });
  g.key('ArrowLeft', { repeat: true });
  assert.equal(g.api.check().turns, 1);
});

test('stats blocks letters Enter paste and backspace', () => {
  const g = game();
  g.api.type('red');
  g.overlay.statsOpen = true;
  g.key('Enter');
  assert.equal(g.api.check().turns, 1, 'Enter moved behind stats');
  g.input('red');
  assert.equal(g.api.check().turns, 1);
  g.api.type('r');
  assert.equal(g.run('buffer'), '');
  g.run("buffer = 'r'"); g.key('Backspace');
  assert.equal(g.run('buffer'), 'r');
});


test('Escape cancels a pending zen scramble and keeps the stopped run over', () => {
  const g = game();
  g.run("mode = 'zen'; newGame(); t0 = performance.now(); solved(); scrambleLoads = 0; loadScramble = () => { scrambleLoads++; }");
  g.key('Escape');
  assert.equal(g.results, 1);
  assert.equal(g.run('over'), true);
  g.advance(1000);
  assert.equal(g.run('scrambleLoads'), 0, 'pending solve loaded a scramble behind results');
  assert.equal(g.run('over'), true);
});

test('stopping drill cancels a pending solve timer and hint timer', () => {
  const g = game();
  g.run("mode = 'drill'; newGame(); t0 = performance.now(); solveTimer = setTimeout(() => { over = false; }, 380)");
  g.key('Escape');
  g.advance(10000);
  assert.equal(g.run('over'), true, 'pending solve changed the stopped drill');
  assert.equal(g.run('hint'), false);
});


for (const key of ['ArrowLeft', 'Tab']) {
  test(`held ${key} remains native in the open profile field`, () => {
    const g = game();
    g.node('#profile-name').focus();
    g.run('profilePanel.open = true; profilePanel.contains = () => true');
    let prevented = false;
    g.key(key, { repeat: true, preventDefault() { prevented = true; } });
    assert.equal(prevented, false, `held ${key} prevented native profile-field behavior`);
  });
}

test('held arrow in the game input is prevented without rotating', () => {
  const g = game();
  g.node('#inp').focus();
  g.run('rotations = 0; rotate = () => { rotations++; }');
  let prevented = false;
  g.key('ArrowLeft', { repeat: true, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(g.run('rotations'), 0);
});

test('held Escape in the profile field does not start a new game', () => {
  const g = game();
  g.node('#profile-name').focus();
  g.run("mode = 'zen'; newGame(); t0 = performance.now(); profilePanel.open = true; profilePanel.contains = () => true; newGames = 0; newGame = () => { newGames++; }");
  let prevented = false;
  g.key('Escape', { repeat: true, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(g.run('newGames'), 0);
  assert.equal(g.results, 0);
});

test('held arrow on a nav button does not rotate the cube', () => {
  const g = game();
  const nav = g.node('#nav-button');
  nav.matches = () => true;
  nav.focus();
  g.run('rotations = 0; rotate = () => { rotations++; }');
  g.key('ArrowLeft', { repeat: true });
  assert.equal(g.run('rotations'), 0);
});

test('a phone keyboard opening keeps the typed word or the focused field in view', () => {
  const g = game();
  g.node('#inp').focus();
  g.resize();
  assert.equal(g.node('#echo').scrolledTo?.block, 'nearest', 'typed word left under the keyboard');
  g.node('#pname').focus();
  g.resize();
  assert.equal(g.node('#pname').scrolledTo?.block, 'center', 'focused field left under the keyboard');
});

test('typing a word does not pull the board back to the typing line', () => {
  const g = game();
  g.node('#inp').focus();
  g.input('red');
  g.key('Enter');
  assert.equal(g.node('#echo').scrolledTo, undefined, 'a move scrolled the board');
});

test('letters typed while the intro is open do not reach the game', () => {
  const g = game();
  g.onboarding.open = true;
  g.input('red');
  assert.equal(g.run('t0'), null, 'the clock started behind the intro');
  assert.equal(g.run('buffer'), '');
});

test('tapping the running zen or drill finishes it; other taps start fresh', () => {
  const g = game();
  g.run("mode = 'zen'; newGame(); t0 = performance.now()");
  g.run("pickMode('zen')");
  assert.equal(g.results, 1);
  assert.equal(g.run('over'), true);
  g.run("pickMode('sprint')");
  assert.equal(g.run('mode'), 'sprint');
  assert.equal(g.run('over'), false);
  g.run("pickMode('sprint')");
  assert.equal(g.results, 1, 'tapping sprint showed results');
});

test('a finished alg line leaves nothing for Enter to repeat', () => {
  const g = game();
  g.run("stream = { words: ['red'], notation: ['R'], i: 0, slips: {}, plan: {} }; buffer = 'red'; lastMove = 'U'; nextStreamWord()");
  assert.equal(g.run('lastMove'), null);
});

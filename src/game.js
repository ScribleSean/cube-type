// Game controller: modes, typing, stages, finesse and records. Entry point for index.html.
import * as Cube from './cube.js';
import { makeContext } from './picker.js';
import { createFinesse } from './finesse.js';
import { createDrill } from './drill.js';
import { profiles } from './profiles.js';
import { createSound } from './sound.js';
import { createScene } from './scene.js';
import { createBoard } from './ui/board.js';
import { createStream, wordsForMoves, REPEAT } from './ui/stream.js';
import { createHud } from './ui/hud.js';
import { createViewPanel, createProfilePanel } from './ui/panels.js';
import { createOverlays } from './ui/overlays.js';
import { createEcho } from './ui/echo.js';
import { createOnboarding } from './ui/onboarding.js';

const $ = (s) => document.querySelector(s);
const PHASES = ['cross', 'f2l', 'oll', 'pll', 'done'];
// Accent color climbs with the stage: calm blue, building yellow, intense orange-red.
const STAGE_COLOR = ['#7fb4d9', '#e2b714', '#f2734a', '#f2734a', '#f2734a'];
const MOVE_INFO = {
  R: 'right face', L: 'left face', U: 'top face', D: 'bottom face', F: 'front face', B: 'back face',
  M: 'middle slice between L and R, turns like L', E: 'middle slice between U and D, turns like D',
  S: 'middle slice between F and B, turns like F', x: 'whole cube, turns like R', y: 'whole cube, turns like U', z: 'whole cube, turns like F',
};
const ARROW_ROTATIONS = { ArrowLeft: 'y', ArrowRight: "y'", ArrowUp: 'x', ArrowDown: "x'" };
const SHIFT_ARROW_ROTATIONS = { ArrowLeft: "z'", ArrowRight: 'z' };

const DRILL_HINT_MS = 1500; // light up the word if you haven't found it by then
const WRONG_LETTER_MS = 350;

const settings = () => profiles.active().settings;

// ---------------------------------------------------------------- state
let mode = 'sprint';
let cube, phase, reached, splits, t0, over, locked, buffer, stream, solves, combo, samples, turns, prog, drill, finesse;
let hint = false, hintTimer = null, wrongTimer = null;
let chars, errors, lastMove, frame = 0, accent = STAGE_COLOR[0];
const ctx = makeContext();

const elapsed = () => (t0 ? (performance.now() - t0) / 1000 : 0);
const wpm = () => { const t = elapsed(); return t > 0.5 ? (chars / 5) / (t / 60) : 0; };
const accuracy = () => (chars ? chars / (chars + errors) : 1);
const tier = () => (mode === 'zen' || mode === 'drill' ? 0 : Math.min(reached, 2));
const target = () => (drill ? drill.current : null);

// ---------------------------------------------------------------- modules
const sound = createSound(() => settings().sound);
const scene = createScene({
  stage: $('#stage'), canvas: $('#cube'), mirrorBox: $('#mirror'), mirrorLabel: $('#mirror-label'),
  onFrame: () => { if (t0 && !over) drawHud(); },
  onSwipe: (tok) => rotate(tok),
});
const board = createBoard({ arena: $('#arena'), slices: $('#g-slices'), rotations: $('#g-rot') });
const streamView = createStream({ root: $('#stream'), caseLabel: $('#case'), line: $('#line'), caret: $('#caret') });
const echo = createEcho($('#echo'));
const hud = createHud({
  timer: $('#timer'), label: $('#phase'), combo: $('#combo'), wpm: $('#wpm'), finesse: $('#finesse'),
  stages: $('#stages'), toasts: $('#toasts'),
});
const overlays = createOverlays({
  results: $('#results'), resultsBody: $('#res'), statsEl: $('#stats'), statsBody: $('#stats-body'), statsButton: $('#btn-stats'),
  getProfile: () => profiles.active(), getAccent: () => accent,
});
const viewPanel = createViewPanel({
  panel: $('#viewpanel'), button: $('#btn-view'), grid: $('#vgrid'), tabs: $('#vtabs'), mirrorRow: $('#vmirror'), hint: $('#vhint'),
  getSettings: settings, drawThumbs: (c) => scene.drawThumbs(c),
  onChange: (patch, message) => { for (const k in patch) profiles.setting(k, patch[k]); applyView(); viewPanel.redraw(); hud.toast(message); },
});
const profilePanel = createProfilePanel({
  panel: $('#profilepanel'), button: $('#btn-profile'), list: $('#plist'), form: $('#pform'), input: $('#pname'), profiles,
  onChange: () => { drawToggles(); applyView(); newGame(); if (!profiles.active().onboarded) onboarding.start(); },
});
const onboarding = createOnboarding({
  root: $('#onboarding'), profiles,
  onDone: (m) => { mode = m; profilePanel.redraw(); drawToggles(); newGame(); input.focus(); },
});
$('#btn-intro').addEventListener('click', () => { profilePanel.toggle(false); onboarding.start(); });
const popovers = [viewPanel, profilePanel];

// ---------------------------------------------------------------- view and frame
// The player's frame follows the camera: the side face shown on the left is their F.
function applyView() {
  const s = settings();
  scene.setView(s.view, s.mirror);
  const dirs = scene.faceDirections();
  const sides = dirs.filter((d) => d.visible && 'FRBL'.includes(d.face));
  const left = sides.reduce((a, b) => (Math.cos(a.angle) <= Math.cos(b.angle) ? a : b));
  frame = Cube.frameFor(left.face);
  board.layout(dirs, (f) => Cube.toWorld(f, frame));
  if (stream) { stream = null; maybeStartStream(); refresh(false); }
}

// ---------------------------------------------------------------- game flow
function setPosition(worldMoves, slide) {
  cube = Cube.applyAll(Cube.solved(), worldMoves);
  scene.setPosition(worldMoves, slide);
  phase = Cube.phase(cube);
  reached = PHASES.indexOf(phase);
  prog = Cube.progress(cube);
  stream = null; buffer = ''; lastMove = null;
  finesse.reset();
  if (mode !== 'drill') maybeStartStream();
  refresh(true);
}

function loadScramble(slide) {
  const scramble = Cube.scramble();
  $('#scr').textContent = scramble.join(' ');
  setPosition(scramble, slide);
}

function newGame() {
  splits = {}; t0 = null; over = false; locked = false; drill = null; hint = false;
  clearTimeout(hintTimer);
  chars = 0; errors = 0; combo = 0; solves = 0; samples = []; turns = 0;
  finesse = createFinesse();
  overlays.hideResults();
  document.body.classList.toggle('drill', mode === 'drill');
  document.querySelectorAll('nav [data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
  if (mode === 'drill') {
    drill = createDrill(settings().drillSet);
    $('#scr').textContent = '';
    $('#banner').textContent = 'type the word for each move · esc to finish';
    setPosition([], true);
    scheduleHint();
    return;
  }
  $('#banner').textContent = mode === 'zen' ? 'zen · cubes keep coming · esc when you are done' : '';
  loadScramble(true);
}

function maybeStartStream() {
  if (stream || (phase !== 'oll' && phase !== 'pll')) return;
  const plan = Cube.planLLFor(cube, frame);
  if (!plan) return;
  finesse.reset();
  stream = {
    plan, i: 0, notation: plan.moves,
    words: wordsForMoves(plan.moves, { calm: mode === 'zen', ctx }),
    naming: settings().names && plan.name !== 'auf',
  };
}

function doMove(tok) {
  const world = Cube.toWorld(tok, frame);
  Cube.apply(cube, world);
  scene.turn(world);
  turns++;
}

// A player-chosen turn (typed on the board, or a swipe/arrow-key rotation).
function playerTurn(tok) {
  const wasted = finesse.turn(tok);
  doMove(tok);
  if (wasted) {
    sound.fault();
    hud.flash($('#finesse'));
    hud.toast(`finesse −${wasted}`, 'fault');
  }
}

function afterMove() {
  const now = elapsed(), before = prog, was = reached;
  phase = Cube.phase(cube);
  prog = Cube.progress(cube);
  const is = PHASES.indexOf(phase);
  if (reached === 0 && prog.edges > before.edges) { hud.bump('cross'); sound.progress(880); }
  if (reached === 1 && phase === 'f2l' && prog.pairs > before.pairs) { hud.bump('f2l'); sound.progress(990); hud.toast(`pair ${prog.pairs}/4`); }
  if (is > reached) {
    for (let i = 0; i < is; i++) if (splits[PHASES[i]] === undefined) {
      splits[PHASES[i]] = now;
      if (mode !== 'zen' && PHASES[i] !== 'pll') hud.toast(`${PHASES[i]} ${now.toFixed(2)}`);
    }
    reached = is;
    if (phase !== 'done') sound.stage();
  }
  if (phase === 'done') return solved();
  maybeStartStream();
  // steady: words change only the first time you reach a new stage. flux: after every turn.
  const levelUp = reached > was && !stream;
  if (levelUp && settings().words === 'steady') hud.toast(`${PHASES[reached]} · new words`);
  refresh(settings().words === 'flux' || levelUp, levelUp && settings().words === 'steady');
}

function segments() {
  const seg = {};
  ['cross', 'f2l', 'oll', 'pll'].forEach((p, i) => {
    if (splits[p] !== undefined) seg[p] = splits[p] - (i ? splits[PHASES[i - 1]] || 0 : 0);
  });
  return seg;
}

function solved() {
  sound.solve();
  scene.pulse();
  document.body.classList.add('flash');
  setTimeout(() => document.body.classList.remove('flash'), 120);
  stream = null;
  if (mode === 'zen') {
    solves++;
    hud.toast(`solve ${solves} · ${elapsed().toFixed(2)}`);
    locked = true;
    refresh(false);
    setTimeout(() => { locked = false; splits = {}; loadScramble(true); }, 380);
    return;
  }
  over = true;
  refresh(false);
  const run = { mode: 'sprint', time: elapsed(), wpm: wpm(), acc: accuracy(), finesse: finesse.score, faults: finesse.faults, turns, segments: segments(), samples };
  profiles.addRecord(record(run));
  setTimeout(() => overlays.showResults(run), 450);
}

function stopZen() {
  over = true;
  const run = { mode: 'zen', time: elapsed(), solves, wpm: wpm(), acc: accuracy(), finesse: finesse.score, turns, samples };
  profiles.addRecord(record(run));
  overlays.showResults(run);
}

// What gets saved: everything except the per-second samples.
const record = ({ samples: _, ...rest }) => rest;

// Drill: next random move, fresh words, and a hint timer for the new move.
function drillNext() {
  drill.hit();
  if (drill.streak % 10 === 0) { sound.stage(); hud.toast(`streak ${drill.streak}`); }
  hint = false;
  scheduleHint();
  refresh(true);
}
function scheduleHint() {
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => { hint = true; drawBoard(); }, DRILL_HINT_MS);
}
function stopDrill() {
  over = true;
  clearTimeout(hintTimer);
  const time = elapsed();
  const run = { mode: 'drill', time, done: drill.done, rate: time ? drill.done / (time / 60) : 0, streak: drill.bestStreak,
    misses: drill.misses, wpm: wpm(), acc: accuracy(), samples };
  if (drill.done) profiles.addRecord(record(run));
  overlays.showResults(run);
}

// ---------------------------------------------------------------- input
// A wrong letter: shown in red where you typed it, then cleared.
function error(ch) {
  errors++;
  combo = 0;
  sound.error();
  if (drill) drill.miss();
  if (stream) {
    streamView.draw(stream, buffer, ch);
    clearTimeout(wrongTimer);
    wrongTimer = setTimeout(() => stream && streamView.draw(stream, buffer), WRONG_LETTER_MS);
  } else if (ch) {
    echo.wrong(ch);
  }
  board.flashWrong();
  drawHud();
}

function wordDone(word) {
  combo++;
  buffer = '';
  if (word) ctx.push(word);
  sound.word(combo);
}

function boardChar(ch) {
  const cand = buffer + ch, hits = board.matches(cand, target());
  if (!hits.length) return error(ch);
  buffer = cand;
  chars++;
  sound.key();
  const exact = hits.find((m) => board.words[m] === cand);
  if (exact && hits.length === 1) return fireBoard(exact);
  drawBoard();
}

function fireBoard(move) {
  const word = board.words[move];
  lastMove = move;
  board.fire(move);
  if (drill) { doMove(move); wordDone(word); return drillNext(); }
  playerTurn(move);
  wordDone(word);
  afterMove();
}

// Enter: finish an ambiguous word, or with nothing typed, repeat the last turn (a double).
function submit() {
  if (over || locked) return;
  if (stream) {
    if (stream.words[stream.i] !== REPEAT) return error('⏎');
    doMove(stream.notation[stream.i++]);
    wordDone('');
    if (stream.i >= stream.words.length) { stream = null; finesse.reset(); afterMove(); } else refresh(false);
    return;
  }
  if (!buffer && lastMove && !drill) {
    if (!t0) t0 = performance.now();
    board.fire(lastMove);
    playerTurn(lastMove);
    wordDone('');
    return afterMove();
  }
  if (!buffer) return;
  const exact = board.matches(buffer, target()).find((m) => board.words[m] === buffer);
  if (exact) fireBoard(exact);
}

function streamChar(ch) {
  const want = stream.naming ? stream.plan.name : stream.words[stream.i];
  if (want === REPEAT || want[buffer.length] !== ch) return error(ch);
  buffer += ch;
  chars++;
  sound.key();
  if (buffer !== want) return streamView.draw(stream, buffer);
  if (stream.naming) { stream.naming = false; wordDone(want); return refresh(false); }
  doMove(stream.notation[stream.i++]);
  wordDone(want);
  if (stream.i >= stream.words.length) { stream = null; finesse.reset(); afterMove(); } else refresh(false);
}

function handleChar(ch) {
  if (over || locked) return;
  if (ch === ' ') return buffer && !stream ? submit() : undefined;
  if (ch === '\n') return submit();
  if (!/^[a-z]$/.test(ch)) return;
  if (!t0) t0 = performance.now();
  if (stream) streamChar(ch); else boardChar(ch);
  drawHud();
}

// Whole-cube rotation from a swipe or arrow key.
function rotate(tok) {
  if (over || locked || overlays.statsOpen) return;
  if (drill) {
    if (tok !== target()) return error();
    if (!t0) t0 = performance.now();
    doMove(tok);
    return drillNext();
  }
  if (!t0) t0 = performance.now();
  stream = null;
  buffer = '';
  lastMove = tok;
  playerTurn(tok);
  afterMove();
}

const input = $('#inp');
input.addEventListener('input', () => {
  const v = input.value;
  input.value = '';
  for (const ch of v) handleChar(ch.toLowerCase());
});

document.addEventListener('keydown', (e) => {
  if (onboarding.open) return;
  const open = popovers.find((p) => p.open);
  if (e.key === 'Escape') {
    e.preventDefault();
    if (open) return open.toggle(false);
    if (overlays.statsOpen) return overlays.toggleStats(false);
    if (over) return newGame();
    if (mode === 'zen' && t0) return stopZen();
    if (mode === 'drill' && t0) return stopDrill();
    return newGame();
  }
  if (open && open.contains(document.activeElement)) return;
  if (e.key === 'Tab') { e.preventDefault(); return newGame(); }
  if (e.key === 'Enter' && document.activeElement === input) { e.preventDefault(); return over ? newGame() : submit(); }
  const rot = (e.shiftKey ? SHIFT_ARROW_ROTATIONS : ARROW_ROTATIONS)[e.key];
  if (rot) { e.preventDefault(); return rotate(rot); }
  if (e.key === 'Backspace' && buffer && !over) {
    buffer = buffer.slice(0, -1);
    stream ? streamView.draw(stream, buffer) : drawBoard();
  }
  if (document.activeElement !== input) input.focus();
});
document.addEventListener('pointerup', (e) => {
  if (popovers.some((p) => p.contains(e.target)) || e.target.closest('#stats, button, input')) return;
  input.focus();
});

// ---------------------------------------------------------------- drawing
function setAccent() {
  accent = mode === 'zen' || mode === 'drill' ? STAGE_COLOR[0] : STAGE_COLOR[reached];
  document.documentElement.style.setProperty('--main', accent);
  scene.setAccent(accent);
}

function drawBoard() {
  const s = settings();
  document.body.classList.toggle('focus', s.layout === 'focus' && mode !== 'drill');
  $('#hint').textContent = s.layout === 'focus' && mode !== 'drill' && !buffer && !stream ? 'type a face letter · r l u d f b · m e s · x y z' : '';
  board.draw({ buffer, target: target(), highlight: hint });
  echo.draw(buffer);
}

// The drill prompt: the move in big notation, with what it means underneath.
function drawPrompt() {
  const el = $('#prompt');
  el.hidden = !drill;
  if (!drill) return;
  const m = drill.current;
  const dir = m.endsWith("'") ? 'counter-clockwise' : 'clockwise';
  el.innerHTML = `<b>${m}</b><span>${MOVE_INFO[m[0]]} · ${dir}</span>`;
}

function drawHud() {
  hud.draw({
    time: elapsed(),
    showTimer: true,
    label: mode === 'zen' ? `zen · ${solves} solved` : drill ? `${drill.done} moves · streak ${drill.streak}` : phase === 'done' ? 'solved' : '',
    combo, wpm: t0 ? wpm() : null,
    finesse: t0 && !drill && finesse.turns ? finesse.score : null,
    reached, current: PHASES.indexOf(phase), splits, progress: prog,
  });
}

function refresh(reassign, levelUp) {
  setAccent();
  if (!stream && reassign) board.assign({ tier: tier(), keep: lastMove, ctx, levelUp });
  drawPrompt();
  drawBoard();
  streamView.draw(stream, buffer);
  drawHud();
}

setInterval(() => { if (t0 && !over) samples.push(Math.round(wpm())); }, 1000);

// ---------------------------------------------------------------- settings toggles
const toggles = {
  sound: { el: $('#btn-sound'), text: (v) => (v ? 'sound on' : 'sound off'), next: (v) => !v },
  words: { el: $('#btn-words'), text: (v) => v, next: (v) => (v === 'steady' ? 'flux' : 'steady'), note: (v) => (v === 'steady' ? 'steady · words change at each new stage' : 'flux · words reshuffle every turn') },
  layout: { el: $('#btn-layout'), text: (v) => v, next: (v) => (v === 'full' ? 'focus' : 'full') },
  drillSet: { el: $('#btn-drillset'), text: (v) => (v === 'all' ? 'drill: all moves' : 'drill: faces'), next: (v) => (v === 'all' ? 'faces' : 'all'), restart: true },
  names: { el: $('#btn-names'), text: () => 'name cases', next: (v) => !v },
};
function drawToggles() {
  for (const [key, t] of Object.entries(toggles)) {
    const v = settings()[key];
    t.el.textContent = t.text(v);
    t.el.classList.toggle('on', ['words', 'layout', 'drillSet'].includes(key) || !!v);
  }
}
for (const [key, t] of Object.entries(toggles)) {
  t.el.addEventListener('click', () => {
    profiles.setting(key, t.next(settings()[key]));
    drawToggles();
    drawBoard();
    if (t.note) hud.toast(t.note(settings()[key]));
    if (t.restart && mode === 'drill') newGame();
  });
}
document.querySelectorAll('nav [data-mode]').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.mode; newGame(); }));

// ---------------------------------------------------------------- one-screen sizing
// The page never scrolls: it is sized to the visible viewport, which shrinks when a
// phone keyboard opens.
function fitViewport() {
  const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty('--app-h', h + 'px');
  window.scrollTo(0, 0);
}
(window.visualViewport || window).addEventListener('resize', fitViewport);
fitViewport();

// ---------------------------------------------------------------- start
drawToggles();
finesse = createFinesse();
applyView();
newGame();
if (profiles.active().onboarded) input.focus(); else onboarding.start();

// Hooks for automated checks in the browser console.
window.cubeType = {
  check: () => ({ mismatches: scene.mismatches(cube), phase, reached: PHASES[reached], stream: stream && stream.plan.name, words: board.words, drill: drill && { current: drill.current, done: drill.done, streak: drill.streak }, frame, finesse: finesse.score, turns }),
  type: (text) => { for (const ch of text) handleChar(ch); },
  rotate,
  load: (moves) => setPosition(Cube.split(moves), false),
};

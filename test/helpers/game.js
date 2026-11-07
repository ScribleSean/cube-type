import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import * as Cube from '../../src/cube.js';
import * as Typing from '../../src/typing.js';
import { makeContext } from '../../src/picker.js';
import { createFinesse } from '../../src/finesse.js';
import { createDrill } from '../../src/drill.js';
import { DEFAULT_SETTINGS } from '../../src/profiles.js';
import { keyRoute, isControl, clickReturnsFocus } from '../../src/keys.js';

export function game() {
  const nodes = new Map(), timers = new Map();
  let now = 1000, timerId = 0, results = 0;
  const noop = () => {};
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, { value: ' ', dataset: {}, style: { setProperty: noop },
      classList: { toggle: noop, add: noop, remove: noop }, listeners: {},
      addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); },
      emit(type, props = {}) { for (const fn of this.listeners[type] || []) fn({ preventDefault: noop, ...props }); },
      focus() { document.activeElement = this; }, setSelectionRange: noop, matches: () => false,
    });
    return nodes.get(id);
  }
  const document = node('document');
  Object.assign(document, { querySelector: node, querySelectorAll: () => [], body: node('body'), documentElement: node('html'), hidden: false });
  const overlay = { statsOpen: false, hideResults: noop, showResults: () => results++, toggleStats(v) { this.statsOpen = v; } };
  const panel = { open: false, contains: () => false, redraw: noop };
  const scene = { setView: noop, faceDirections: () => [{ face: 'F', visible: true, angle: 0 }], setPosition: noop,
    mismatches: () => [], setAccent: noop, turn: noop, pulse: noop };
  const board = { words: { R: 'red' }, layout: noop, assign: noop, draw: noop, fire: noop, flashWrong: noop,
    matches: (text) => 'red'.startsWith(text) ? ['R'] : [] };
  const context = vm.createContext({ Cube, Typing, makeContext, createFinesse, createDrill, keyRoute, isControl, clickReturnsFocus,
    profiles: { active: () => ({ settings: { ...DEFAULT_SETTINGS }, onboarded: true }), addRecord: noop },
    createSound: () => new Proxy({}, { get: () => noop }), createScene: () => scene, createBoard: () => board,
    createStream: () => ({ draw: noop }), wordsForMoves: () => [], REPEAT: '.',
    createHud: () => ({ draw: noop, toast: noop, bump: noop, flash: noop }),
    createViewPanel: () => panel, createProfilePanel: (options) => { context.profileChange = options.onChange; return panel; },
    createOverlays: () => overlay, createEcho: () => ({ draw: noop }), createOnboarding: () => ({ open: false }),
    document, window: { innerHeight: 800, addEventListener: noop, scrollTo: noop },
    getComputedStyle: () => ({ getPropertyValue: () => '' }), performance: { now: () => now },
    setTimeout: (fn, delay) => { const id = ++timerId; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout: (id) => timers.delete(id), setInterval: noop,
  });
  const source = readFileSync(new URL('../../src/game.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
  vm.runInContext(source, context);
  return { node, document, overlay, api: context.window.cubeType, run: (code) => vm.runInContext(code, context),
    profileChange: () => context.profileChange(), get results() { return results; },
    advance(ms) { now += ms; for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); } },
    input(value, props) { node('#inp').value = ' ' + value; node('#inp').emit('input', props); },
    key(key, props) { document.emit('keydown', { key, ...props }); },
  };
}

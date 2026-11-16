import { load, save } from './storage.js';

export const DEFAULT_SETTINGS = {
  sound: true, names: false, words: 'steady', layout: 'full', view: 'UFR', mirror: 'auto', drillSet: 'faces', theme: 'soft',
};
export const THEMES = ['classic', 'soft', 'frost', 'daylight', 'arcade', 'studio'];
const VIEWS = ['UFR', 'UFL', 'UBR', 'UBL', 'DFR', 'DFL', 'DBR', 'DBL'];
const SETTING_VALUES = {
  sound: [true, false], names: [true, false], words: ['steady', 'flux'], layout: ['full', 'focus'],
  view: VIEWS, mirror: ['auto', 'off', ...VIEWS], drillSet: ['faces', 'all'],
  theme: THEMES,
};
function parseSettings(raw) {
  return Object.fromEntries(Object.entries(DEFAULT_SETTINGS).map(([key, fallback]) =>
    [key, isObject(raw) && SETTING_VALUES[key].includes(raw[key]) ? raw[key] : fallback]));
}
const HISTORY_LIMIT = 2000;

const makeId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const cleanName = (name) => String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20) || 'player';
const newProfile = (name) => ({ id: makeId(), name: cleanName(name), created: Date.now(), onboarded: false, settings: { ...DEFAULT_SETTINGS }, records: [] });

// Storage is outside input: parse it here, once, so the rest of the game can trust a profile's shape.
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const MODES = ['sprint', 'zen', 'drill'];
const numbersOf = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => typeof v === 'number' && Number.isFinite(v)));

// Required fields match the records emitted by each mode; ratios are in [0, 1].
const RECORD_FIELDS = {
  sprint: ['time', 'wpm', 'acc', 'finesse', 'faults', 'turns'],
  zen: ['time', 'wpm', 'acc', 'finesse', 'turns', 'solves'],
  drill: ['time', 'wpm', 'acc', 'done', 'rate', 'streak', 'misses'],
};
const COUNTS = ['faults', 'turns', 'solves', 'done', 'streak', 'misses'];
function parseRecord(r) {
  if (!isObject(r) || !MODES.includes(r.mode)) return null;
  for (const key of RECORD_FIELDS[r.mode]) {
    const v = r[key];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return null;
    if (['acc', 'finesse'].includes(key) && v > 1) return null;
    if (COUNTS.includes(key) && !Number.isSafeInteger(v)) return null;
  }
  const rec = { ...numbersOf(r), mode: r.mode };
  if (isObject(r.segments)) rec.segments = Object.fromEntries(Object.entries(numbersOf(r.segments)).filter(([key, v]) => ['cross', 'f2l', 'oll', 'pll'].includes(key) && v >= 0 && v <= r.time));
  return rec;
}

function parseProfile(id, p) {
  if (!isObject(p)) return null;
  return {
    id,
    name: cleanName(typeof p.name === 'string' ? p.name : ''),
    created: typeof p.created === 'number' ? p.created : 0,
    onboarded: p.onboarded === true || p.played === true,
    settings: parseSettings(p.settings),
    records: Array.isArray(p.records) ? p.records.map(parseRecord).filter(Boolean) : [],
  };
}

// Parsed profiles from storage, or null when nothing usable is stored.
function readStored() {
  const raw = load('profiles', null);
  const parsed = Object.create(null);
  if (isObject(raw) && isObject(raw.profiles)) {
    for (const [id, p] of Object.entries(raw.profiles)) {
      const profile = parseProfile(id, p);
      if (profile) parsed[id] = profile;
    }
  }
  if (!Object.keys(parsed).length) return null;
  const active = isObject(raw) ? raw.active : undefined;
  return { active: typeof active === 'string' && Object.hasOwn(parsed, active) ? active : Object.keys(parsed)[0], profiles: parsed };
}

let data = readStored();
if (!data) {
  const first = newProfile('player');
  data = { active: first.id, profiles: { [first.id]: first } };
}
// After a failed save (storage full or blocked) memory is newer than storage, so don't re-read it.
let saved = true;
const persist = () => { saved = save('profiles', data); };
persist();

// Another tab may have saved since this one loaded. Every change starts from what is
// stored now, so two open tabs add to each other's runs instead of overwriting them.
// The tab keeps its own active profile unless the other tab deleted it.
function change(fn) {
  const stored = saved ? readStored() : null;
  if (stored) data = { active: Object.hasOwn(stored.profiles, data.active) ? data.active : stored.active, profiles: stored.profiles };
  const result = fn();
  persist();
  return result;
}

const listeners = [];
globalThis.addEventListener?.('storage', (e) => {
  if (e.key !== null && e.key !== 'cubetype:profiles') return;
  if (!saved) return; // Memory holds runs storage never got.
  const stored = readStored();
  if (!stored) return;
  data = { active: Object.hasOwn(stored.profiles, data.active) ? data.active : stored.active, profiles: stored.profiles };
  for (const fn of listeners) fn();
});

export const profiles = {
  list: () => Object.values(data.profiles).sort((a, b) => a.created - b.created),
  active: () => data.profiles[data.active],
  // Runs after another tab saves; the in-memory profiles are already fresh.
  onExternalChange(fn) { listeners.push(fn); },
  select(id) { change(() => { if (data.profiles[id]) data.active = id; }); },
  create(name) { return change(() => { const p = newProfile(name); data.profiles[p.id] = p; data.active = p.id; return p; }); },
  rename(id, name) { change(() => { if (data.profiles[id]) data.profiles[id].name = cleanName(name); }); },
  remove(id) {
    return change(() => {
      if (Object.keys(data.profiles).length <= 1 || !data.profiles[id]) return false;
      delete data.profiles[id];
      if (data.active === id) data.active = profiles.list()[0].id;
      return true;
    });
  },
  setting(key, value) { change(() => { profiles.active().settings[key] = value; }); },
  markOnboarded(done = true) { change(() => { profiles.active().onboarded = done; }); },
  addRecord(record) {
    change(() => {
      const recs = profiles.active().records;
      recs.push({ ...record, at: Date.now() });
      if (recs.length > HISTORY_LIMIT) recs.splice(0, recs.length - HISTORY_LIMIT);
    });
  },
};

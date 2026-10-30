import { load, save } from './storage.js';

export const DEFAULT_SETTINGS = {
  sound: true, names: false, words: 'steady', layout: 'full', view: 'UFR', mirror: 'auto', drillSet: 'faces', theme: 'soft',
};
const HISTORY_LIMIT = 2000;

const makeId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const cleanName = (name) => String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20) || 'player';
const newProfile = (name) => ({ id: makeId(), name: cleanName(name), created: Date.now(), onboarded: false, settings: { ...DEFAULT_SETTINGS }, records: [] });

// Storage is outside input: parse it here, once, so the rest of the game can trust a profile's shape.
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const MODES = ['sprint', 'zen', 'drill'];
const numbersOf = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => typeof v === 'number' && Number.isFinite(v)));

// A record keeps its mode (one of MODES), its segments and its other fields only when they are numbers.
function parseRecord(r) {
  if (!isObject(r) || !MODES.includes(r.mode)) return null;
  const rec = { ...numbersOf(r), mode: r.mode };
  if (isObject(r.segments)) rec.segments = numbersOf(r.segments);
  return rec;
}

function parseProfile(id, p) {
  if (!isObject(p)) return null;
  return {
    id,
    name: cleanName(typeof p.name === 'string' ? p.name : ''),
    created: typeof p.created === 'number' ? p.created : 0,
    onboarded: p.onboarded === true || p.played === true,
    settings: { ...DEFAULT_SETTINGS, ...(isObject(p.settings) ? p.settings : {}) },
    records: Array.isArray(p.records) ? p.records.map(parseRecord).filter(Boolean) : [],
  };
}

let data = load('profiles', null);
const parsed = Object.create(null);
if (isObject(data) && isObject(data.profiles)) {
  for (const [id, raw] of Object.entries(data.profiles)) {
    const p = parseProfile(id, raw);
    if (p) parsed[id] = p;
  }
}
if (!Object.keys(parsed).length) {
  const first = newProfile('player');
  parsed[first.id] = first;
}
const storedActive = isObject(data) ? data.active : undefined;
data = { active: Object.hasOwn(parsed, storedActive) ? storedActive : Object.keys(parsed)[0], profiles: parsed };
const persist = () => save('profiles', data);
persist();

export const profiles = {
  list: () => Object.values(data.profiles).sort((a, b) => a.created - b.created),
  active: () => data.profiles[data.active],
  select(id) { if (data.profiles[id]) { data.active = id; persist(); } },
  create(name) { const p = newProfile(name); data.profiles[p.id] = p; data.active = p.id; persist(); return p; },
  rename(id, name) { if (data.profiles[id]) { data.profiles[id].name = cleanName(name); persist(); } },
  remove(id) {
    if (Object.keys(data.profiles).length <= 1 || !data.profiles[id]) return false;
    delete data.profiles[id];
    if (data.active === id) data.active = profiles.list()[0].id;
    persist();
    return true;
  },
  setting(key, value) { profiles.active().settings[key] = value; persist(); },
  markOnboarded(done = true) { profiles.active().onboarded = done; persist(); },
  addRecord(record) {
    const recs = profiles.active().records;
    recs.push({ ...record, at: Date.now() });
    if (recs.length > HISTORY_LIMIT) recs.splice(0, recs.length - HISTORY_LIMIT);
    persist();
  },
};

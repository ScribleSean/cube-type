// Local profiles: each has a name, its own settings and a history of records.
import { load, save } from './storage.js';

export const DEFAULT_SETTINGS = {
  sound: true, names: false, words: 'steady', layout: 'full', view: 'UFR', mirror: 'auto', drillSet: 'faces',
};
const HISTORY_LIMIT = 2000;

const makeId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const cleanName = (name) => String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20) || 'player';
const newProfile = (name) => ({ id: makeId(), name: cleanName(name), created: Date.now(), onboarded: false, settings: { ...DEFAULT_SETTINGS }, records: [] });

let data = load('profiles', null);
if (!data || !data.profiles || !Object.keys(data.profiles).length) {
  const first = newProfile('player');
  data = { active: first.id, profiles: { [first.id]: first } };
}
for (const p of Object.values(data.profiles)) {
  p.settings = { ...DEFAULT_SETTINGS, ...p.settings };
  if (p.played) { p.onboarded = true; delete p.played; }
}
if (!data.profiles[data.active]) data.active = Object.keys(data.profiles)[0];
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

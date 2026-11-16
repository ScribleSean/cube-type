import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOnboarding } from '../src/ui/onboarding.js';

function setup(onboarded) {
  const sheet = { innerHTML: '' }, listeners = {};
  const root = { hidden: true, addEventListener(t, fn) { listeners[t] = fn; },
    querySelector: (sel) => (sel === '.sheet' ? sheet : { value: 'sam', focus() {} }) };
  let closed = 0;
  const profiles = { active: () => ({ id: 'p', name: 'sam', onboarded, settings: {} }), rename() {} };
  const ob = createOnboarding({ root, profiles, onDone() {}, onClose: () => closed++ });
  ob.start();
  const tap = (go) => listeners.click({ target: { closest: () => ({ dataset: { go } }) } });
  return { root, sheet, tap, get closed() { return closed; } };
}

// Phones have no Escape key.
test('a replayed intro has a close button that leaves it', () => {
  const s = setup(true);
  assert.match(s.sheet.innerHTML, /data-go="close"/);
  s.tap('close');
  assert.equal(s.root.hidden, true);
  assert.equal(s.closed, 1);
});

test('the first-run intro has no close button and cannot be tapped away', () => {
  const s = setup(false);
  assert.doesNotMatch(s.sheet.innerHTML, /data-go="close"/);
  s.tap('close');
  assert.equal(s.root.hidden, false);
});

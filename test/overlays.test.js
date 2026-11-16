import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOverlays } from '../src/ui/overlays.js';

// Minimal elements: enough for click delegation, which is all these tests exercise.
function el() {
  const listeners = {};
  return {
    hidden: true, listeners, classList: { toggle() {} }, closest: () => null,
    addEventListener(type, fn) { (listeners[type] ??= []).push(fn); },
    click(target, from = target) { for (const fn of listeners.pointerdown || []) fn({ target: from }); for (const fn of listeners.click || []) fn({ target }); },
  };
}
const target = (act) => ({ closest: (sel) => (act && sel === `[data-act="${act}"]` ? {} : null) });

function setup() {
  const results = el(), statsEl = el(), statsButton = el();
  let again = 0;
  const overlays = createOverlays({ results, resultsBody: {}, statsEl, statsBody: {}, statsButton,
    getProfile: () => ({ records: [] }), getAccent: () => '#fff', onAgain: () => again++ });
  return { overlays, results, statsEl, get again() { return again; } };
}

test('the results sheet has its own go-again button', () => {
  const s = setup();
  s.results.click(target(null));
  assert.equal(s.again, 0, 'a tap on the sheet started a new game');
  s.results.click(target('again'));
  assert.equal(s.again, 1);
});

// The sheet covers the stats button and phones have no Escape.
test('stats closes from its close button or a tap outside the sheet, not a tap inside it', () => {
  const s = setup();
  s.statsEl.hidden = false;
  s.statsEl.click(target(null));
  assert.equal(s.statsEl.hidden, false, 'a tap inside the sheet closed it');
  s.statsEl.click(target('close'));
  assert.equal(s.statsEl.hidden, true);
  s.statsEl.hidden = false;
  s.statsEl.click(s.statsEl, target(null));
  assert.equal(s.statsEl.hidden, false, 'a drag from the sheet onto the backdrop closed it');
  s.statsEl.click(s.statsEl);
  assert.equal(s.statsEl.hidden, true, 'a tap on the backdrop left it open');
});

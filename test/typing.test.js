import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addLetter, goodLength, missedLetters, MAX_TYPED } from '../src/typing.js';

const typeAll = (text, candidates) => {
  let typed = '', errors = 0, slips = 0;
  for (const ch of text) {
    const step = addLetter(typed, ch, candidates);
    if (!step) break;
    typed = step.typed;
    if (!step.ok) errors++;
    if (step.firstSlip) slips++;
  }
  return { typed, errors, slips };
};

test('a wrong letter is kept, never dropped', () => {
  const step = addLetter('ru', 'x', ['rush']);
  assert.equal(step.typed, 'rux');
  assert.equal(step.ok, false);
});

test('letters after a slip are kept as typed, never corrected', () => {
  const r = typeAll('rxsh', ['rush']);
  assert.equal(r.typed, 'rxsh');
  assert.equal(goodLength(r.typed, ['rush']), 1);
  assert.equal(r.errors, 3, 'every letter after the slip is wrong until the slip is deleted');
  assert.equal(r.slips, 1, 'a word counts one miss, at its first wrong letter');
});

test('a letter is right if any candidate on screen starts with the typed letters', () => {
  assert.equal(typeAll('ro', ['rush', 'roam']).errors, 0);
  assert.equal(goodLength('roz', ['rush', 'roam']), 2);
});

test('the buffer stops at MAX_TYPED instead of dropping earlier letters', () => {
  const full = 'z'.repeat(MAX_TYPED);
  assert.equal(addLetter(full, 'a', ['rush']), null);
  assert.equal(typeAll('z'.repeat(MAX_TYPED + 5), ['rush']).typed, full);
});

test('moving past a word adds only the letters never typed', () => {
  assert.equal(missedLetters('rus', 'rush'), 1);
  assert.equal(missedLetters('rxsh', 'rush'), 0, 'its wrong letter was already counted when typed');
  assert.equal(missedLetters('rushhh', 'rush'), 0);
  assert.equal(missedLetters('', 'rush'), 4);
});

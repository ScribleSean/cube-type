import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyRoute, isControl, clickReturnsFocus } from '../src/keys.js';

test('tab while typing starts a new scramble', () => {
  assert.equal(keyRoute('Tab'), 'newGame');
});

test('shift+tab while typing moves to the menu bar', () => {
  assert.equal(keyRoute('Tab', { shift: true }), 'toNav');
});

test('tab and shift+tab on a menu button move between buttons', () => {
  assert.equal(keyRoute('Tab', { onControl: true }), 'native');
  assert.equal(keyRoute('Tab', { shift: true, onControl: true }), 'native');
});

test('enter and space on a menu button press it', () => {
  assert.equal(keyRoute('Enter', { onControl: true }), 'native');
  assert.equal(keyRoute(' ', { onControl: true }), 'native');
});

test('enter and space while typing stay with the game', () => {
  assert.equal(keyRoute('Enter'), 'game');
  assert.equal(keyRoute(' '), 'game');
});

test('letters on a menu button go back to the game', () => {
  assert.equal(keyRoute('r', { onControl: true }), 'game');
  assert.equal(keyRoute('Backspace', { onControl: true }), 'game');
});

const button = ({ panel = false } = {}) => ({ hasAttribute: (a) => a === 'aria-expanded' && panel });
const tag = (name) => ({ matches: (s) => s.split(', ').some((q) => q.split('[')[0] === name) });

test('a focused button counts as the menu, the game input does not', () => {
  const input = tag('input');
  assert.equal(isControl(tag('button'), input), true);
  assert.equal(isControl(input, input), false);
  assert.equal(isControl(tag('div'), input), false);
});

test('a mouse click on a setting hands focus back to the game', () => {
  assert.equal(clickReturnsFocus(button(), 1), true);
});

test('a click from enter or space keeps focus on the menu', () => {
  assert.equal(clickReturnsFocus(button(), 0), false);
});

test('a mouse click on a button that opens a panel keeps focus there', () => {
  assert.equal(clickReturnsFocus(button({ panel: true }), 1), false);
});

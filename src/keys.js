// Decides what a key press does before the game sees it.
// onControl: focus is on a button or field other than the game's own input.
// Returns 'newGame', 'toNav', 'native' (leave it to the browser) or 'game'.
export function keyRoute(key, { shift = false, onControl = false } = {}) {
  if (onControl && (key === 'Tab' || key === 'Enter' || key === ' ')) return 'native';
  if (key === 'Tab') return shift ? 'toNav' : 'newGame';
  return 'game';
}

export function isControl(el, input) {
  return !!el && el !== input && el.matches('button, a[href], input, select, textarea');
}

// A mouse click leaves focus on the button, so the next enter or space would press it
// again. Let go of it so the next key goes to the game, except for buttons that open a panel.
// detail is 0 when the click came from the keyboard.
export function clickReturnsFocus(button, detail) {
  return detail > 0 && !button.hasAttribute('aria-expanded');
}

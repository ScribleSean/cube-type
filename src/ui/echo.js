// The typed-letters line under the cube. Letters that match show in the accent color and
// letters that don't show in red. A rejected letter also flashes red for a moment.
export function createEcho(el) {
  let wrongTimer = null;
  const good = document.createElement('span'), bad = document.createElement('span'), flash = document.createElement('span'), caret = document.createElement('span');
  good.className = 'echo-typed';
  bad.className = 'echo-bad';
  flash.className = 'echo-bad';
  caret.className = 'echo-caret';
  el.append(good, bad, flash, caret);
  return {
    // `goodLength` letters of `buffer` are right; the rest stay red until deleted.
    draw(buffer, goodLength = buffer.length) {
      good.textContent = buffer.slice(0, goodLength);
      bad.textContent = buffer.slice(goodLength);
    },
    wrong(ch) {
      flash.textContent = ch;
      el.classList.remove('wrong'); void el.offsetWidth; el.classList.add('wrong');
      clearTimeout(wrongTimer);
      wrongTimer = setTimeout(() => { flash.textContent = ''; el.classList.remove('wrong'); }, 420);
    },
  };
}

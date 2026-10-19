// The typed-letters line under the cube. Shows what you have typed so far, and a wrong
// letter in red for a moment so mistakes are easy to see.
export function createEcho(el) {
  let wrongTimer = null;
  const typed = document.createElement('span'), bad = document.createElement('span'), caret = document.createElement('span');
  typed.className = 'echo-typed';
  bad.className = 'echo-bad';
  caret.className = 'echo-caret';
  el.append(typed, bad, caret);
  return {
    draw(buffer) { typed.textContent = buffer; },
    wrong(ch) {
      bad.textContent = ch;
      el.classList.remove('wrong'); void el.offsetWidth; el.classList.add('wrong');
      clearTimeout(wrongTimer);
      wrongTimer = setTimeout(() => { bad.textContent = ''; el.classList.remove('wrong'); }, 420);
    },
  };
}

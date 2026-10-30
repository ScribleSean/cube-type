export function createEcho(el) {
  const good = document.createElement('span'), bad = document.createElement('span'), caret = document.createElement('span');
  good.className = 'echo-typed';
  bad.className = 'echo-bad';
  caret.className = 'echo-caret';
  el.append(good, bad, caret);
  return {
    draw(buffer, goodLength = buffer.length) {
      good.textContent = buffer.slice(0, goodLength);
      bad.textContent = buffer.slice(goodLength);
    },
  };
}

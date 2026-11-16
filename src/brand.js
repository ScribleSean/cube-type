// Logo marks. ?logo=<name> previews one. Marks take their
// colors from the theme's stage variables, so every theme works with every mark.
const MARKS = {
  cube: '<g stroke-linejoin="round" stroke-width="1.6"><polygon points="16,4.08 25.82,9.75 16,15.42 6.18,9.75" style="fill:var(--stage-1);stroke:var(--stage-1)"/><polygon points="5.24,11.37 15.06,17.04 15.06,28.38 5.24,22.71" style="fill:var(--stage-0);stroke:var(--stage-0)"/><polygon points="16.94,17.04 26.76,11.37 26.76,22.71 16.94,28.38" style="fill:var(--stage-2);stroke:var(--stage-2)"/></g>',
  caret: [0, 1, 2].flatMap((row) => [0, 1, 2].map((col) => (row === 2 && col === 2
    ? '<rect x="24.75" y="21" width="2.5" height="10" rx="1.25" style="fill:var(--text)"/>'
    : `<rect x="${2 + col * 10}" y="${2 + row * 10}" width="8" height="8" rx="2" style="fill:var(--stage-${row})"/>`))).join(''),
  turn: '<path d="M22.43 8.34A10 10 0 1 0 24.48 21.3" fill="none" stroke-width="4.6" stroke-linecap="round" style="stroke:var(--text)"/><polygon points="27.4,16.63 28.38,23.74 20.58,18.86" stroke-width="1.6" stroke-linejoin="round" style="fill:var(--stage-2);stroke:var(--stage-2)"/><rect x="12.75" y="12.75" width="6.5" height="6.5" rx="1.6" style="fill:var(--stage-1)"/>',
};
export const LOGOS = ['text', ...Object.keys(MARKS)];

export function logoFromUrl(search) {
  const name = new URLSearchParams(search).get('logo');
  return LOGOS.includes(name) ? name : 'text';
}

const svg = (body, attrs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"${attrs}>${body}</svg>`;

export function markSvg(name) {
  return MARKS[name] ? svg(MARKS[name], ' class="mark" aria-hidden="true"') : '';
}

// A favicon can't read page variables, so resolve them to the theme's current colors.
export function faviconUrl(name, color) {
  if (!MARKS[name]) return null;
  const body = MARKS[name].replace(/var\(--([a-z0-9-]+)\)/g, (_, v) => color(v));
  return 'data:image/svg+xml,' + encodeURIComponent(svg(body));
}

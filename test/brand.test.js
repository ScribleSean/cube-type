import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LOGOS, logoFromUrl, markSvg, faviconUrl } from '../src/brand.js';
import { THEMES } from '../src/profiles.js';
import { THEME_SWATCHES, CHOICES } from '../src/ui/onboarding.js';

test('logo preview comes only from a known ?logo= value', () => {
  assert.equal(logoFromUrl(''), 'text');
  assert.equal(logoFromUrl('?logo=caret'), 'caret');
  assert.equal(logoFromUrl('?logo=<script>'), 'text');
  assert.deepEqual(LOGOS, ['text', 'cube', 'caret', 'turn']);
});

test('every mark is themed by variables and becomes a self-contained favicon', () => {
  assert.equal(markSvg('text'), '');
  assert.equal(faviconUrl('text', () => '#000'), null);
  for (const name of LOGOS.slice(1)) {
    assert.match(markSvg(name), /var\(--stage-\d\)/);
    const icon = decodeURIComponent(faviconUrl(name, () => '#123456'));
    assert.doesNotMatch(icon, /var\(/, name);
    assert.match(icon, /#123456/);
  }
});

// A theme added in one place but not the others shows up unstyled or missing from the intro.
test('every theme has a stylesheet block, an intro option and a swatch', () => {
  const css = readFileSync('styles.css', 'utf8');
  const intro = CHOICES.find((c) => c.key === 'theme').options.map((o) => o.value);
  for (const theme of THEMES) {
    assert.match(css, new RegExp(`:root\\[data-theme="${theme}"\\] \\{[^}]*--stage-2:`), theme);
    assert.ok(THEME_SWATCHES[theme], theme);
  }
  assert.deepEqual([...intro].sort(), [...THEMES].sort());
});

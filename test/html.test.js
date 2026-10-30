import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { escapeHtml } from '../src/html.js';

test('escapeHtml escapes markup and accepts any value', () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  assert.equal(escapeHtml(42), '42');
  assert.equal(escapeHtml(null), '');
});

// One escaper: local copies drift (one threw on non-strings, one only stripped <>&).
test('no source file defines its own HTML escaper', () => {
  const files = (dir) => readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith('.js') ? [join(dir, e.name)] : []));
  const escaper = /\.replace\(\/\[[^\]]*[<>][^\]]*\]/;
  const offenders = files('src').filter((f) => f !== join('src', 'html.js') && escaper.test(readFileSync(f, 'utf8')));
  assert.deepEqual(offenders, [], `import { escapeHtml } from src/html.js instead of escaping by hand in: ${offenders.join(', ')}`);
});

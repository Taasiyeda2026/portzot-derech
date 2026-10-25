import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';

const css = await readFile(new URL('../inspiration.css', import.meta.url), 'utf8');

test('all closed cards use the single uploaded shared card-back design', async () => {
  const file = new URL('../cards/shared-back.png', import.meta.url);
  const info = await stat(file);
  assert.ok(info.isFile() && info.size > 1000, 'shared-back.png must be available');
  assert.match(css, /\.card-back\{[^}]+url\(['"]?\.\/cards\/shared-back\.png['"]?\)/s);
  assert.match(css, /\.card-back span\{[^}]+background:/s, 'card number remains legible');
  const taken = css.match(/\.card-back\.taken\{([^}]+)\}/);
  assert.ok(taken && !/\bbackground\s*:/.test(taken[1]), 'selected cards must retain the shared background');
});

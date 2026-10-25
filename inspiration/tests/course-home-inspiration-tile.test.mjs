import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../../strongermenu-2026.html', import.meta.url), 'utf8');
const icon = await readFile(new URL('../../icon/inspiration-cards.svg', import.meta.url), 'utf8');

test('inspiration game is one of the seven matching home menu cards, not a footer text link', () => {
  const grid = html.match(/<section class="menu-grid">([\s\S]*?)<\/section>/)?.[1];
  assert.ok(grid, 'home menu grid must exist');
  assert.equal((grid.match(/class="menu-item"/g) || []).length, 7);
  assert.equal((grid.match(/href="inspiration\/home\.html"/g) || []).length, 1);
  assert.match(grid, /<a class="menu-item" href="inspiration\/home\.html">\s*<h4>נושמות השראה<\/h4>\s*<p>משחק הקלפים הקבוצתי<\/p>/);
  const closing = html.match(/<section class="closing">([\s\S]*?)<\/section>/)?.[1];
  assert.ok(closing);
  assert.doesNotMatch(closing, /inspiration\/home\.html|נושמות השראה/);
});

test('tile styling matches its neighbors and remains responsive', () => {
  assert.match(html, /\.menu-grid\s*\{[^}]*grid-template-columns:repeat\(7, 1fr\)/s);
  assert.match(html, /@media \(max-width:640px\)[\s\S]*?\.menu-grid\s*\{[^}]*grid-template-columns:repeat\(3, 1fr\)/);
  assert.match(html, /<img src="icon\/inspiration-cards\.svg" alt="קלפי השראה"/);
  assert.equal((html.match(/<span class="proc-arr">/g)||[]).length, 6);
  assert.match(icon, /<svg[\s\S]*viewBox="0 0 96 96"/);
});

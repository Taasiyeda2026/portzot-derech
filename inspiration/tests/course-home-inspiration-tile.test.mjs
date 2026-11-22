import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../../strongermenu-2026.html', import.meta.url),'utf8');
const management = await readFile(new URL('../../management.html', import.meta.url),'utf8');
const icon = await readFile(new URL('../../icon/inspiration-cards.svg', import.meta.url),'utf8');

test('five course stages link to a separate management shell containing inspiration', () => {
  const grid = html.match(/<section class="menu-grid">([\s\S]*?)<\/section>/)?.[1];
  assert.ok(grid);
  assert.equal((grid.match(/class="menu-item"/g)||[]).length,5);
  const tiles = [...grid.matchAll(/<(?:a|button)\b[^>]*class="menu-item"[^>]*>/g)].map(match=>match[0]);
  assert.equal(tiles.length,5);
  assert.match(tiles[0], /href="start\/quiz\.html"/);
  assert.match(tiles[1], /href="domains\/alldomains\.html"/);
  assert.match(management, /<h4>נושמות השראה<\/h4>/);
  assert.match(html, /href="management\.html"/);
  assert.doesNotMatch(html, /id="inspiration-dialog"/);
  assert.doesNotMatch(grid, /href="inspiration\/index\.html"/);
  const closing=html.match(/<section class="closing">([\s\S]*?)<\/section>/)?.[1];
  assert.ok(closing);
  assert.doesNotMatch(closing, /inspiration\/home\.html|נושמות השראה/);
});

test('tile styling matches the course menu on desktop and mobile',()=>{
  assert.match(html,/\.menu-grid\s*\{[^}]*grid-template-columns:repeat\(5, 1fr\)/s);
  assert.match(html,/@media \(max-width:640px\)[\s\S]*?\.menu-grid\s*\{[^}]*grid-template-columns:repeat\(3, 1fr\)/);
  assert.match(management,/<img src="icon\/inspiration-cards\.svg"/);
  assert.equal((html.match(/<span class="proc-arr">/g)||[]).length,4);
  assert.match(icon,/<svg[\s\S]*viewBox="0 0 96 96"/);
});

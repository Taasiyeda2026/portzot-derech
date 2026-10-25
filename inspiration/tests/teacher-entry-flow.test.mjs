import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const load = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('course tile opens only the instructor workspace', async () => {
  const menu = await load('../../strongermenu-2026.html');
  assert.match(menu, /id="inspiration-entry"/);
  assert.match(menu, /id="inspiration-dialog"/);
  assert.match(menu, /id="inspiration-teacher-auth"/);
  assert.match(menu, /id="inspiration-teacher-workspace"/);
  assert.match(menu, /id="inspiration-teacher-form"/);
  assert.match(menu, /id="inspiration-participant-count"/);
  assert.match(menu, /id="inspiration-room-qr"/);
  assert.match(menu, /src="\.\/inspiration\/teacher-entry\.js"/);
  assert.match(menu, /src="\.\/inspiration\/vendor\/qrcode\.js"/);
  assert.doesNotMatch(menu, /id="inspiration-join-form"/);
  assert.doesNotMatch(menu, /id="inspiration-player-name"/);
  assert.doesNotMatch(menu, /id="inspiration-room-code"/);
  assert.doesNotMatch(menu, /sessionStorage\.setItem\('inspiration:join-intent'/);
});

test('opening a room requires a dashboard account with teacher permissions', async () => {
  const script = await load('../teacher-entry.js');
  assert.match(script, /dashboardLogin\(\)/);
  assert.match(script, /api\('teacher\.me'\)/);
  assert.match(script, /!profile\?\.can_manage && !profile\?\.is_admin/);
  assert.match(script, /api\('teacher\.catalog'\)/);
  assert.match(script, /api\('teacher\.create', \{ expected \}\)/);
  assert.match(script, /sessionStorage\.getItem\(tokenKey\)/);
});

test('teacher gets a shareable link and QR after room creation', async () => {
  const script = await load('../teacher-entry.js');
  const teacher = await load('../teacher.js');
  assert.match(script, /new URL\('\.\/inspiration\/index\.html', location\.href\)/);
  assert.match(script, /url\.searchParams\.set\('code', code\)/);
  assert.match(script, /globalThis\.qrcode\(0, 'M'\)/);
  assert.match(script, /navigator\.clipboard\.writeText\(roomLink\.href\)/);
  assert.match(script, /inspiration\/teacher\.html\?room=/);
  assert.match(teacher, /api\('teacher\.create'/);
  assert.match(teacher, /class:'qr-wrap'/);
  assert.doesNotMatch(teacher, /class:'join-code'/);
});

test('participants arrive from invitation QR, enter their name and choose a card', async () => {
  const participant = await load('../participant.js');
  assert.match(participant, /new URL\(location\.href\)\.searchParams\.get\('code'\)/);
  assert.match(participant, /api\('participant\.join'/);
  assert.match(participant, /api\('participant\.claim'/);
  assert.match(participant, /cardViewer\(card,token\)/);
});

test('course page is not replaced by a hidden fallback login panel', async () => {
  const common = await load('../common.js');
  assert.match(common, /if \(!target \|\| target\.querySelector\('\[data-login-panel\]'\)\) return;/);
});

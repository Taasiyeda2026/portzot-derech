import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const load = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('course tile opens only the instructor workspace', async () => {
  const menu = await load('../../strongermenu-2026.html');
  assert.match(menu, /id="inspiration-entry"/);
  assert.match(menu, /id="inspiration-dialog"/);
  assert.match(menu, /id="inspiration-teacher-auth"/);
  assert.match(menu, /id="inspiration-auth-status"/);
  assert.match(menu, /id="inspiration-teacher-entry"[^>]*hidden/);
  assert.doesNotMatch(menu, /התחברות עם חשבון תעשיידע/);
  assert.match(menu, /id="inspiration-teacher-workspace"/);
  assert.match(menu, /id="inspiration-teacher-form"/);
  assert.match(menu, /id="inspiration-participant-count"/);
  assert.match(menu, /id="inspiration-room-qr"/);
  assert.match(menu, /src="\.\/inspiration\/teacher-entry\.js"/);
  assert.match(menu, /src="\.\/inspiration\/vendor\/qrcode\.js"/);
  assert.doesNotMatch(menu, /id="inspiration-join-form"/);
  assert.doesNotMatch(menu, /id="inspiration-player-name"/);
  assert.doesNotMatch(menu, /id="inspiration-room-code"/);
  assert.doesNotMatch(menu, /id="inspiration-room-link"/);
  assert.doesNotMatch(menu, /כמה משתתפות יהיו במשחק\\?/);
  assert.doesNotMatch(menu, /id="inspiration-copy-room"/);
  assert.match(menu, /id="inspiration-manage-room"/);
  assert.doesNotMatch(menu, /sessionStorage\.setItem\('inspiration:join-intent'/);
});

test('opening a room requires a dashboard account with teacher permissions', async () => {
  const script = await load('../teacher-entry.js');
  assert.match(script, /dashboardLogin\(\)/);
  assert.match(script, /entry\\.addEventListener\\('click', \\(\\) => openDialog\\(true\\)\\)/);
  assert.match(script, /if \\(sessionStorage\\.getItem\\(tokenKey\\)\\)/);
  assert.match(script, /void connectDashboard\\(\\)/);
  assert.match(script, /openDialog\\(false\\)/);
  assert.match(script, /showConnecting\\(\\)/);
  assert.match(script, /api\('teacher\.me'\)/);
  assert.match(script, /!profile\?\.can_manage && !profile\?\.is_admin/);
  assert.match(script, /api\('teacher\.catalog'\)/);
  assert.match(script, /api\('teacher\.create', \{ expected \}\)/);
  assert.match(script, /sessionStorage\.getItem\(tokenKey\)/);
});

test('teacher gets compact QR and icon controls without exposing a room URL as text', async () => {
  const script = await load('../teacher-entry.js');
  const teacher = await load('../teacher.js');
  const invite = await load('../invite-tools.js');
  assert.match(script, /new URL\\('\\.\\/inspiration\\/index\\.html', location\\.href\\)/);
  assert.match(script, /url\\.searchParams\\.set\\('code', code\\)/);
  assert.match(script, /createInviteTools\\(invitationUrl, showError\\)/);
  assert.match(script, /inspiration\\/teacher\\.html\\?room=/);
  assert.match(teacher, /api\\('teacher\\.create'/);
  assert.match(teacher, /createInviteTools\\(roomLink\\(room\\)/);
  assert.doesNotMatch(teacher, /class:'join-link'|class:'join-code'/);
  assert.match(invite, /createSvgTag/);
  assert.match(invite, /zoomQR/);
  assert.match(invite, /downloadQR/);
  assert.match(invite, /navigator\\.clipboard\\.writeText\\(inviteUrl\\)/);
  assert.match(invite, /https:\\/\\/wa\\.me\\/\\?text=/);
  assert.match(invite, /mailto:/);
  const menu = await load('../../strongermenu-2026.html');
  assert.doesNotMatch(menu, /id="inspiration-room-link"|id="inspiration-copy-room"/);
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

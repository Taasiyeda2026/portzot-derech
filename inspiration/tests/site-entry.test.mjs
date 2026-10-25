import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const file = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('course website enters the game site and never starts a participant without a room code', async () => {
  const menu = await file('../../strongermenu-2026.html');
  const landing = await file('../home.html');
  assert.match(menu, /href="inspiration\/home\.html"/);
  assert.doesNotMatch(menu, /href="inspiration\/index\.html"/);
  assert.match(landing, /href="\.\/admin\.html"/);
  assert.match(landing, /href="\.\/teacher\.html"/);
  assert.match(landing, /src="\.\.\/icon\/logo\.png"/);
  assert.match(landing, /נושמות השראה/);
  assert.match(landing, /כניסה למדריכה/);
  assert.match(landing, /לוח ניהול המשחק/);
  assert.doesNotMatch(landing, /הדשבורד|טכני|חשבון|קוד ה־QR|סריקת קוד|מספר משתתפות/);
  assert.doesNotMatch(landing, /כניסה למשתתפות/);
  assert.doesNotMatch(landing, /https:\/\/taasiyeda2026\.github\.io\/dashboard_system\/\?route=/);
});

test('course admin is authenticated through the existing dashboard bridge, then links to rooms and QR', async () => {
  const admin = await file('../admin.html');
  const common = await file('../common.js');
  assert.match(admin, /data-page="admin"/);
  assert.match(admin, /ניהול משחקים והצגת QR/);
  assert.match(admin, /href="\.\/teacher\.html"/);
  assert.match(common, /loginPanel/);
  assert.match(common, /dashboardLogin/);
  assert.match(common, /inspiration-bridge\.html/);
  assert.match(common, /לוח האדמין של המשחק/);
});

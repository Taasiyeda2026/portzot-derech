import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');

test('course tile only opens the instructor SSO dialog, not a game form',async()=>{
  const menu=await read('../../strongermenu-2026.html');
  assert.match(menu,/id="inspiration-entry"/);
  assert.match(menu,/id="inspiration-dialog"/);
  assert.match(menu,/id="inspiration-teacher-auth"/);
  assert.doesNotMatch(menu,/id="inspiration-teacher-workspace"/);
  assert.doesNotMatch(menu,/id="inspiration-participant-count"/);
  assert.doesNotMatch(menu,/id="inspiration-room-qr"/);
  assert.doesNotMatch(menu,/id="inspiration-join-form"/);
  assert.doesNotMatch(menu,/id="inspiration-player-name"/);
});

test('participants enter from QR invitation without a second code field',async()=>{
  const participant=await read('../participant.js');
  assert.match(participant,/new URL\(location\.href\)\.searchParams\.get\('code'\)/);
  assert.match(participant,/api\('participant.join'/);
  assert.doesNotMatch(participant,/inspiration:join-intent/);
  assert.match(participant,/code\?\[\]:\[field\('קוד החדר',roomCode\)\]/);
});

test('instructor SSO still verifies server permission before redirecting',async()=>{
  const common=await read('../common.js');
  const entry=await read('../teacher-entry.js');
  assert.match(common,/dashboard_system\/inspiration-bridge\.html/);
  assert.match(common,/event\.origin!==DASHBOARD_ORIGIN/);
  assert.match(entry,/api\('teacher.me'\)/);
  assert.match(entry,/if \(!profile\?\.can_manage && !profile\?\.is_admin\)/);
  assert.match(entry,/location\.assign\(url\.href\)/);
});

test('staff fallback login does not delete admin workspace',async()=>{
  const common=await read('../common.js');
  assert.match(common,/document\.querySelector\('#auth-panel'\)\|\|main/);
  assert.doesNotMatch(common,/ההזדהות מתבצעת בחלון הדשבורד/);
  assert.doesNotMatch(common,/אין צורך להזין סיסמה נוספת/);
});

test('participant symbol remains on printed card artwork',async()=>{
  const participant=await read('../participant.js');
  assert.doesNotMatch(participant,/symbol-badge/);
  assert.match(participant,/viewer=cardViewer\(card,token\)/);
});

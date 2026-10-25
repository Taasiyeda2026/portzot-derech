import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=(path)=>readFile(new URL(path,import.meta.url),'utf8');

test('course tile opens the instructor-only dialog',async()=>{
  const menu=await read('../../strongermenu-2026.html');
  assert.match(menu,/id="inspiration-entry"/);
  assert.match(menu,/id="inspiration-dialog"/);
  assert.match(menu,/id="inspiration-teacher-workspace"/);
  assert.match(menu,/id="inspiration-participant-count"/);
  assert.match(menu,/id="inspiration-room-qr"/);
  assert.doesNotMatch(menu,/id="inspiration-join-form"/);
  assert.doesNotMatch(menu,/id="inspiration-player-name"/);
  assert.doesNotMatch(menu,/sessionStorage\\.setItem\\('inspiration:join-intent'/);
});

test('participants enter from QR invitation without a second code field',async()=>{
  const participant=await read('../participant.js');
  assert.match(participant,/new URL\\(location\\.href\\)\\.searchParams\\.get\\('code'\\)/);
  assert.match(participant,/api\\('participant.join'/);
  assert.doesNotMatch(participant,/inspiration:join-intent/);
  assert.match(participant,/code\\?\\[\\]\\s*:\\s*\\[field\\('קוד החדר',roomCode\\)\\]/);
});

test('teacher login uses dashboard bridge and protected server identity',async()=>{
  const common=await read('../common.js');
  assert.match(common,/dashboard_system\/inspiration-bridge\.html/);
  assert.match(common,/event\.origin!==DASHBOARD_ORIGIN/);
  assert.match(common,/api\('teacher.me'\)/);
});

test('staff fallback login no longer deletes admin workspace',async()=>{
  const common=await read('../common.js');
  assert.match(common,/document\.querySelector\('#auth-panel'\)\|\|main/);
  assert.doesNotMatch(common,/ההזדהות מתבצעת בחלון הדשבורד/);
  assert.doesNotMatch(common,/אין צורך להזין סיסמה נוספת/);
});

test('participant secret symbol is only printed on card artwork',async()=>{
  const participant=await read('../participant.js');
  assert.doesNotMatch(participant,/symbol-badge/);
  assert.match(participant,/viewer=cardViewer\(card,token\)/);
});

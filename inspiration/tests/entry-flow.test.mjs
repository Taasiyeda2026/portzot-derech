import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=(path)=>readFile(new URL(path,import.meta.url),'utf8');

test('course tile opens one entry dialog instead of an intermediate page',async()=>{
  const menu=await read('../../strongermenu-2026.html');
  assert.match(menu,/id="inspiration-entry"/);
  assert.match(menu,/id="inspiration-dialog"/);
  assert.match(menu,/dialog\.showModal\(\)/);
  assert.doesNotMatch(menu,/class="menu-item" href="inspiration\/home\.html"/);
  assert.match(menu,/id="inspiration-player-name"/);
  assert.match(menu,/id="inspiration-room-code"/);
  assert.match(menu,/sessionStorage\.setItem\('inspiration:join-intent'/);
  assert.match(menu,/dashboardLogin\(\)/);
});

test('participants can join from course entry without repeating the form',async()=>{
  const participant=await read('../participant.js');
  assert.match(participant,/sessionStorage\.getItem\('inspiration:join-intent'\)/);
  assert.match(participant,/api\('participant.join',\{code,name:intent\.name\.trim\(\),join_key:joinKey\}\)/);
  assert.match(participant,/sessionStorage\.removeItem\('inspiration:join-intent'\)/);
  assert.match(participant,/joinScreen\(intent\.name\.trim\(\)\)/);
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

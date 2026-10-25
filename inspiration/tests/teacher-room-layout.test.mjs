import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');

test('teacher room uses a four-step progress track and an inline status strip',async()=>{
  const code=await read('../teacher.js');
  const css=await read('../inspiration.css');
  assert.match(code,/teacher-phase-track/);
  assert.match(code,/teacher-status-strip/);
  assert.match(code,/teacher-room-overview/);
  assert.match(code,/\['waiting','choosing','matching','activity'\]/);
  assert.doesNotMatch(code,/class:'stat-grid'/);
  assert.match(css,/#app\.teacher-room-view\{max-width:1000px/);
  assert.match(css,/\.teacher-room-title h1/);
  assert.match(css,/\.teacher-phase-track/);
  assert.match(css,/@media\(max-width:460px\)/);
});

test('teacher QR and roster share one compact card with no tall empty state',async()=>{
  const code=await read('../teacher.js');
  assert.match(code,/row,roster\(players,cards,room\)/);
  assert.match(code,/createInviteTools\(roomLink\(room\)/);
  assert.match(code,/ממתינות להצטרפות המשתתפות/);
  assert.doesNotMatch(code,/class:'empty'},'מחכות למשתתפת הראשונה/);
  const css=await read('../inspiration.css');
  assert.match(css,/\.teacher-invitation \.invite-qr-thumb/);
  assert.match(css,/\.teacher-invitation \.invite-actions/);
});

test('matching map is collapsible and tracks individual expanded state',async()=>{
  const code=await read('../teacher.js');
  const css=await read('../inspiration.css');
  assert.match(code,/id:'teacher-match-map'/);
  assert.match(code,/mapExpanded===null/);
  assert.match(code,/if\(map\.isConnected\)mapExpanded=map\.open/);
  assert.match(css,/\.teacher-match-map \.teacher-match-grid\{padding:0 20px 19px;grid-template-columns:repeat\(5/);
  assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test('instructor cannot create manual participants or assign cards manually',async()=>{
  const code=await read('../teacher.js');
  assert.doesNotMatch(code,/teacher\.manual_join|teacher\.manual_claim/);
  assert.doesNotMatch(code,/הוספת משתתפת ידנית|הקצאה ידנית|משתתפת ללא טלפון/);
  assert.match(code,/teacher\.resize/);
  assert.match(code,/teacher\.player_update/);
  assert.match(code,/teacher\.player_remove/);
});

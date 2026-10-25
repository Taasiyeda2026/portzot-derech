import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');

test('teacher home shows only creation and active rooms',async()=>{
  const src=await read('../teacher.js');
  assert.match(src,/teacher-home-create/);
  assert.match(src,/teacher-home-rooms/);
  assert.match(src,/api\('teacher\.create',\{expected:count\}\)/);
  assert.match(src,/api\('teacher\.rooms'\)/);
  assert.match(src,/room\.phase!=='ended'/);
  assert.doesNotMatch(src,/מכינות משחק|סיפור אחד פותח חיבור חדש/);
  assert.doesNotMatch(src,/למספר זוגי|למספר אי־זוגי|אין ניקוד ואין דירוג/);
});

test('number-of-participants field is reduced by 70 percent on desktop and mobile',async()=>{
  const css=await read('../inspiration.css');
  assert.match(css,/\.teacher-new-game-form label\{flex:0 1 30%;width:30%;max-width:190px;/);
  assert.match(css,/@media\(max-width:600px\)[\s\S]*?\.teacher-new-game-form label\{flex-basis:30%;width:30%;/);
  assert.match(css,/\.teacher-room-row\{/);
});

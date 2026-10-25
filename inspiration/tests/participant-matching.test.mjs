import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const file=p=>readFile(new URL(p,import.meta.url),'utf8');

test('matching validates partner card numbers server-side and persists confirmation',async()=>{
 const participant=await file('../participant.js');
 assert.match(participant,/api\('participant.verify_match',\{numbers\},\{token\}\)/);
 assert.match(participant,/group_size===3\?2:1/);
 assert.match(participant,/MATCH_INCORRECT/);
 assert.match(participant,/MATCH_NOT_READY/);
 assert.match(participant,/progress\.verified/);
 assert.match(participant,/progress\.confirmed/);
});
test('reflection hint stays hidden until a validated match and requires confirmation',async()=>{
 const participant=await file('../participant.js');
 assert.match(participant,/חומר למחשבה ✨/);
 assert.match(participant,/לפעמים החיבור בין שני סיפורים מסתתר דווקא בפרטים הקטנים/);
 assert.match(participant,/אין תשובה אחת נכונה/);
 assert.match(participant,/progress\.hint/);
 assert.match(participant,/רמז ✨/);
 assert.match(participant,/api\('participant.confirm_activity',\{\}, \{token\}\)/);
 assert.match(participant,/מפצחות את הקוד/);
 assert.ok(participant.indexOf("if(progress.confirmed)")<participant.indexOf("else if(progress.verified)"));
});

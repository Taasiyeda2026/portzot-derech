import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');

test('only correct paired card numbers reveal the hint',async()=>{
  const migration=await read('../../supabase/migrations/20261025192000_inspiration_matching_hints_and_independent_progress.sql');
  assert.ok(migration.includes('MATCH_INCORRECT'));
  assert.ok(migration.includes('own_card.group_size-1'));
  assert.ok(migration.includes('array_agg(number ORDER BY number)'));
  assert.ok(migration.includes('match_verified_at'));
  assert.ok(migration.includes('activity_confirmed_at'));
  assert.ok(migration.includes("IF p.match_verified_at IS NULL THEN RAISE EXCEPTION 'MATCH_NOT_VERIFIED'"));
  assert.ok(migration.includes("CASE WHEN p.match_verified_at IS NOT NULL"));
  assert.ok(migration.includes("IF supplied IS DISTINCT FROM expected"));
});

test('sixteen fixed teacher hints stay in Supabase rather than in the website bundle',async()=>{
  const migration=await read('../../supabase/migrations/20261025192000_inspiration_matching_hints_and_independent_progress.sql');
  const participant=await read('../participant.js');
  assert.ok(migration.includes('שלוש נשים, שלושה עולמות שונים'));
  assert.ok(migration.includes('האם הכללים תמיד הוגנים לכולן'));
  assert.ok(migration.includes('IF n<>16'));
  assert.ok(!participant.includes('שלוש נשים, שלושה עולמות שונים'));
  assert.ok(participant.includes('progress.hint'));
});

test('pair/trio form and independent continuation are participant-controlled',async()=>{
  const participant=await read('../participant.js');
  for(const phrase of [
    "progress?.group_size===3?2:1",
    "api('participant.verify_match',{numbers},{token})",
    "api('participant.confirm_activity',{}, {token})",
    "חומר למחשבה ✨",
    "לפעמים החיבור בין שני סיפורים מסתתר דווקא בפרטים הקטנים.",
    "אין תשובה אחת נכונה.",
    "המשך ואישור",
    "מפצחות את הקוד",
    "רמז ✨"
  ]) assert.ok(participant.includes(phrase),phrase);
  assert.ok(!participant.includes('הכירי את הסיפור והביטי בסמל'));
});

test('gateway projects only verified hint, never pre-verified symbol or pair map',async()=>{
  const handler=await read('../../supabase/functions/inspiration-game/handler.mjs');
  assert.ok(handler.includes("'participant.verify_match'"));
  assert.ok(handler.includes("'participant.confirm_activity'"));
  assert.ok(handler.includes("hint: data?.progress?.verified === true"));
  assert.ok(!handler.includes("symbol: card.symbol"));
});

test('teacher monitors aggregate progress without controlling each participant next step',async()=>{
  const teacher=await read('../teacher.js');
  assert.ok(teacher.includes('stats.verified'));
  assert.ok(teacher.includes('stats.continued'));
  assert.ok(!teacher.includes("button('ממשיכות למפצחות את הקוד'"));
});

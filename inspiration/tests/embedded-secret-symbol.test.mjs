import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const file = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('secret symbol appears only as part of the original card artwork until the matching phase', async () => {
  const participant = await file('../participant.js');
  assert.match(participant, /viewer=cardViewer\(card,token\)/);
  assert.doesNotMatch(participant, /symbol-badge|הסמל שלך:/);
  assert.doesNotMatch(participant, /הכירי את הסיפור והביטי בסמל/);
  const cardReveal = participant.indexOf("else main.append(el('div',{class:'personal-header'}");
  const matchingPhase = participant.indexOf("room.phase==='matching'");
  assert.ok(cardReveal > matchingPhase);
  assert.match(participant, /הביטי בסמל שמופיע בקלף שלך/);
});

test('gallery is display-only while Supabase remains the matching source', async () => {
  const admin = await file('../admin.html');
  const adminScript = await file('../admin.js');
  const teacher = await file('../teacher.js');
  assert.match(admin, /תצוגה מקדימה/);
  assert.match(admin, /id="gallery"/);
  assert.doesNotMatch(admin, /name="symbol"|id="group-form"|id="card-form"|id="import-form"/);
  assert.match(adminScript, /api\('teacher\.catalog'\)/);
  assert.doesNotMatch(adminScript, /admin\.catalog_save|admin\.catalog_import|upload\(/);
  assert.match(teacher, /group\.symbol/);
  assert.match(teacher, /player\.symbol/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const file = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('participants see the secret symbol only inside the original woman card image', async () => {
  const participant = await file('../participant.js');
  assert.match(participant, /viewer=cardViewer\(card,token\)/);
  assert.doesNotMatch(participant, /symbol-badge|הסמל שלך:/);
  assert.match(participant, /הביטי בסמל שמופיע בקלף שלך/);
});

test('admins still record the embedded symbol for group matching and teachers see the mappings', async () => {
  const admin = await file('../admin.html');
  const teacher = await file('../teacher.js');
  assert.match(admin, /הסימן הסודי המוטבע בכרטיסים/);
  assert.match(admin, /name="symbol"/);
  assert.match(teacher, /group\.symbol/);
  assert.match(teacher, /player\.symbol/);
});

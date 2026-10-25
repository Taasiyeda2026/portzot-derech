import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const file = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('course website opens the teacher-only game and never joins as a participant', async () => {
  const menu = await file('../../strongermenu-2026.html');
  const landing = await file('../home.html');
  const teacherEntry = await file('../teacher-entry.js');
  assert.match(menu, /id="inspiration-entry"/);
  assert.match(teacherEntry, /dashboardLogin\(\)/);
  assert.match(teacherEntry, /location\.assign\(url\.href\)/);
  assert.doesNotMatch(teacherEntry, /api\('teacher\.create'/);
  assert.doesNotMatch(menu, /href="inspiration\/index\.html"/);
  assert.match(landing, /strongermenu-2026\.html#inspiration/);
});

test('the card page is read-only and uses the dashboard bridge for instructor authorization', async () => {
  const gallery = await file('../admin.html');
  const galleryJS = await file('../admin.js');
  const common = await file('../common.js');
  assert.match(gallery, /data-page="card-gallery"/);
  assert.match(gallery, /href="\.\/teacher\.html"/);
  assert.match(gallery, /id="gallery"/);
  assert.doesNotMatch(gallery, /id="card-form"|id="group-form"|id="import-form"/);
  assert.match(galleryJS, /api\('teacher\.catalog'\)/);
  assert.doesNotMatch(galleryJS, /admin\.catalog_save|admin\.catalog_import/);
  assert.match(common, /loginPanel/);
  assert.match(common, /dashboardLogin/);
  assert.match(common, /inspiration-bridge\.html/);
});

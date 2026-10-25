import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const root = new URL('../cards/women/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root),'utf8'));

test('all 30 individual course cards exist on disk and are indexed without the duplicate shared back', async () => {
  assert.equal(manifest.files.length, 30);
  assert.equal(new Set(manifest.files).size, manifest.files.length);
  for (const filename of manifest.files) {
    assert.match(filename, /^[A-Za-z0-9_-]+\.(png|jpg|jpeg|webp|pdf)$/);
    const file = await stat(new URL(filename, root));
    assert.ok(file.isFile() && file.size > 1024);
  }
  assert.ok(!manifest.files.includes('גב.png'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareStorage } from '../scripts/setup-storage.mjs';

test('storage setup checks are read-only unless an approved apply is explicit', async () => {
  let writes = 0;
  const storage = { getBucket: async () => ({ data: null, error: { status: 404 } }), createBucket: async () => { writes++; } };
  assert.equal((await prepareStorage(storage)).status, 'missing');
  assert.equal(writes, 0);
});
test('storage setup rejects an existing public bucket without rewriting it', async () => {
  await assert.rejects(() => prepareStorage({ getBucket: async () => ({ data: { public: true } }) }, { apply: true }), /public/);
});
test('storage setup fails closed on denied/unavailable metadata', async () => {
  await assert.rejects(() => prepareStorage({ getBucket: async () => ({ data: null, error: { status: 403 } }) }, { apply: true }), /No changes/);
});
test('approved bucket creation uses private storage and MIME/size limits, then verifies privacy', async () => {
  let created = false;
  const storage = {
    getBucket: async () => created ? { data: { public: false } } : { data: null, error: { status: 404 } },
    createBucket: async (id, options) => {
      assert.equal(id, 'inspiration-cards');assert.equal(options.public, false);
      assert.equal(options.fileSizeLimit, 12582912);assert.ok(options.allowedMimeTypes.includes('application/pdf'));
      created = true;return {};
    },
  };
  assert.equal((await prepareStorage(storage, { apply: true })).status, 'private-created');
});

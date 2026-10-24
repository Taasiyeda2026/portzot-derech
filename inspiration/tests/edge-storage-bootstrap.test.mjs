import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareStorage } from '../../supabase/functions/inspiration-game/storage-bootstrap.mjs';

test('bucket preflight is read only by default', async () => {
  let creates = 0;
  const result = await prepareStorage({
    getBucket: async id => { assert.equal(id, 'inspiration-cards'); return { data: null, error: { status: 404 } }; },
    createBucket: async () => { creates++; },
  });
  assert.equal(result.status, 'missing');
  assert.equal(creates, 0);
});

test('deployment creates only the exact missing private bucket and verifies it', async () => {
  let creates = 0;
  const calls = [];
  const storage = {
    getBucket: async id => { calls.push(['get', id]); return creates ? { data: { public: false } } : { data: null, error: { statusCode: '404' } }; },
    createBucket: async (id, options) => { calls.push(['create', id, options]); creates++; return {}; },
  };
  assert.equal((await prepareStorage(storage, { apply: true })).status, 'private-created');
  assert.equal(creates, 1);
  assert.deepEqual(calls[1], ['create', 'inspiration-cards', {
    public: false, fileSizeLimit: 12582912,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
  }]);
  assert.equal((await prepareStorage(storage, { apply: true })).status, 'private-existing');
  assert.equal(creates, 1);
});

test('a concurrent creation conflict rechecks privacy and never overwrites', async () => {
  let checks = 0;
  const storage = {
    getBucket: async () => ++checks === 1 ? { data: null, error: { status: 404 } } : { data: { public: false } },
    createBucket: async () => ({ error: { status: 409 } }),
  };
  assert.equal((await prepareStorage(storage, { apply: true })).status, 'private-existing');
  assert.equal(checks, 2);
});

test('existing public bucket is rejected without a write', async () => {
  let writes = 0;
  await assert.rejects(() => prepareStorage({
    getBucket: async () => ({ data: { public: true } }),
    createBucket: async () => { writes++; },
  }, { apply: true }), /public/);
  assert.equal(writes, 0);
});

test('missing privacy metadata and denied lookup never cause creation', async () => {
  for (const metadata of [
    { data: { id: 'inspiration-cards' } },
    { data: null, error: { status: 403 } },
    { data: null, error: { status: 500 } },
    { data: null, error: { status: 400, message: 'not found' } },
    { data: null },
  ]) {
    let writes = 0;
    await assert.rejects(() => prepareStorage({ getBucket: async () => metadata, createBucket: async () => { writes++; } }, { apply: true }));
    assert.equal(writes, 0);
  }
});

test('non-conflict creation errors fail closed with no raw server details', async () => {
  await assert.rejects(() => prepareStorage({
    getBucket: async () => ({ data: null, error: { status: 404 } }),
    createBucket: async () => ({ error: { status: 403, message: 'sensitive-token-and-details' } }),
  }, { apply: true }), error => !error.message.includes('sensitive-token'));
});

test('successful or concurrent creation cannot enable a public or unavailable bucket', async () => {
  for (const createError of [null, { status: 409 }]) {
    for (const verified of [{ data: { public: true } }, { data: null, error: { status: 403 } }]) {
      let checks = 0;
      await assert.rejects(() => prepareStorage({
        getBucket: async () => ++checks === 1 ? { data: null, error: { status: 404 } } : verified,
        createBucket: async () => ({ error: createError }),
      }, { apply: true }), /could not be verified as private/);
    }
  }
});

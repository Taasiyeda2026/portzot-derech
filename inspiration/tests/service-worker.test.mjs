import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../../service-worker.js', import.meta.url), 'utf8');
function serviceWorker() {
  const listeners = {}, writes = [], reads = [];
  const context = {
    self: { location: { origin: 'https://portzot-derech.org' }, addEventListener: (event, listener) => { listeners[event] = listener; } },
    URL, Set, Promise, console,
    fetch: async request => new Response(request.url, { status: 200 }),
    caches: {
      match: async request => { reads.push(request);return undefined; },
      open: async () => ({ put: async request => { writes.push(request); } }),
    },
  };
  vm.runInNewContext(source, context);
  return { writes, reads, fetch: (url, options = {}) => {
    let response;
    listeners.fetch({ request: { url, method: 'GET', mode: 'cors', ...options }, respondWith: promise => { response = promise; } });
    return response;
  }};
}

test('game pages, media and credentials bypass service worker storage and offline substitutions', async () => {
  const worker = serviceWorker();
  for (const path of ['index.html?code=private', 'teacher.html?room=private', 'vendor/pdf.mjs', 'private.png']) {
    assert.equal(worker.fetch(`https://portzot-derech.org/inspiration/${path}`, { mode: 'navigate' }), undefined);
  }
  assert.deepEqual(worker.reads, []);assert.deepEqual(worker.writes, []);
});
test('dashboard Supabase requests and existing environment injection keep bypassing cache', () => {
  const worker = serviceWorker();
  assert.equal(worker.fetch('https://szinlhjuwyiyszdpsdop.supabase.co/functions/v1/inspiration-game'), undefined);
  assert.equal(worker.fetch('https://portzot-derech.org/poster-builder/env.js'), undefined);
  assert.deepEqual(worker.writes, []);
});
test('existing course navigation remains network first and existing images remain cacheable', async () => {
  const worker = serviceWorker();
  const page = await worker.fetch('https://portzot-derech.org/pairing/pairing.html', { mode: 'navigate' });
  assert.match(await page.text(), /pairing/);assert.equal(worker.writes.length, 0);
  const image = await worker.fetch('https://portzot-derech.org/icon/logo.png');
  assert.equal(image.status, 200);assert.equal(worker.reads.length, 1);assert.equal(worker.writes.length, 1);
});

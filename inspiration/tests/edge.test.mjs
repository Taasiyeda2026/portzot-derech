import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../../supabase/functions/inspiration-game/handler.mjs';

const ORIGIN = 'https://portzot-derech.org';
const TOKEN = 'a'.repeat(64);
const UUID = '4c1eefb5-93a8-4223-9c81-553d6b9aa3e8';
function setup(options = {}) {
  const calls = [];
  const storageCalls = [];
  const client = {
    auth: { getUser: async token => { calls.push(['auth', token]); return options.auth || { data: { user: { id: UUID } }, error: null }; } },
    rpc: async (name, params) => {
      calls.push([name, params]);
      if (name === 'inspiration_rate_limit') return options.rate || { data: true, error: null };
      return options.rpc ? options.rpc(params) : { data: options.data ?? { ok: true }, error: null };
    },
    storage: { getBucket: async () => options.bucket || { data: { id: 'inspiration-cards', public: false }, error: null }, from: bucket => ({
      download: async path => { storageCalls.push(['download', bucket, path]); return { data: new Blob(['%PDF-1.7\nfixture'], { type: 'application/pdf' }), error: options.downloadError || null }; },
      upload: async (...args) => { storageCalls.push(['upload', bucket, ...args]); return { data: {}, error: options.uploadError || null }; },
    }) },
  };
  const handler = createHandler({ client });
  const request = (body, headers = {}, method = 'POST') => handler(new Request('https://project.supabase.co/functions/v1/inspiration-game', {
    method, headers: { origin: ORIGIN, 'Content-Type': 'application/json', ...headers },
    ...(method === 'POST' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  }));
  return { handler, request, calls, storageCalls };
}

test('CORS is restricted to exact approved origins and all responses are private/no-store', async () => {
  const { request, calls } = setup();
  for (const origin of ['https://evil.example', 'https://portzot-derech.org.evil.example', 'null']) {
    const response = await request({ action: 'teacher.me' }, { origin });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
    assert.match(response.headers.get('Cache-Control'), /no-store/);
  }
  assert.equal(calls.length, 0);
});

test('approved preflight has no database or Auth side effects', async () => {
  const { request, calls } = setup();
  const response = await request(null, {}, 'OPTIONS');
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  assert.equal(calls.length, 0);
});

test('GET and invalid JSON/actions cannot invoke SQL', async () => {
  const { request, calls } = setup();
  assert.equal((await request(null, {}, 'GET')).status, 405);
  assert.equal((await request('{')).status, 400);
  assert.equal((await request({ action: 'arbitrary.sql' })).status, 400);
  assert.equal((await request({ action: 'admin.upload' })).status, 400);
  assert.equal(calls.length, 0);
});

test('staff actions verify bearer using Auth.getUser and never accept caller actor', async () => {
  const { request, calls } = setup({ data: { role: 'instructor', can_manage: true } });
  assert.equal((await request({ action: 'teacher.me' })).status, 401);
  const response = await request({ action: 'teacher.me', p_actor: 'attacker', payload: { actor: 'attacker', role: 'admin', _rate_key: 'injected' } }, { Authorization: 'Bearer real-auth-token' });
  assert.equal(response.status, 200);
  assert.equal(calls[0][0], 'auth');
  assert.equal(calls[0][1], 'real-auth-token');
  const params = calls[1][1];
  assert.equal(params.p_actor, UUID);
  assert.equal(params.p_token, null);
  assert.equal(params.p_payload.actor, undefined);
  assert.equal(params.p_payload.role, undefined);
  assert.match(params.p_payload._rate_key, /^[a-f0-9]{64}$/);
});

test('expired or invalid staff session is denied before any SQL', async () => {
  const { request, calls } = setup({ auth: { data: { user: null }, error: { message: 'sensitive detail' } } });
  const response = await request({ action: 'teacher.create', payload: { expected: 21 } }, { Authorization: 'Bearer expired' });
  assert.equal(response.status, 401);
  assert.equal(calls.length, 1);
  assert.doesNotMatch(await response.text(), /sensitive detail/);
});

test('participant state uses only room token, never exchanges the instructor session', async () => {
  const { request, calls } = setup({ data: { room: { id: UUID, phase: 'choosing' }, player: { id: UUID, name: 'בדיקה', card: null }, taken: [1] } });
  const response = await request({ action: 'participant.state', token: TOKEN }, { Authorization: 'Bearer teacher-session' });
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[1][1].p_actor, null);
  assert.equal(calls[1][1].p_token, TOKEN);
});

test('participant state exposes only own card and no internal paths, maps or other players', async () => {
  const { request } = setup({ data: {
    room: { id: UUID, phase: 'matching', expected: 3, owner_id: 'private', realtime_topic: 'opaque' },
    player: { id: UUID, name: 'בדיקה', token_hash: 'secret', card: { number: 1, woman_name: 'בדיקה בלבד', field: 'test', symbol: 'circle', front_path: 'private.png', back_path: 'private.pdf', group_id: 'hidden' } },
    players: [{ name: 'another' }], groups: ['hidden'], taken: [1, 'bad'],
  } });
  const response = await request({ action: 'participant.state', token: TOKEN });
  const body = await response.json();
  assert.equal(body.player.card.has_front, true);
  assert.equal(body.player.card.has_back, true);
  assert.equal(body.player.card.front_path, undefined);
  assert.equal(body.room.owner_id, undefined);
  assert.equal(body.players, undefined);
  assert.equal(body.groups, undefined);
  assert.deepEqual(body.taken, [1]);
  assert.doesNotMatch(JSON.stringify(body), /private|token_hash|group_id|another/);
});

test('join idempotency secret is required and server token survives projection', async () => {
  const data = { token: TOKEN, room: { id: UUID }, player: { id: UUID, name: 'בדיקה' } };
  const { request, calls } = setup({ data });
  assert.equal((await request({ action: 'participant.join', payload: { code: 'CODE', name: 'שם', join_key: 'short' } })).status, 400);
  const response = await request({ action: 'participant.join', payload: { code: 'CODE', name: 'שם', join_key: 'r'.repeat(32) } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).token, TOKEN);
  assert.equal(calls.filter(([name]) => name === 'inspiration_rpc').length, 1);
});

test('script markup and control characters are rejected in names before SQL', async () => {
  const { request, calls } = setup();
  for (const name of ['<img src=x onerror=alert(1)>', 'x\u0000y', '   ', 'a'.repeat(81)]) {
    const response = await request({ action: 'participant.join', payload: { code: 'CODE', name, join_key: 'r'.repeat(32) } });
    assert.equal(response.status, 400);
  }
  assert.equal(calls.filter(([name]) => name === 'inspiration_rpc').length, 0);
});

test('missing participant token cannot access own state or media', async () => {
  const { request, calls } = setup();
  for (const action of ['participant.state', 'participant.claim', 'participant.asset']) {
    assert.equal((await request({ action, payload: { side: 'front' } })).status, 401);
  }
  assert.equal(calls.filter(([name]) => name === 'inspiration_rpc').length, 0);
});

test('asset authorization resolves only server-selected path and streams no-store bytes', async () => {
  const { request, calls, storageCalls } = setup({ data: { path: 'snapshot.pdf' } });
  const response = await request({ action: 'participant.asset', token: TOKEN, payload: { side: 'front', path: 'victim.pdf', player_id: 'victim' } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'application/pdf');
  assert.equal(response.headers.get('Content-Disposition'), 'inline');
  assert.match(response.headers.get('Cache-Control'), /no-store/);
  assert.deepEqual(storageCalls[0], ['download', 'inspiration-cards', 'snapshot.pdf']);
  assert.equal(calls[1][1].p_action, 'participant.asset');
  assert.match(await response.text(), /PDF/);
});

test('invalid asset side and unsafe server paths cannot be fetched', async () => {
  const { request, storageCalls } = setup({ data: { path: '../private.pdf' } });
  assert.equal((await request({ action: 'participant.asset', token: TOKEN, payload: { side: 'all' } })).status, 400);
  assert.equal((await request({ action: 'participant.asset', token: TOKEN, payload: { side: 'front' } })).status, 404);
  assert.equal(storageCalls.length, 0);
});

test('SQL conflicts, limits and unexpected details are returned as safe Hebrew errors', async () => {
  for (const [error, status, code] of [
    [{ message: 'card_taken' }, 409, 'card_taken'],
    [{ message: 'rate_limited' }, 429, 'rate_limited'],
    [{ message: 'forbidden' }, 403, 'forbidden'],
    [{ message: 'secret relation table other_student does not exist' }, 503, 'server_error'],
  ]) {
    const { request } = setup({ rpc: () => ({ data: null, error }) });
    const response = await request({ action: 'participant.claim', token: TOKEN, payload: { number: 1 } });
    assert.equal(response.status, status);
    const body = await response.json();
    assert.equal(body.error.code, code);
    assert.doesNotMatch(body.error.message, /secret|other_student|relation/);
    if (status === 429) assert.equal(response.headers.get('Retry-After'), '60');
  }
});

test('JSON request limit is enforced before parsing or SQL', async () => {
  const { request, calls } = setup();
  const response = await request('x'.repeat(512 * 1024 + 1));
  assert.equal(response.status, 413);
  assert.equal(calls.length, 0);
});

function uploadRequest(handler, file, authorization = 'Bearer staff') {
  const form = new FormData(); form.set('action', 'admin.upload'); form.set('file', file, 'untrusted-name.pdf');
  return handler(new Request('https://project.supabase.co/functions/v1/inspiration-game', {
    method: 'POST', headers: { origin: ORIGIN, Authorization: authorization }, body: form,
  }));
}

test('upload requires verified admin before reading or writing a file', async () => {
  const { handler, storageCalls } = setup({ data: { is_admin: false } });
  const response = await uploadRequest(handler, new Blob(['%PDF-1.7\nfixture'], { type: 'application/pdf' }));
  assert.equal(response.status, 403);
  assert.equal(storageCalls.length, 0);
});

test('admin upload stores immutable random filename and validates MIME plus magic', async () => {
  const { handler, storageCalls } = setup({ data: { is_admin: true } });
  const response = await uploadRequest(handler, new Blob(['%PDF-1.7\nfixture'], { type: 'application/pdf' }));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.match(data.path, /^[a-f0-9-]{36}\.pdf$/);
  assert.equal(data.mime, 'application/pdf');
  assert.equal(storageCalls[0][4].upsert, false);
  assert.equal(storageCalls[0][4].cacheControl, '0');
  assert.doesNotMatch(data.path, /untrusted-name/);
  const invalid = await uploadRequest(handler, new Blob(['<svg onload=alert(1)>bad</svg>'], { type: 'application/pdf' }));
  assert.equal(invalid.status, 400);
  const spoofedMime = await uploadRequest(handler, new Blob(['%PDF-1.7\nfixture'], { type: 'image/png' }));
  assert.equal(spoofedMime.status, 400);
  assert.equal(storageCalls.length, 1);
});

test('network exceptions never expose transport internals or participant data', async () => {
  const { request } = setup({ rpc: () => { throw new Error('token=secret student=private'); } });
  const response = await request({ action: 'participant.state', token: TOKEN });
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /secret|private|token=/);
});

test('public rate limiter commits before invalid token and before failing game actions', async () => {
  const { request, calls } = setup({ rpc: () => ({ data: null, error: { message: 'ROOM_UNAVAILABLE' } }) });
  assert.equal((await request({ action: 'participant.state', token: 'short' })).status, 401);
  assert.equal(calls[0][0], 'inspiration_rate_limit');
  assert.equal(calls.length, 1);
  assert.equal((await request({ action: 'participant.join', payload: { code: 'not-a-room', name: 'בדיקה', join_key: TOKEN } })).status, 400);
  assert.equal(calls[1][0], 'inspiration_rate_limit');
  assert.equal(calls[2][0], 'inspiration_rpc');
  assert.equal(calls[1][1].p_limit, 240);
  assert.match(calls[1][1].p_key, /^join:[a-f0-9]{64}$/);
});

test('a durable rate rejection blocks the authoritative RPC and returns Retry-After', async () => {
  const { request, calls } = setup({ rate: { data: false, error: null } });
  const response = await request({ action: 'participant.claim', token: TOKEN, payload: { number: 1, _rate_key: 'attacker' } });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '60');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'inspiration_rate_limit');
  assert.equal(calls[0][1].p_limit, 2000);
  assert.doesNotMatch(calls[0][1].p_key, /attacker/);
});

test('failed durable limiter fails closed before SQL game access', async () => {
  const { request, calls } = setup({ rate: { data: null, error: { message: 'sensitive limiter failure' } } });
  const response = await request({ action: 'participant.state', token: TOKEN });
  assert.equal(response.status, 503);
  assert.equal(calls.length, 1);
  assert.doesNotMatch(await response.text(), /sensitive limiter/);
});

test('rate key ignores forged leading forwarding addresses and never stores raw IPs', async () => {
  const { request, calls } = setup({ rate: { data: false, error: null } });
  await request({ action: 'participant.state', token: TOKEN }, { 'x-forwarded-for': 'forged-A, 192.0.2.5' });
  await request({ action: 'participant.state', token: TOKEN }, { 'x-forwarded-for': 'forged-B, 192.0.2.5' });
  assert.equal(calls[0][1].p_key, calls[1][1].p_key);
  assert.doesNotMatch(calls[0][1].p_key, /192\.0\.2\.5|forged/);
  await request({ action: 'participant.state', token: TOKEN }, { 'cf-connecting-ip': '192.0.2.6', 'x-forwarded-for': 'forged-A' });
  await request({ action: 'participant.state', token: TOKEN }, { 'cf-connecting-ip': '192.0.2.6', 'x-forwarded-for': 'forged-B' });
  assert.equal(calls[2][1].p_key, calls[3][1].p_key);
});

test('teacher asset is served through verified owner RPC, with no participant token', async () => {
  const { request, calls, storageCalls } = setup({ data: { path: 'manual.pdf' } });
  const response = await request({ action: 'teacher.asset', payload: { room_id: UUID, number: 1, side: 'front' }, token: TOKEN }, { Authorization: 'Bearer staff' });
  assert.equal(response.status, 200);
  assert.equal(calls[0][0], 'auth');
  assert.equal(calls[1][1].p_action, 'teacher.asset');
  assert.equal(calls[1][1].p_actor, UUID);
  assert.equal(calls[1][1].p_token, null);
  assert.deepEqual(storageCalls[0], ['download', 'inspiration-cards', 'manual.pdf']);
});

test('database domain errors are mapped without exposing uppercase internal errors', async () => {
  for (const [internal, external, status] of [
    ['PARTICIPATION_INVALID', 'invalid_token', 401],
    ['CAPACITY_EXCEEDED', 'insufficient_cards', 400],
    ['CATALOG_INCOMPLETE', 'catalog_invalid', 400],
    ['JOIN_CLOSED', 'room_closed', 400],
    ['WAITING_FOR_CHOICES', 'choices_incomplete', 400],
    ['ASSET_UNAVAILABLE', 'file_missing', 404],
  ]) {
    const { request } = setup({ rpc: () => ({ data: null, error: { message: internal } }) });
    const response = await request({ action: 'participant.state', token: TOKEN });
    assert.equal(response.status, status);
    const result = await response.json();
    assert.equal(result.error.code, external);
    assert.doesNotMatch(result.error.message, /[A-Z_]{5}/);
  }
});

test('uploads and personal assets fail closed if the bucket is public or unavailable', async () => {
  for (const bucket of [{ data: { public: true }, error: null }, { data: null, error: { message: 'private internals' } }]) {
    const media = setup({ bucket, data: { path: 'test.pdf' } });
    const response = await media.request({ action: 'participant.asset', token: TOKEN, payload: { side: 'front' } });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, 'storage_unavailable');
    assert.equal(media.storageCalls.length, 0);
    const upload = setup({ bucket, data: { is_admin: true } });
    assert.equal((await uploadRequest(upload.handler, new Blob(['%PDF-1.7\nfixture'], { type: 'application/pdf' }))).status, 503);
    assert.equal(upload.storageCalls.length, 0);
  }
});

test('manual retention cleanup remains a server-authorized admin action', async () => {
  const { request, calls } = setup({ data: { deleted_rooms: 1 } });
  const response = await request({ action: 'admin.cleanup' }, { Authorization: 'Bearer staff' });
  assert.equal(response.status, 200);
  assert.equal(calls[0][0], 'auth');
  assert.equal(calls[1][1].p_action, 'admin.cleanup');
  assert.equal(calls[1][1].p_actor, UUID);
});

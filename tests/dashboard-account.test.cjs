const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/dashboard-account.js'), 'utf8')
  .replace(/^import .*;\n/gm, '').replaceAll('export class ', 'class ').replaceAll('export async function ', 'async function ');
const sandbox = { SUPABASE_URL: 'https://example.test', PUBLISHABLE_KEY: 'public-test-key', AbortSignal };
vm.runInNewContext(source + '\nglobalThis.readAccount = readActiveDashboardAccount;', sandbox);
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
function run(profile, { identity = { id: 'verified-id' }, identityStatus = 200, profileStatus = 200 } = {}) {
  const calls = [];
  const request = async (url, options) => {
    calls.push({ url, options });
    return calls.length === 1 ? response(identity, identityStatus) : response(profile, profileStatus);
  };
  return { calls, result: sandbox.readAccount({ token: 'isolated-test-session', request,
    baseUrl: 'https://example.test', publishableKey: 'public-test-key' }) };
}
for (const role of ['employee', 'finance', 'instructor', 'admin', 'unknown']) {
  test(`existing profile RPC admits active ${role} account without activity permissions`, async () => {
    const { result, calls } = run({ is_active: true, auth_user_id: 'verified-id', role, permissions: {} });
    const account = await result;
    assert.equal(account.active, true);
    assert.equal(account.id, 'verified-id');
    assert.equal(account.role, undefined);
    assert.equal(calls.length, 2);
    assert.match(calls[0].url, /\/auth\/v1\/user$/);
    assert.match(calls[1].url, /\/rest\/v1\/rpc\/get_current_app_user$/);
    assert.equal(calls[1].options.body, '{}');
    assert.equal(calls[0].options.cache, 'no-store');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer isolated-test-session');
  });
}
for (const [name, profile, code] of [
  ['inactive', { is_active: false }, 'inactive'],
  ['missing active status', { role: 'admin' }, 'inactive'],
  ['string status', { is_active: 'true' }, 'inactive'],
  ['missing account', null, 'account_missing'],
  ['ambiguous mapping', [{ is_active: true }, { is_active: true }], 'account_missing'],
  ['identity mismatch', { is_active: true, auth_user_id: 'someone-else' }, 'identity_mismatch']
]) {
  test(`${name} is rejected independently of role or activity authorization`, async () => {
    await assert.rejects(run(profile).result, error => error.code === code);
  });
}
test('invalid identity cannot fetch a dashboard profile', async () => {
  const { result, calls } = run({ is_active: true }, { identityStatus: 401 });
  await assert.rejects(result, error => error.code === 'signed_out');
  assert.equal(calls.length, 1);
});
test('profile service error fails closed instead of trusting an access token', async () => {
  await assert.rejects(run({}, { profileStatus: 403 }).result, error => error.code === 'unavailable');
});
test('no session does not make a network request', async () => {
  await assert.rejects(sandbox.readAccount({ token: null, request: () => { throw new Error('unexpected network'); } }),
    error => error.code === 'signed_out');
});
test('singleton array from existing RPC is supported', async () => {
  assert.equal((await run([{ is_active: true }]).result).active, true);
});

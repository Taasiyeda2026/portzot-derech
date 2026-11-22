const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('course-code gate remains separate from dashboard authentication', () => {
  for (const prefix of ['', 'ar/']) {
    const html = read(`${prefix}strongermenu-2026.html`);
    assert.match(html, /const SESSION_KEY = "stronger_gate_2026"/);
    assert.match(html, /if \(sessionStorage\.getItem\(SESSION_KEY\) !== "ok"\)/);
    assert.match(html, /window\.location\.replace\("(?:\.\.\/)?index\.html"\)/);
    assert.doesNotMatch(html, /management-entry\.js|dashboardLogin/);
  }
  const controller = read('js/management-entry.js');
  assert.doesNotMatch(controller, /stronger_gate_2026|setItem\(|removeItem\(/);
  assert.match(controller, /import \{ dashboardLogin, api as inspirationApi \} from '\.\.\/inspiration\/common\.js'/);
});

test('activity permission requests retain separate service and RPC boundaries', () => {
  assert.match(read('inspiration/common.js'), /functions\/v1\/inspiration-game/);
  assert.match(read('pairing/common.js'), /functions\/v1\/pairing-groups/);
  assert.match(read('supabase/functions/inspiration-game/handler.mjs'), /client\.auth\.getUser/);
  assert.match(read('supabase/functions/inspiration-game/handler.mjs'), /inspiration_rpc/);
  assert.match(read('supabase/functions/pairing-groups/handler.mjs'), /client\.auth\.getUser/);
  assert.match(read('supabase/functions/pairing-groups/handler.mjs'), /pairing_rpc/);
  const account = read('js/dashboard-account.js').replace(/\/\/[^\n]*/g, '');
  assert.doesNotMatch(account, /teacher\.me|can_manage|is_admin|inspiration_manage|\.role/);
});

for (const prefix of ['', 'ar/']) {
  test(`${prefix || 'he/'}menu preserves five course stages and four arrow groups`, () => {
    const html = read(`${prefix}strongermenu-2026.html`);
    assert.equal((html.match(/class="menu-item"/g) || []).length, 5);
    assert.equal((html.match(/class="proc-arr"/g) || []).length, 4);
    const targets = ['start/quiz.html', 'domains/alldomains.html', 'idea/idea-to-product.html',
      'steps/entrepreneurship-steps.html', 'final/final.html'];
    let previous = -1;
    for (const target of targets) {
      const index = html.indexOf(target, previous + 1);
      assert.ok(index > previous, target);
      previous = index;
    }
    assert.match(html, /icon\/manage\.svg/);
    assert.match(html, /href="(?:\.\.\/)?management\.html/);
    assert.doesNotMatch(html, /id="inspiration-entry"|teacher-entry\.js/);
    assert.match(html, /sessionStorage\.getItem\(SESSION_KEY\)/);
  });

  test(`${prefix || 'he/'}management contains two locked original activity destinations`, () => {
    const html = read(`${prefix}management.html`);
    assert.equal((html.match(/data-activity-url=/g) || []).length, 2);
    assert.match(html, /inspiration\/teacher\.html/);
    assert.match(html, /pairing\/admin\.html/);
    assert.match(html, /inspiration-cards\.svg/);
    assert.match(html, /partner\.svg/);
    assert.match(html, /id="management-login"/);
    assert.match(html, /id="management-auth-status"/);
    assert.match(html, /js\/management-entry\.js/);
    assert.match(html, /<script type="module" src="(?:\.\.\/)?js\/management-entry\.js"><\/script>/);
    assert.doesNotMatch(html, /teacher\.me|can_manage|is_admin/);
    for (const element of html.matchAll(/<button\b[^>]*data-activity-url[^>]*>/g)) {
      assert.match(element[0], /\bdisabled\b/);
    }
  });
}

function fixture(lang = 'he', options = {}) {
  const status = {};
  const listeners = {};
  const button = { disabled: false, hidden: false, addEventListener: (_, fn) => { listeners.login = fn; } };
  const activity = name => ({ disabled: false, attrs: {}, label: {},
    dataset: { activity: name, activityUrl: name === 'inspiration' ? 'inspiration/teacher.html' : 'pairing/admin.html' },
    setAttribute(name, value) { this.attrs[name] = value; },
    querySelector() { return this.label; },
    addEventListener(_, fn) { listeners[name] = fn; } });
  const activities = [activity('inspiration'), activity('pairing')];
  const state = { account: options.account, permissions: options.permissions || { inspiration: true, pairing: true },
    loginCalls: 0, accountCalls: 0, activityCalls: [], visits: [] };
  const document = {
    documentElement: { lang, dataset: {} },
    baseURI: 'https://example.test/management.html',
    visibilityState: 'visible',
    defaultView: { addEventListener() {} },
    addEventListener() {},
    getElementById: id => id === 'management-login' ? button : status,
    querySelectorAll: () => activities
  };
  const source = read('js/management-entry.js')
    .replace(/^import .*;\n/gm, '')
    .replace('export function setupManagementEntry', 'function setupManagementEntry');
  const sandbox = { URL, Date, setTimeout, clearTimeout };
  vm.runInNewContext(source + '\nglobalThis.setup = setupManagementEntry;', sandbox);
  const controller = sandbox.setup(document, {
    login: async () => { state.loginCalls++; return options.login ? options.login(state) : undefined; },
    readAccount: async () => {
      state.accountCalls++;
      if (!state.account) throw { code: 'signed_out' };
      if (state.account.error) throw { code: state.account.error };
      return state.account;
    },
    checkActivity: async name => {
      state.activityCalls.push(name);
      const permission = state.permissions[name];
      if (permission instanceof Error) throw permission;
      return { can_manage: permission, is_admin: false };
    },
    navigate: url => state.visits.push(url)
  });
  return { status, button, activities, state, document, controller, click: () => listeners.login(),
    clickActivity: name => listeners[name]() };
}

test('signed-out direct entry keeps activity permissions isolated and never opens SSO automatically', async () => {
  const page = fixture('he');
  await page.controller.ready;
  assert.ok(page.activities.every(a => a.disabled && a.attrs['aria-disabled'] === 'true'));
  assert.match(page.status.textContent, /יש להתחבר/);
  assert.equal(page.state.loginCalls, 0);
  assert.deepEqual(page.state.activityCalls, []);
  assert.equal(page.document.documentElement.dataset.accountState, 'signed-out');
});

for (const inspiration of [true, false]) for (const pairing of [true, false]) {
  test(`active non-instructor enters management with independent inspiration=${inspiration}, pairing=${pairing}`, async () => {
    const page = fixture('he', { account: { id: 'account', active: true, role: 'employee' },
      permissions: { inspiration, pairing } });
    await page.controller.ready;
    assert.equal(page.document.documentElement.dataset.accountState, 'active');
    assert.match(page.status.textContent, /נכנסת לממשק הניהול/);
    assert.equal(page.activities[0].disabled, !inspiration);
    assert.equal(page.activities[1].disabled, !pairing);
    assert.equal(page.state.loginCalls, 0);
    assert.deepEqual(page.state.activityCalls.sort(), ['inspiration', 'pairing']);
  });
}

test('bridge rejection remains locked and gives a retry without leaking the error', async () => {
  const page = fixture('he', { login: async () => { throw new Error('private diagnostic'); } });
  await page.controller.ready;
  await page.click();
  assert.equal(page.button.disabled, false);
  assert.ok(page.activities.every(a => a.disabled));
  assert.match(page.status.textContent, /ההתחברות לא הושלמה/);
  assert.doesNotMatch(page.status.textContent, /private diagnostic/);
});

test('repeated clicks cannot start concurrent bridge sessions', async () => {
  let resolve;
  const page = fixture('he', { login: () => new Promise(r => { resolve = r; }) });
  await page.controller.ready;
  const first = page.click();
  await page.click();
  assert.equal(page.state.loginCalls, 1);
  assert.equal(page.button.disabled, true);
  resolve();
  await first;
});

test('Arabic pending, success and error states contain no Hebrew', async () => {
  const success = fixture('ar', { account: { active: true } });
  await success.controller.ready;
  assert.doesNotMatch(success.status.textContent, /[\u0590-\u05ff]/);
  await success.click();
  assert.doesNotMatch(success.status.textContent, /[\u0590-\u05ff]/);
  const failure = fixture('ar', { login: async () => { throw new Error('test'); } });
  await failure.controller.ready;
  await failure.click();
  assert.doesNotMatch(failure.status.textContent, /[\u0590-\u05ff]/);
});

test('successful existing dashboard login verifies active account before opening management', async () => {
  const page = fixture('he', { login: state => { state.account = { id: 'account', active: true }; } });
  await page.controller.ready;
  await page.click();
  assert.equal(page.state.loginCalls, 1);
  assert.equal(page.document.documentElement.dataset.accountState, 'active');
  assert.ok(page.activities.every(a => !a.disabled));
});

for (const code of ['inactive', 'identity_mismatch', 'account_missing', 'unavailable']) {
  test(`${code} account cannot run either activity authorization check`, async () => {
    const page = fixture('he', { account: { error: code } });
    await page.controller.ready;
    assert.equal(page.document.documentElement.dataset.accountState, 'blocked');
    assert.ok(page.activities.every(a => a.disabled));
    assert.deepEqual(page.state.activityCalls, []);
  });
}

test('one activity failure does not block entry or the other activity', async () => {
  const page = fixture('he', { account: { active: true },
    permissions: { inspiration: new Error('network'), pairing: true } });
  await page.controller.ready;
  assert.equal(page.document.documentElement.dataset.accountState, 'active');
  assert.equal(page.activities[0].disabled, true);
  assert.equal(page.activities[1].disabled, false);
});

test('enabled activity rechecks account and navigates to its original destination', async () => {
  const page = fixture('he', { account: { active: true } });
  await page.controller.ready;
  await page.clickActivity('pairing');
  assert.deepEqual(page.state.visits, ['https://example.test/pairing/admin.html']);
  assert.ok(page.state.accountCalls >= 2);
});

test('deactivated account cannot navigate using a previously enabled activity', async () => {
  const page = fixture('he', { account: { active: true } });
  await page.controller.ready;
  page.state.account = { error: 'inactive' };
  await page.clickActivity('inspiration');
  assert.deepEqual(page.state.visits, []);
  assert.ok(page.activities.every(a => a.disabled));
});

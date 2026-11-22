// All external identity/profile/activity responses are intercepted locally.
// This never opens dashboardLogin, submits credentials or contacts Supabase.
const puppeteer = require('puppeteer');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = process.env.MENU_TEST_URL ||
  (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null);
if (!base) throw new Error('Set MENU_TEST_URL to the local preview origin.');
const output = 'generated-artifacts/menu-management';
const scenarios = [
  ...[true, false].flatMap(inspiration => [true, false].map(pairing =>
    ({ name: `permissions-${Number(inspiration)}-${Number(pairing)}`, inspiration, pairing, active: true }))),
  { name: 'inactive', active: false },
  { name: 'expired', identityStatus: 401 },
  { name: 'profile-error', profileStatus: 403 },
  { name: 'identity-mismatch', active: true, profileId: 'other-user' }
];

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_BIN || '/repl/tools/bin/chromium',
    headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const results = [];
  try {
    for (const language of ['he', 'ar']) {
      for (const scenario of scenarios) {
        const page = await browser.newPage();
        const calls = [];
        const errors = [];
        await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
        await page.setBypassServiceWorker(true);
        await page.setCacheEnabled(false);
        page.on('pageerror', error => errors.push(error.message));
        // A deliberately fake test token is used only with intercepted requests.
        await page.evaluateOnNewDocument(() => sessionStorage.setItem('inspiration-teacher-access', 'isolated-browser-fixture'));
        await page.setRequestInterception(true);
        page.on('request', async request => {
          const url = new URL(request.url());
          const json = (body, status = 200) => request.respond({
            status, contentType: 'application/json',
            headers: { 'Access-Control-Allow-Origin': new URL(base).origin,
              'Access-Control-Allow-Headers': 'apikey,authorization,content-type',
              'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' },
            body: JSON.stringify(body)
          });
          if (url.origin === new URL(base).origin) {
            if (url.pathname.endsWith('/inspiration/teacher.html') || url.pathname.endsWith('/pairing/admin.html')) {
              return request.respond({ status: 200, contentType: 'text/html', body: '<h1>Isolated activity navigation target</h1>' });
            }
            return request.continue();
          }
          if (url.hostname.endsWith('.supabase.co')) {
            if (request.method() === 'OPTIONS') return json({});
            calls.push(url.pathname);
            if (url.pathname === '/auth/v1/user') return json({ id: 'fixture-account' }, scenario.identityStatus || 200);
            if (url.pathname === '/rest/v1/rpc/get_current_app_user') {
              return json({ auth_user_id: scenario.profileId || 'fixture-account', is_active: scenario.active === true,
                role: 'employee', permissions: {} }, scenario.profileStatus || 200);
            }
            const activity = url.pathname.endsWith('/inspiration-game') ? 'inspiration' :
              url.pathname.endsWith('/pairing-groups') ? 'pairing' : null;
            if (activity) {
              const body = JSON.parse(request.postData());
              assert.equal(body.action, 'teacher.me', 'no activity creation or reporting permitted');
              return scenario[activity] ? json({ can_manage: true, is_admin: false }) :
                json({ error: { code: 'forbidden', message: 'forbidden' } }, 403);
            }
          }
          return request.abort();
        });
        const prefix = language === 'ar' ? 'ar/' : '';
        await page.goto(new URL(`${prefix}management.html?lang=${language}`, base).href, { waitUntil: 'networkidle0' });
        await page.waitForFunction(() => ['active', 'blocked', 'signed-out'].includes(document.documentElement.dataset.accountState));
        const state = await page.evaluate(() => ({
          account: document.documentElement.dataset.accountState,
          buttons: [...document.querySelectorAll('[data-activity-url]')].map(button =>
            ({ name: button.dataset.activity, disabled: button.disabled, status: button.querySelector('[data-activity-status]').textContent })),
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1
        }));
        const admitted = scenario.active === true && !scenario.profileId;
        assert.equal(state.account, admitted ? 'active' : scenario.identityStatus ? 'signed-out' : 'blocked');
        assert.deepEqual(errors, []);
        assert.equal(state.horizontalOverflow, false);
        if (admitted) {
          for (const button of state.buttons) assert.equal(button.disabled, !scenario[button.name]);
          assert.ok(calls.includes('/functions/v1/inspiration-game'));
          assert.ok(calls.includes('/functions/v1/pairing-groups'));
        } else {
          assert.ok(state.buttons.every(button => button.disabled));
          assert.ok(!calls.some(url => url.startsWith('/functions/')), 'blocked identity never checks activity permissions');
        }
        if (scenario.name === 'permissions-1-1') {
          await page.evaluate(() => document.fonts.ready);
          await page.screenshot({ path: `${output}/management-active-${language}-1440.png`, fullPage: true, captureBeyondViewport: false });
          await page.setViewport({ width: 390, height: 844 });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
          await page.screenshot({ path: `${output}/management-active-${language}-390.png`, fullPage: true, captureBeyondViewport: false });
        }
        if (admitted && (scenario.inspiration || scenario.pairing)) {
          const chosen = scenario.inspiration ? 'inspiration' : 'pairing';
          const expected = chosen === 'inspiration' ? '/inspiration/teacher.html' : `/${prefix}pairing/admin.html`;
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
            page.click(`[data-activity="${chosen}"]`)
          ]);
          assert.equal(new URL(page.url()).pathname, expected);
        }
        results.push({ language, scenario: scenario.name, ...state, calls });
        await page.close();
      }
    }
    fs.writeFileSync(`${output}/flow-results.json`, JSON.stringify(results, null, 2));
    console.log(`PASS: ${results.length} isolated browser authorization/navigation cases. All service responses mocked; real SSO NOT tested.`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

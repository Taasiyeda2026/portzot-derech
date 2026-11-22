// Local layout checks only. The course gate is simulated, not dashboard SSO.
const puppeteer = require('puppeteer');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = process.env.MENU_TEST_URL ||
  (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null);
if (!base) throw new Error('Set MENU_TEST_URL to the local preview origin.');
const output = 'generated-artifacts/menu-management';

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_BIN || '/repl/tools/bin/chromium',
    headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const results = [];
  try {
    for (const language of ['he', 'ar']) {
      for (const width of [1440, 390]) {
        for (const screen of ['menu', 'management']) {
          const page = await browser.newPage();
          await page.setBypassServiceWorker(true);
          await page.setCacheEnabled(false);
          const errors = [];
          page.on('pageerror', error => errors.push(error.message));
          await page.setViewport({ width, height: width === 390 ? 844 : 900, deviceScaleFactor: 1 });
          // Only the pre-existing course landing gate is simulated for layout.
          // No dashboard session/token, API response or activity permission is mocked.
          await page.evaluateOnNewDocument(() => {
            sessionStorage.setItem('stronger_gate_2026', 'ok');
          });
          await page.setRequestInterception(true);
          page.on('request', request => {
            const url = new URL(request.url());
            if (url.origin !== new URL(base).origin && !['data:', 'blob:'].includes(url.protocol)) {
              return request.abort();
            }
            return request.continue();
          });
          const route = `${language === 'ar' ? 'ar/' : ''}${screen === 'menu' ? 'strongermenu-2026' : 'management'}.html?lang=${language}`;
          await page.goto(new URL(route, base).href, { waitUntil: 'networkidle0' });
          await page.evaluate(() => document.fonts.ready);
          const dimensions = await page.evaluate(() => {
            const rect = element => {
              const r = element.getBoundingClientRect();
              return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
            };
            return {
              horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
              outsideViewport: [...document.querySelectorAll('main,.management-shell,.menu-item,.management-entry')]
                .filter(e => rect(e).x < -1 || rect(e).right > innerWidth + 1)
                .map(e => e.className),
              tileCount: document.querySelectorAll('.menu-grid .menu-item').length,
              arrows: document.querySelectorAll('.proc-arr').length,
              disabledActivities: [...document.querySelectorAll('[data-activity-url]')].every(b => b.disabled),
              destinations: [...document.querySelectorAll('[data-activity-url]')].map(b => new URL(b.dataset.activityUrl, location.href).pathname),
              textIssues: [...document.querySelectorAll('.menu-item p')].filter(p => {
                const icon = p.parentElement.querySelector('.icon-box');
                return p.scrollHeight > p.clientHeight + 1 || (icon && rect(p).bottom > rect(icon).y + 1);
              }).map(p => p.textContent),
              managementEntry: document.querySelector('.management-entry') ? rect(document.querySelector('.management-entry')) : null,
              grid: document.querySelector('.menu-grid') ? rect(document.querySelector('.menu-grid')) : null,
              status: document.querySelector('#management-auth-status')?.textContent
            };
          });
          assert.deepEqual(errors, [], `${route} script errors`);
          assert.equal(dimensions.horizontalOverflow, false, `${route} horizontal overflow at ${width}`);
          assert.deepEqual(dimensions.outsideViewport, [], `${route} elements outside viewport at ${width}`);
          assert.deepEqual(dimensions.textIssues, [], `${route} clipped/overlapping descriptions at ${width}`);
          if (screen === 'menu') {
            assert.equal(dimensions.tileCount, 5);
            assert.equal(dimensions.arrows, 4);
            assert.ok(dimensions.managementEntry.y >= dimensions.grid.bottom);
            assert.ok(dimensions.managementEntry.x > width / 2, 'management entry must remain on right');
          } else {
            assert.equal(dimensions.disabledActivities, true);
            assert.deepEqual(dimensions.destinations, ['/inspiration/teacher.html',
              language === 'ar' ? '/ar/pairing/admin.html' : '/pairing/admin.html']);
            assert.ok(dimensions.status, 'status script loaded');
          }
          const screenshot = `${output}/${screen}-${language}-${width}.png`;
          await page.screenshot({ path: screenshot, fullPage: true, captureBeyondViewport: false });
          results.push({ language, width, screen, ...dimensions, screenshot, errors });
          await page.close();
        }
      }
    }
    fs.writeFileSync(`${output}/layout-results.json`, JSON.stringify(results, null, 2));
    console.log(`PASS: ${results.length} local layout cases; no live dashboard/permission checks.`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

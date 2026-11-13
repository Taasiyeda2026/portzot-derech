import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { harness } from './harness.mjs';
import { questions } from '../../supabase/functions/pairing-groups/questions.mjs';
import { validatedAnswers } from '../../supabase/functions/pairing-groups/domain.mjs';
import { generateGroups } from '../../supabase/functions/pairing-groups/algorithm.mjs';
import { domains, copy } from '../questionnaire-copy.js';

const root = resolve(new URL('../..', import.meta.url).pathname);
const scratch = resolve(root, '../work/pairing-questionnaire-ux');
await mkdir(scratch, { recursive: true });
const h = await harness();
const errors = [], payloads = [];
let submissions = 0, failSubmit = false, delaySubmit = false, browser;
const room = (await h.call('teacher.create', { school: '[בדיקה] שאלון', class_name: 'בדיקה', expected: 10 })).body;
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    assert(path.startsWith(root + '/'));
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' })[extname(path)] || 'application/octet-stream');
    res.end(await readFile(path));
  } catch { res.statusCode = 404; res.end(); }
});
await new Promise(r => server.listen(4173, '127.0.0.1', r));
const url = `http://127.0.0.1:4173/pairing/questionnaire.html?room=${room.code}`;
const waitStep = (p, n) => p.waitForFunction(n => document.querySelector('#stepLabel')?.textContent === `שאלה ${n} מתוך 15` && document.querySelector('#questionCard').getAttribute('aria-busy') === 'false', {}, n);

async function page(width, height) {
  const context = await browser.createBrowserContext(), p = await context.newPage();
  await p.setViewport({ width, height });
  p.on('pageerror', e => errors.push(e.message));
  await p.setRequestInterception(true);
  p.on('request', async request => {
    try {
      if (request.url().includes('/functions/v1/pairing-groups')) {
        const body = JSON.parse(request.postData() || '{}');
        if (body.action === 'participant.submit') {
          submissions++;
          payloads.push(body.answers || body.payload.answers);
          if (delaySubmit) await new Promise(r => setTimeout(r, 700));
          if (failSubmit) { await request.respond({ status: 503, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: { message: 'כשל שמירה לבדיקת התאוששות' } }) }); return; }
        }
        const response = await h.handler(new Request(request.url(), { method: request.method(), headers: request.headers(), body: request.postData() }));
        await request.respond({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
      } else if (request.url().endsWith('/waiting.html?room=' + room.code)) {
        await request.respond({ status: 200, contentType: 'text/html', body: '<p id="waiting-test">נשמר בשרת</p>' });
      } else if (request.url().startsWith('http://127.0.0.1:4173/')) await request.continue();
      else await request.abort();
    } catch (error) { errors.push(error.message); if (!request.isInterceptResolutionHandled()) await request.abort(); }
  });
  await p.goto(url);
  await waitStep(p, 1);
  return p;
}

try {
  // The UI contract and original algorithm/data are unchanged, not just the number of questions.
  for (const name of ['questions.mjs', 'domain.mjs', 'algorithm.mjs', 'handler.mjs']) {
    const path = 'supabase/functions/pairing-groups/' + name;
    assert.equal(await readFile(resolve(root, path), 'utf8'), execFileSync('git', ['show', '90c0834:' + path], { cwd: root, encoding: 'utf8' }));
  }
  const directory = await readFile(resolve(root, 'domains/alldomains.html'), 'utf8');
  for (const [symbol, name] of domains) { assert(directory.includes(symbol)); assert(directory.includes(name)); }
  for (const q of questions.slice(2)) assert.equal(copy[q.field].options.length, q.options.length);
  browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const p = await page(1280, 720);
  assert.equal(await p.$eval('.subtitle', e => e.textContent), 'בחרי את התשובה שהכי מתאימה לך.');
  assert.equal(await p.$('#eyebrow'), null);
  assert.equal(await p.$eval('body', e => getComputedStyle(e).zoom), '1');
  await p.click('#nextBtn');
  assert(await p.$eval('#hint', e => e.textContent.includes('כתבי שם')));
  await p.type('#textAnswer', 'משתתפת בדיקת ממשק');
  await p.click('#nextBtn');
  await waitStep(p, 2);
  assert.equal(await p.$eval('#questionText', e => e.textContent), 'איזה עולם הכי מסקרן אותך?');
  assert.equal(await p.$$eval('.domain-option', es => es.length), 10);
  assert.equal(await p.$eval('#nextBtn', e => e.hidden), true);
  await p.screenshot({ path: resolve(scratch, 'domains-desktop.png') });
  await p.evaluate(() => {
    const buttons = document.querySelectorAll('.option-btn');
    buttons[0].click(); buttons[1].click(); buttons[0].click();
  });
  assert.equal(await p.$eval('#stepLabel', e => e.textContent), 'שאלה 2 מתוך 15');
  assert.equal(await p.$eval('.active', e => e.dataset.code), questions[1].options[0].code);
  await waitStep(p, 3);
  await p.click('#backBtn'); await waitStep(p, 2);
  assert.equal(await p.$eval('.active', e => e.dataset.code), questions[1].options[0].code);
  await p.click('.option-btn:nth-child(2)'); await waitStep(p, 3);
  await p.click('#backBtn'); await waitStep(p, 2);
  await p.reload(); await waitStep(p, 2);
  assert.equal(await p.$eval('.active', e => e.dataset.code), questions[1].options[1].code);
  await p.click('.active'); await waitStep(p, 3);
  await p.screenshot({ path: resolve(scratch, 'answers-desktop.png') });
  const layouts = [];
  for (const [width, height] of [[1280, 720], [1366, 768], [1024, 600], [768, 600], [390, 844], [360, 640]]) {
    await p.setViewport({ width, height });
    for (let n = 3; n <= 15; n++) {
      // Exercise every question's actual rendering at every size without creating new identities.
      await p.evaluate(n => {
        const key = Object.keys(sessionStorage).find(k => k.startsWith('pairing-draft:'));
        const draft = JSON.parse(sessionStorage.getItem(key)); draft.step = n - 1; sessionStorage.setItem(key, JSON.stringify(draft));
      }, n);
      await p.reload(); await waitStep(p, n);
      const bounds = await p.evaluate(() => ({ overflowX: document.documentElement.scrollWidth > innerWidth, cardLeft: document.querySelector('.card').getBoundingClientRect().left, cardRight: document.querySelector('.card').getBoundingClientRect().right, width: innerWidth, height: document.querySelector('.card').getBoundingClientRect().height, viewport: innerHeight, minFont: Math.min(...[...document.querySelectorAll('.option-btn')].map(e => parseFloat(getComputedStyle(e).fontSize))) }));
      assert.equal(bounds.overflowX, false);
      assert(bounds.cardLeft >= 0 && bounds.cardRight <= width, JSON.stringify(bounds));
      assert(bounds.minFont >= 15);
      if (width > 620) assert(bounds.height <= height, `${width}x${height}, question ${n}: ${bounds.height}`);
      layouts.push({ width, height, question: n, ...bounds });
      if (width === 390 && n === 3) await p.screenshot({ path: resolve(scratch, 'answers-mobile.png'), fullPage: true });
    }
  }
  // Restore the point before unanswered questions; also inspect the mobile domain grid.
  await p.evaluate(() => { const key = Object.keys(sessionStorage).find(k => k.startsWith('pairing-draft:')); const d = JSON.parse(sessionStorage.getItem(key)); d.step = 1; sessionStorage.setItem(key, JSON.stringify(d)); });
  await p.reload(); await waitStep(p, 2);
  await p.screenshot({ path: resolve(scratch, 'domains-mobile.png'), fullPage: true });
  assert.equal(await p.$eval('.domain-grid', e => getComputedStyle(e).gridTemplateColumns.split(' ').length), 2);
  await p.click('.active'); await waitStep(p, 3);
  const expected = { displayName: 'משתתפת בדיקת ממשק', mainDomain: questions[1].options[1].label, mainDomainCode: questions[1].options[1].code };
  for (let n = 3; n <= 14; n++) {
    const q = questions[n - 1], index = (n - 1) % q.options.length;
    expected[q.field] = q.options[index].label; expected[q.field + 'Code'] = q.options[index].code;
    await p.click(`.option-btn:nth-child(${index + 1})`); await waitStep(p, n + 1);
  }
  failSubmit = true; delaySubmit = true;
  const last = questions.at(-1).options[0];
  expected.startStyle = last.label; expected.startStyleCode = last.code;
  await p.click('.option-btn');
  await p.waitForFunction(() => document.querySelector('#hint').textContent.includes('שומרות'));
  assert(p.url().includes('/questionnaire.html'));
  assert.equal(await p.$eval('#savingMessage', e => e.hidden), true);
  await p.waitForSelector('#retryBtn:not([hidden])');
  assert.equal(submissions, 1);
  assert(await p.$eval('#hint', e => e.textContent.includes('התשובות נשמרו')));
  await p.click('#retryBtn');
  await p.waitForSelector('#retryBtn:not([hidden])');
  assert.equal(submissions, 2);
  await p.reload(); await waitStep(p, 15);
  assert.equal(await p.$eval('.active', e => e.dataset.code), last.code);
  failSubmit = false;
  await p.click('.active');
  await p.waitForSelector('#waiting-test');
  assert.equal(submissions, 3);
  assert.deepEqual(payloads[2], expected);
  assert.deepEqual(payloads[0], expected);
  assert.deepEqual(payloads[1], expected);
  assert.deepEqual(validatedAnswers(payloads[1]), expected);
  const stored = (await h.db.query('select answers,completed_at from public.pairing_participants')).rows;
  assert.equal(stored.length, 1); assert(stored[0].completed_at); assert.deepEqual(stored[0].answers, expected);
  const canonical = Array.from({ length: 8 }, (_, i) => ({ ...expected, id: String(i) }));
  const submitted = canonical.map(row => ({ ...payloads[1], id: row.id }));
  const normalize = rows => rows.map(({ createdAt, id, ...row }) => row);
  assert.deepEqual(normalize(generateGroups(canonical)), normalize(generateGroups(submitted)));
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'passed', layout_checks: layouts.length, viewport_sizes: 6, auto_advance: true, double_click_guard: true, back_and_change: true, reload_recovery: true, submit_failure_recovery: true, database_saved: true, canonical_payload_unchanged: true, algorithm_unchanged: true, screenshots: scratch }));
} finally {
  await browser?.close(); await new Promise(r => server.close(r)); await h.db.close();
}

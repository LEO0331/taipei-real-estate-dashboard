/** Focused production layout, formula preservation and notice-discovery regression. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const port = Number(process.env.CLOSURE_TEST_PORT ?? 4392);
const url = `http://127.0.0.1:${port}/taipei-real-estate-dashboard/`;
const output = process.env.CLOSURE_OUTPUT_DIR ?? '.cache/closure';
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore', windowsHide: true });
const expectedNotices = await readFile('public/THIRD_PARTY_NOTICES.txt', 'utf8');
assert.equal(await readFile('dist/THIRD_PARTY_NOTICES.txt', 'utf8'), expectedNotices);
const records = JSON.parse(await readFile('public/data/land-value-tax-progressive-brackets.json', 'utf8'));
const selected = records.find(record => record.isLatestRecord) ?? records.at(-1);
let browser;
const checks = [], errors = [];
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(url)).ok) { ready = true; break; } } catch {}
    await new Promise(done => setTimeout(done, 100));
  }
  assert.ok(ready);
  browser = await chromium.launch();
  for (const language of ['en', 'zh']) for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: language === 'en' ? 'EN' : '中', exact: true }).click();
    await page.getByRole('button', { name: language === 'en' ? 'Explore Data' : '探索資料', exact: true }).click();
    await page.locator('.explore-result-group').getByRole('button', { name: language === 'en' ? 'Land Value Tax' : '地價稅級距', exact: true }).click();
    const formula = page.locator('.land-tax-formulas pre');
    await formula.waitFor();
    assert.equal(await formula.textContent(), selected.generalLandTaxFormulaRaw);
    const layout = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, formulaOverflow: getComputedStyle(document.querySelector('.land-tax-formulas pre')).overflowX }));
    assert.ok(layout.scroll <= layout.client + 1, JSON.stringify(layout));
    assert.equal(layout.formulaOverflow, 'auto');
    assert.equal(await page.locator('main .recharts-wrapper').count(), 7);
    await page.screenshot({ path: `${output}/land-tax-${language}-${width}.png` });
    checks.push({ language, width, check: 'formula-content-and-mobile-layout', layout, pass: true });
    const link = page.getByRole('link', { name: language === 'en' ? 'Software licenses and attribution' : '軟體授權與出處', exact: true });
    await link.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL('**/THIRD_PARTY_NOTICES.txt');
    assert.equal(await page.locator('body').innerText(), expectedNotices.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n'));
    checks.push({ language, width, check: 'keyboard-discoverable-complete-notices', sha256: createHash('sha256').update(expectedNotices).digest('hex'), pass: true });
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(`${output}/verification.json`, JSON.stringify({ checks, errors, pass: true }, null, 2));
  console.log(JSON.stringify({ checks: checks.length, errors, pass: true }));
} finally { await browser?.close(); server.kill(); }

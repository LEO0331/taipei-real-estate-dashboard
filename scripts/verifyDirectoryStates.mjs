/** Production UI regressions for unavailable directory data and empty filters. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const port = Number(process.env.DIRECTORY_TEST_PORT ?? 4388);
const url = `http://127.0.0.1:${port}/taipei-real-estate-dashboard/`;
const output = process.env.DIRECTORY_OUTPUT_DIR ?? '.cache/directory-states';
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore', windowsHide: true });
let browser;
const checks = [];
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(url)).ok) { ready = true; break; } } catch {}
    await new Promise(done => setTimeout(done, 100));
  }
  assert.ok(ready, 'Loopback production preview ready');
  browser = await chromium.launch();
  for (const language of ['en', 'zh']) for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const rentalPath = '**/data/rental-housing-service-businesses/records.json';
    // Invalid JSON also reproduces the static preview's HTML fallback for a missing file.
    await context.route(rentalPath, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<html>Missing snapshot</html>' }));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: language === 'en' ? 'EN' : '中', exact: true }).click();
    const open = async (name) => {
      await page.getByRole('button', { name: language === 'en' ? 'Explore Data' : '探索資料', exact: true }).click();
      await page.locator('.explore-result-group').getByRole('button', { name, exact: true }).click();
    };
    const rentalName = language === 'en' ? 'Rental Housing Service Businesses' : '租賃住宅服務業者';
    await open(rentalName);
    await page.getByRole('status').filter({ hasText: language === 'en' ? 'Unavailable data does not mean zero' : '資料未提供不代表業者紀錄為零' }).waitFor();
    assert.equal(await page.locator('main .metric-strip').count(), 0);
    checks.push(`${language}/${width}/unavailable-does-not-report-zero`);
    await page.screenshot({ path: `${output}/${language}-${width}-unavailable.png` });
    await context.unroute(rentalPath);
    await context.route(rentalPath, route => route.fulfill({ json: [] }));
    await open(language === 'en' ? 'Public Works Excellence Award Projects' : '公共工程卓越獎得獎工程');
    const search = page.getByPlaceholder(language === 'en' ? 'Search project, category, or organizations' : '搜尋工程、類別或參與單位');
    await search.fill('audit-no-match-932573');
    const yearMetric = page.locator('main .metric-strip > div').filter({ hasText: language === 'en' ? 'Award years' : '年度範圍' });
    assert.equal((await yearMetric.innerText()).trim(), `${language === 'en' ? 'Award years' : '年度範圍'}\n—`);
    assert.equal((await page.locator('main').innerText()).includes('Infinity'), false);
    checks.push(`${language}/${width}/empty-filter-has-no-year-range`);
    await page.screenshot({ path: `${output}/${language}-${width}-empty.png` });
    await open(rentalName);
    await page.locator('main .metric-strip').waitFor();
    assert.equal(await page.getByRole('status').count(), 0);
    assert.match(await page.locator('main').innerText(), language === 'en' ? /Business records\n0/ : /業者紀錄\n0/);
    checks.push(`${language}/${width}/valid-empty-snapshot-is-distinct`);
    assert.deepEqual(errors, []);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await context.close();
  }
  await writeFile(`${output}/verification.json`, JSON.stringify({ checks, pass: true }, null, 2));
  console.log(JSON.stringify({ checks: checks.length, pass: true }));
} finally { await browser?.close(); server.kill(); }

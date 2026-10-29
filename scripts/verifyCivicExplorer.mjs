/** Regression checks against the built dashboard; no official data is fetched. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
function option(name) { const index = args.indexOf(name); if (index < 0) return undefined; if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Missing value for ${name}`); return args[index + 1]; }
const hostedUrl = option('--url');
const expectedSha = option('--expected-sha');
if (expectedSha && !/^[a-f0-9]{40}$/i.test(expectedSha)) throw new Error('--expected-sha must be a full commit SHA');
const root = process.cwd();
const port = Number(process.env.EXPLORER_TEST_PORT ?? 4287);
const base = '/taipei-real-estate-dashboard/';
const url = hostedUrl ?? `http://127.0.0.1:${port}${base}`;
const output = resolve(process.env.BROWSER_OUTPUT_DIR ?? '.cache/civic-explorer');
await mkdir(output, { recursive: true });
const server = hostedUrl ? undefined : spawn(process.execPath, [
  resolve(dirname(require.resolve('vite/package.json')), 'bin/vite.js'),
  'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort',
  '--outDir', resolve(process.env.EXPLORER_BUILD_DIR ?? 'dist'),
], { cwd: root, stdio: 'ignore', windowsHide: true });
const checks = [], pageErrors = [], consoleErrors = [], screenshots = [];
let browser;
async function check(name, action) {
  try { const evidence = await action(); checks.push({ name, pass: true, evidence }); }
  catch (error) { checks.push({ name, pass: false, error: String(error) }); }
}
try {
  if (server) {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { if ((await fetch(url)).ok) { ready = true; break; } } catch {}
      await new Promise(done => setTimeout(done, 100));
    }
    assert.ok(ready, 'Loopback production preview did not become ready');
  }
  if (expectedSha) await check('published-release-identity', async () => {
    let actual, lastFailure;
    for (let attempt = 0; attempt < 12; attempt++) {
      const manifestUrl = new URL(`release-manifest.json?audit=${Date.now()}-${attempt}`, url.endsWith('/') ? url : `${url}/`);
      try { const response = await fetch(manifestUrl, { signal: AbortSignal.timeout(10000), cache: 'no-store' }); if (response.ok) { const manifest = await response.json(); actual = manifest.codeSha; if (actual === expectedSha) {
        assert.equal(manifest.schemaVersion, 1);
        assert.ok(Array.isArray(manifest.dataFiles));
        const verified = [];
        for (const name of ['conversion-report.json', 'urban-renewal-decision/snapshot.json', 'real-price-summary.json']) {
          const entry = manifest.dataFiles.find(file => file.path === name);
          assert.match(entry?.sha256 ?? '', /^[a-f0-9]{64}$/);
          const dataUrl = new URL('data/' + name, url.endsWith('/') ? url : url + '/');
          dataUrl.searchParams.set('release-check', Date.now().toString());
          const data = await fetch(dataUrl, { signal: AbortSignal.timeout(10000), cache: 'no-store' });
          assert.ok(data.ok, name + ' response');
          const digest = createHash('sha256').update(Buffer.from(await data.arrayBuffer())).digest('hex');
          assert.equal(digest, entry.sha256, name + ' served bytes must match published manifest');
          verified.push({ path: name, sha256: digest });
        }
        return { codeSha: actual, verified, scope: 'Commit plus three critical served data files; remaining hashes retained in manifest, not a full CDN byte sweep.' };
      } } } catch (error) { lastFailure = error; }
      if (attempt < 11) await new Promise(done => setTimeout(done, 2000));
    }
    assert.fail('Published release identity/data verification failed: ' + (lastFailure ? String(lastFailure) : `expected ${expectedSha}, received ${actual}`));
  });
  browser = await chromium.launch();
  for (const language of ['en', 'zh']) for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => pageErrors.push({ language, width, message: error.message }));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push({ language, width, message: message.text() }); });
    page.setDefaultTimeout(5000);
    const testCache = !hostedUrl && language === 'en' && width === 320;
    if (testCache) {
      await context.route(url, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Prior cache fixture</title>' }));
      await page.goto(url);
      await page.evaluate(async () => { const cache = await caches.open('taipei-dashboard-v42-civic-explorer'); await cache.put('./prior-cache-marker', new Response('retained old cache fixture')); });
      await context.unroute(url);
    }
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: language === 'en' ? 'EN' : '中', exact: true }).click();
    const entryName = language === 'en' ? 'Explore Data' : '探索資料';
    await page.getByRole('button', { name: entryName, exact: true }).click();
    await page.locator('.data-explorer').waitFor();
    const prefix = `${language}/${width}`;
    await check(`${prefix}/complete-catalogue`, async () => {
      assert.equal(await page.locator('.explore-hub').count(), 5);
      assert.equal(await page.locator('.explore-result-group li').count(), 46);
      await page.waitForFunction(() => document.activeElement === document.querySelector('.explore-header h1'), undefined, { timeout: 3000 });
    });
    const screenshot = `${language}-${width}.png`;
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: resolve(output, screenshot) });
    screenshots.push(screenshot);
    await page.locator('.explore-hub').nth(1).click();
    await page.locator('.explore-view button').nth(1).click();
    await page.locator('.explore-status button').focus();
    await page.keyboard.press('Enter');
    await check(`${prefix}/list-reset-focus`, async () => {
      await page.waitForFunction(() => document.activeElement === document.querySelector('.explore-results h2'), undefined, { timeout: 3000 });
      assert.equal(await page.locator('.explore-result-group li').count(), 46);
    });
    const search = page.locator('.explore-controls input');
    await search.fill('no-dataset-matches-979797');
    await page.locator('.explore-empty button').focus();
    await page.keyboard.press('Enter');
    await check(`${prefix}/empty-clear-focus`, async () => {
      await page.waitForFunction(() => document.activeElement === document.querySelector('.explore-controls input'), undefined, { timeout: 3000 });
      assert.equal(await search.inputValue(), '');
      assert.equal(await page.locator('.explore-result-group li').count(), 46);
    });
    await page.locator('.explore-view button').first().click();
    await page.locator('.explore-hub').nth(2).click();
    await page.keyboard.press('Escape');
    await check(`${prefix}/escape-hub-focus`, async () => {
      await page.waitForFunction(() => document.activeElement === document.querySelectorAll('.explore-hub')[2], undefined, { timeout: 3000 });
    });
    await check(`${prefix}/touch-targets-and-overflow`, async () => {
      const sizes = await page.locator('.data-explorer button, .data-explorer input').evaluateAll(elements => elements
        .filter(element => element.getBoundingClientRect().height > 0)
        .map(element => { const box = element.getBoundingClientRect(); return { label: element.textContent?.trim() || element.getAttribute('placeholder'), width: box.width, height: box.height }; }));
      assert.deepEqual(sizes.filter(item => item.width < 44 || item.height < 44), []);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      return { targets: sizes.length, minimumHeight: Math.min(...sizes.map(item => item.height)) };
    });
    await check(`${prefix}/keyboard-focus-and-reduced-motion`, async () => {
      await page.locator('.explore-hub').first().focus();
      await page.keyboard.press('Tab');
      const visual = await page.evaluate(() => ({
        outline: getComputedStyle(document.activeElement).outlineStyle,
        outlineWidth: parseFloat(getComputedStyle(document.activeElement).outlineWidth),
        transition: getComputedStyle(document.querySelector('.explore-lift')).transitionDuration,
      }));
      assert.equal(visual.outline, 'solid');
      assert.ok(visual.outlineWidth >= 3);
      assert.equal(visual.transition, '0s');
      return visual;
    });
    await page.locator('.explore-back').click();
    await check(`${prefix}/back-entry-focus`, async () => {
      await page.waitForFunction(name => document.activeElement?.textContent?.trim() === name, entryName, { timeout: 3000 });
    });
    if (testCache) {
      await check('seeded-v42-cache-cleanup-on-activation', async () => {
        await page.evaluate(async () => { await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Worker activation timeout')), 10000))]); });
        await page.waitForFunction(async () => (await caches.keys()).includes('taipei-dashboard-v43-civic-explorer-maintenance'), undefined, { timeout: 5000 });
        const keys = await page.evaluate(() => caches.keys());
        assert.ok(!keys.includes('taipei-dashboard-v42-civic-explorer'));
        return { keys, scope: 'Real browser activation deletes a seeded previous-version cache; not proof of live existing-worker upgrade.' };
      });
      await check('warm-cache-offline-explorer', async () => {
        await page.reload({ waitUntil: 'networkidle' });
        await page.getByRole('button', { name: /^(Explore Data|探索資料)$/, exact: true }).click();
        await page.locator('.data-explorer').waitFor();
        await page.locator('.explore-back').click();
        await context.setOffline(true);
        try {
          await page.reload();
          await page.getByRole('button', { name: /^(Explore Data|探索資料)$/, exact: true }).click();
          await page.locator('.data-explorer').waitFor();
          assert.equal(await page.locator('.explore-hub').count(), 5);
          assert.equal(await page.locator('.explore-result-group li').count(), 46);
          return { scope: 'Warm-cache local origin only; cold offline first visit is not supported.' };
        } finally { await context.setOffline(false); }
      });
    }
    await context.close();
  }
} finally {
  await browser?.close();
  server?.kill();
  const expectedChecks = 42 + (hostedUrl ? 0 : 2) + (expectedSha ? 1 : 0);
  const pass = checks.length === expectedChecks && checks.every(check => check.pass) && pageErrors.length === 0 && consoleErrors.length === 0;
  const report = { checkedAt: new Date().toISOString(), url, expectedSha, scope: 'Chromium production preview; three widths, both languages, keyboard/reset/target regressions; not full WCAG or live deployment certification.', checks, screenshots, pageErrors, consoleErrors, pass };
  await writeFile(resolve(output, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ checks: checks.length, passed: checks.filter(check => check.pass).length, failures: checks.filter(check => !check.pass), pageErrors, consoleErrors, pass }));
  if (!pass) process.exitCode = 1;
}

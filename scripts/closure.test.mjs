import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { buildThirdPartyNotices } from './generateThirdPartyNotices.mjs';

test('actual worker activation deletes owned legacy caches and preserves sibling app data', async () => {
  const handlers = new Map();
  const current = 'taipei-dashboard-v44-closure';
  const siblings = ['portfolio-v3', 'taipei-safety-map-v22', 'taipei-friendly-food-map-v12', 'taipei-dashboardish-user-cache'];
  const storage = new Map([current, 'taipei-dashboard-v1', 'taipei-dashboard-v43-civic-explorer-maintenance', ...siblings].map(name => [name, `retained:${name}`]));
  const events = [];
  runInNewContext(await readFile('public/sw.js', 'utf8'), {
    self: { addEventListener: (name, handler) => handlers.set(name, handler), clients: { claim: () => { events.push('claim'); } } },
    caches: { keys: async () => [...storage.keys()], delete: async name => { events.push(name); return storage.delete(name); } },
  });
  let lifetime;
  handlers.get('activate')({ waitUntil: promise => { lifetime = promise; } });
  assert.deepEqual(events, []);
  await lifetime;
  assert.deepEqual([...storage.keys()], [current, ...siblings]);
  for (const name of siblings) assert.equal(storage.get(name), `retained:${name}`);
  assert.deepEqual(events, ['taipei-dashboard-v1', 'taipei-dashboard-v43-civic-explorer-maintenance', 'claim']);
});

test('published notices preserve every locked installed runtime license text plus copied attribution', async () => {
  const { text, inventory } = await buildThirdPartyNotices();
  assert.equal(inventory.length, 45);
  assert.equal(inventory.reduce((n, item) => n + item.licenses.length, 0), 58);
  for (const entry of inventory) for (const license of entry.licenses) {
    assert.ok(text.includes(license.text), `${entry.name}: full ${license.source}`);
    assert.ok(text.includes(license.sha256));
  }
  assert.ok(text.includes((await readFile('LICENSE', 'utf8')).replace(/\r\n/g, '\n')));
  assert.ok(text.includes('src/components/explorer/HexIsland.tsx. Copyright (c) 2026 LeoChen.'));
  assert.ok(!text.includes('export type CivicExplorerGroup'));
  assert.ok(text.includes('Permission is hereby granted'));
  const victory = inventory.find(item => item.name === 'victory-vendor');
  assert.equal(victory.licenses.length, 14);
  assert.ok(victory.licenses.some(item => item.url?.includes('/v37.3.6/LICENSE.txt')));
  assert.equal(await readFile('public/THIRD_PARTY_NOTICES.txt', 'utf8'), text);
});

test('notice generation fails on absent license text or an installed version differing from lock', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dashboard-notices-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'src'), { recursive: true });
  await mkdir(join(root, 'node_modules/example'), { recursive: true });
  await writeFile(join(root, 'LICENSE'), await readFile('LICENSE'));
  await writeFile(join(root, 'src/CivicExplorer.tsx'), await readFile('src/CivicExplorer.tsx'));
  await writeFile(join(root, 'package-lock.json'), JSON.stringify({ packages: { 'node_modules/example': { version: '1.0.0' } } }));
  await writeFile(join(root, 'node_modules/example/package.json'), JSON.stringify({ name: 'example', version: '1.0.0' }));
  await assert.rejects(buildThirdPartyNotices(root), /No complete license text/);
  await writeFile(join(root, 'node_modules/example/LICENSE'), 'Publisher text retained verbatim.');
  await writeFile(join(root, 'node_modules/example/package.json'), JSON.stringify({ name: 'example', version: '2.0.0' }));
  await assert.rejects(buildThirdPartyNotices(root), /Installed version differs from lock/);
});

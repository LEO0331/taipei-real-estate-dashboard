import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { retainedSources, stageRetainedSource } from './retainedSource.ts';
import { buildReleaseManifest, requiredJsonPaths, validateConversionReport, writeReleaseManifest } from './verifyReleaseData.ts';

const codeSha = '1'.repeat(40);
const duplicateWarning = 'Duplicate year-branch-item row: 2017|古亭分處|小計';
const report = () => ({ generatedAt: '2026-10-29T00:00:00.000Z', sources: [{ dataset: 'Fixture', file: 'source.csv', sourceUrl: 'https://example.test/source', status: 'converted' }], warnings: [duplicateWarning] });
async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const prefix = join(tmpdir(), 'dashboard-release-');
  const root = await mkdtemp(prefix);
  t.after(async () => { assert.ok(root.startsWith(prefix)); await rm(root, { recursive: true, force: true }); });
  async function put(path: string, content: string | object) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), typeof content === 'string' ? content : JSON.stringify(content));
  }
  await put('src/App.tsx', "loadJson<Fixture[]>('real-price-records.json');");
  await put('public/data/real-price-records.json', [{ id: 'fixture' }]);
  await put('public/data/conversion-report.json', report());
  await put('public/data/urban-renewal-decision/snapshot.json', { snapshotId: 'ure-fixture', analysisAsOf: '2026-10-19', generatedAt: '2026-10-19T00:00:00.000Z', renewalUnits: {} });
  for (const source of retainedSources) await put(source.path, source.requiredHeaders.join(',') + '\n' + source.requiredHeaders.map(() => '1').join(',') + '\n');
  return { root, put };
}

test('retained source verification resolves only its obsolete copy warning and never invents a download date', async t => {
  const { root, put } = await fixture(t);
  const source = retainedSources[0];
  const old = { ...report(), warnings: [source.warningPrefix + '/Users/Leo/Downloads/old.csv', duplicateWarning, 'Unknown quality observation retained'] };
  await put('public/data/conversion-report.json', old);
  const result = await stageRetainedSource(source, { root });
  assert.equal(result.mode, 'retained-static-input');
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
  const next = JSON.parse(await readFile(join(root, 'public/data/conversion-report.json'), 'utf8'));
  assert.deepEqual(next.warnings, [duplicateWarning, 'Unknown quality observation retained']);
  const entry = next.sources.find((item: { dataset: string }) => item.dataset === source.dataset);
  assert.equal(entry.downloadedAt, undefined);
  assert.ok(entry.notes.some((note: string) => note.includes('publication and retrieval dates are unknown')));
});

test('missing, empty and malformed retained inputs fail; invalid imports preserve last-good bytes and report', async t => {
  const { root, put } = await fixture(t);
  const source = retainedSources[0];
  const before = await readFile(join(root, source.path), 'utf8');
  const beforeReport = await readFile(join(root, 'public/data/conversion-report.json'), 'utf8');
  await assert.rejects(stageRetainedSource(source, { root, importPath: 'missing.csv' }), /ENOENT/);
  await put('empty.csv', '');
  await assert.rejects(stageRetainedSource(source, { root, importPath: 'empty.csv' }), /Invalid retained CSV size/);
  await put('bad.csv', 'not-a-table');
  await assert.rejects(stageRetainedSource(source, { root, importPath: 'bad.csv' }), /header and data rows/);
  await put('wrong-schema.csv', 'foo,bar\n1,2\n');
  await assert.rejects(stageRetainedSource(source, { root, importPath: 'wrong-schema.csv' }), /Unexpected retained CSV schema/);
  assert.equal(await readFile(join(root, source.path), 'utf8'), before);
  assert.equal(await readFile(join(root, 'public/data/conversion-report.json'), 'utf8'), beforeReport);
});

test('explicit local imports are validated and staged without claiming authoritative freshness', async t => {
  const { root, put } = await fixture(t);
  await put('new-upload.csv', '年別,基本分類,原始值[統計數值]\n2026,總指數,2\n');
  const result = await stageRetainedSource(retainedSources[0], { root, importPath: 'new-upload.csv' });
  assert.equal(result.mode, 'configured-local-import');
  assert.equal(await readFile(join(root, retainedSources[0].path), 'utf8'), '年別,基本分類,原始值[統計數值]\n2026,總指數,2\n');
});

test('release records exact code/data hashes deterministically and preserves historical snapshot identity and quality warnings', async t => {
  const { root, put } = await fixture(t);
  const first = await buildReleaseManifest({ root, codeSha });
  const second = await buildReleaseManifest({ root, codeSha });
  assert.deepEqual(first, second);
  assert.equal(first.codeSha, codeSha);
  assert.equal(first.snapshot.id, 'ure-fixture');
  assert.equal(first.snapshot.analysisAsOf, '2026-10-19');
  assert.deepEqual(first.conversion.warnings, [duplicateWarning]);
  assert.equal(first.retainedInputs[0].publicationDate, null);
  await put('public/data/real-price-records.json', [{ id: 'changed' }]);
  const changed = await buildReleaseManifest({ root, codeSha });
  assert.notEqual(first.dataFiles.find(file => file.path === 'real-price-records.json')!.sha256, changed.dataFiles.find(file => file.path === 'real-price-records.json')!.sha256);
});

test('release gate rejects missing runtime data and malformed JSON without replacing previous release evidence', async t => {
  const { root, put } = await fixture(t);
  await writeReleaseManifest({ root, codeSha });
  const before = await readFile(join(root, 'public/release-manifest.json'), 'utf8');
  await put('src/App.tsx', "loadJson('missing.json');");
  await assert.rejects(writeReleaseManifest({ root, codeSha }), /Missing application data: missing.json/);
  await put('src/App.tsx', "loadJson('real-price-records.json');");
  await put('public/data/real-price-records.json', '{invalid');
  await assert.rejects(writeReleaseManifest({ root, codeSha }), /Malformed JSON/);
  assert.equal(await readFile(join(root, 'public/release-manifest.json'), 'utf8'), before);
});

test('release gate rejects failed sources, malformed warning schema and unresolved stale copy failures', () => {
  assert.throws(() => validateConversionReport({ ...report(), sources: [{ dataset: 'Fixture', file: 'a.csv', status: 'failed' }] }), /missing, failed or malformed/);
  assert.throws(() => validateConversionReport({ ...report(), warnings: 'not-an-array' }), /schema/);
  assert.throws(() => validateConversionReport({ ...report(), warnings: [null] }), /warning schema/);
  assert.throws(() => validateConversionReport({ ...report(), warnings: [retainedSources[0].warningPrefix + 'old.csv'] }), /Unresolved legacy/);
  assert.throws(() => validateConversionReport({ ...report(), sources: [{ dataset: 'Fixture', file: 'a.csv', status: 'available', sourceUrl: 'javascript:bad()' }] }), /Invalid source URL/);
  assert.deepEqual(validateConversionReport({ ...report(), warnings: ['New quality observation'] }).warnings, ['New quality observation']);
});

test('release gate validates dynamic permit chunk paths/counts and requires an exact commit', async t => {
  const { root, put } = await fixture(t);
  await put('public/data/building-use-permits/manifest.json', { chunks: [{ path: '../escape.json', recordCount: 1 }] });
  await assert.rejects(buildReleaseManifest({ root, codeSha }), /Unsafe data reference/);
  await put('public/data/building-use-permits/manifest.json', { chunks: [{ path: 'chunks/one.json', recordCount: 2 }] });
  await put('public/data/building-use-permits/chunks/one.json', [{ id: 1 }]);
  await assert.rejects(buildReleaseManifest({ root, codeSha }), /inconsistent permit chunk/);
  await assert.rejects(buildReleaseManifest({ root, codeSha: 'main' }), /exact 40-character/);
  assert.deepEqual(requiredJsonPaths("loadJson<T>('one.json'); loadJson<T>(dynamic);"), ['conversion-report.json', 'one.json', 'urban-renewal-decision/snapshot.json']);
});

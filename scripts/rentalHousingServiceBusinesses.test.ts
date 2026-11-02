import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { convertRentalHousingServiceBusinesses } from './convertRentalHousingServiceBusinesses.ts';
import { readCsv } from './data.ts';

test('reviewed official rental snapshot reproduces all415 source rows and raw fields', async t => {
  const root = await mkdtemp(join(tmpdir(), 'rental-reproduce-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = 'data/raw/rental-housing-service-businesses';
  await mkdir(join(root, directory), { recursive: true });
  for (const file of ['source.csv', 'provenance.json']) await writeFile(join(root, directory, file), await readFile(join(directory, file)));
  const records = await convertRentalHousingServiceBusinesses(root);
  const source = await readCsv(join(directory, 'source.csv'));
  assert.equal(records.length, 415);
  assert.deepEqual(records.map(r => r.sourceRaw), source);
  assert.equal(new Set(records.map(r => r.registrationNumber)).size, 415);
  assert.equal(records.filter(r => r.practiceStatusRaw === '執業中').length, 415);
  for (const file of ['records.json', 'summary.json', 'metadata.json']) assert.deepEqual(JSON.parse(await readFile(join(root, 'public/data/rental-housing-service-businesses', file), 'utf8')), JSON.parse(await readFile(join('public/data/rental-housing-service-businesses', file), 'utf8')));
});

test('missing, empty, changed and incompatible rental source never replaces last-good output', async t => {
  const root = await mkdtemp(join(tmpdir(), 'rental-invalid-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const raw = join(root, 'data/raw/rental-housing-service-businesses');
  const output = join(root, 'public/data/rental-housing-service-businesses/records.json');
  await mkdir(raw, { recursive: true });
  await mkdir(join(root, 'public/data/rental-housing-service-businesses'), { recursive: true });
  await writeFile(output, '[{"lastGood":true}]');
  const provenance = JSON.parse(await readFile('data/raw/rental-housing-service-businesses/provenance.json', 'utf8'));
  await writeFile(join(raw, 'provenance.json'), JSON.stringify(provenance));
  await assert.rejects(convertRentalHousingServiceBusinesses(root), /ENOENT/);
  for (const value of ['', 'wrong,headers\n1,2\n', '縣市,機關代碼,登錄號碼,租賃業名稱,執業狀態\n臺北市,379700000A,,Example,執業中\n']) {
    await writeFile(join(raw, 'source.csv'), value);
    await assert.rejects(convertRentalHousingServiceBusinesses(root), /identity\/hash/);
    await writeFile(join(raw, 'provenance.json'), JSON.stringify({ ...provenance, sha256: createHash('sha256').update(value).digest('hex') }));
    await assert.rejects(convertRentalHousingServiceBusinesses(root), /empty or has incompatible/);
    await writeFile(join(raw, 'provenance.json'), JSON.stringify(provenance));
    assert.equal(await readFile(output, 'utf8'), '[{"lastGood":true}]');
  }
});

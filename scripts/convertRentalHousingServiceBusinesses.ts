import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getColumn, readCsv, updateConversionReport, writeJson } from './data.ts';

const clean = (value: unknown) => { const text = String(value ?? '').trim(); return text && !['-', '--'].includes(text) ? text : undefined; };
const normalize = (value: string | undefined) => value?.replace(/\s+/g, '').toLowerCase();
const status = (value: string | undefined) => /終止|廢止|撤銷/.test(value ?? '') ? 'terminated' : /停業|暫停/.test(value ?? '') ? 'suspended' : /執業|營業|開業/.test(value ?? '') ? 'active' : 'unknown';
export async function convertRentalHousingServiceBusinesses(root = '.') {
  const directory = join(root, 'data/raw/rental-housing-service-businesses');
  const file = join(directory, 'source.csv');
  const provenance = JSON.parse(await readFile(join(directory, 'provenance.json'), 'utf8'));
  const hash = createHash('sha256').update(await readFile(file)).digest('hex');
  if (provenance.sha256 !== hash || provenance.datasetId !== '6c1f5836-30fe-43fe-82b0-3f54f0c6c78e' || provenance.resourceId !== '75e116b7-b024-4437-8100-1fa1fcbdbd31') throw new Error('Rental source identity/hash requires review');
  const rows = await readCsv(file);
  const headers = ['縣市', '機關代碼', '登錄號碼', '租賃業名稱', '執業狀態'];
  if (!rows.length || Object.keys(rows[0]).length !== headers.length || headers.some(header => !Object.hasOwn(rows[0], header)) || rows.some(row => !row['登錄號碼']?.trim() || !row['租賃業名稱']?.trim())) throw new Error('Rental source is empty or has incompatible schema/identifiers');
  const seen = new Set<string>(); let duplicates = 0;
  const records = rows.flatMap((row) => { const cityName = clean(getColumn(row, ['縣市'])); const authorityCode = clean(getColumn(row, ['機關代碼'])); const registrationNumber = clean(getColumn(row, ['登錄號碼'])); const businessName = clean(getColumn(row, ['租賃業名稱'])); const practiceStatusRaw = clean(getColumn(row, ['執業狀態'])); const key = registrationNumber ?? [businessName, authorityCode, cityName].join('|'); if (seen.has(key)) { duplicates += 1; return []; } seen.add(key); return [{ id: createHash('sha1').update(key).digest('hex').slice(0, 16), cityName, authorityCode, registrationNumber, businessName, practiceStatusRaw, practiceStatusNormalized: status(practiceStatusRaw), cityNameNormalized: normalize(cityName), authorityCodeNormalized: normalize(authorityCode), registrationNumberNormalized: normalize(registrationNumber), businessNameNormalized: normalize(businessName), hasRegistrationNumber: !!registrationNumber, sourceRaw: row }]; });
  const output = join(root, 'public/data/rental-housing-service-businesses');
  await writeJson(join(output, 'records.json'), records); await writeJson(join(output, 'summary.json'), { totalRecords: records.length, dataQuality: { duplicateRegistrationNumberCount: duplicates, missingBusinessNameCount: records.filter(r => !r.businessName).length, missingRegistrationNumberCount: records.filter(r => !r.registrationNumber).length, unknownCityCount: records.filter(r => !r.cityName).length, unmappedPracticeStatusCount: records.filter(r => r.practiceStatusNormalized === 'unknown').length } });
  await writeJson(join(output, 'metadata.json'), provenance);
  await updateConversionReport({ dataset: provenance.title, file, sourceUrl: provenance.sourceUrl, status: 'converted', downloadedAt: provenance.retrievedAt, notes: [`${records.length} source-listed registrations; retained SHA256 ${hash}.`, `Catalogue coverage through ${provenance.coverageThrough}; resource update ${provenance.resourceUpdatedAt}. Retrieval/conversion do not establish current practice status.`] }, [], { reportPath: join(root, 'public/data/conversion-report.json') });
  return records;
}
if (process.argv[1]?.endsWith('convertRentalHousingServiceBusinesses.ts')) console.log((await convertRentalHousingServiceBusinesses()).length);

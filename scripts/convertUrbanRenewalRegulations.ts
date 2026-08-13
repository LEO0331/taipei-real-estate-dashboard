import { createHash } from 'node:crypto';
import { getColumn, listCsvFiles, readCsv, writeJson, type CsvRow } from './data.ts';

export type UrbanRenewalRegulationRecord = {
  id: string; sourceSequenceNumber: string; title: string; rocDateRaw: string;
  rocYear: number | null; rocMonth: number | null; rocDay: number | null;
  gregorianDate: string | null; gregorianYear: number | null;
  articleTypeRaw: string; articleType: string; countyCodeRaw: string; countyCode: string;
  hasValidDate: boolean; sourceRaw: CsvRow;
};

const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
const header = { sequence: 'SeqNo（編號）', title: 'ItemName（標題）', date: '民國年月日（民國日期）', type: 'ArticleType', county: 'CountyCode' };

export function parseRocDate(raw: string) {
  const value = clean(raw).replace(/年|月/g, '/').replace(/日/g, '').replace(/\s/g, '');
  const compact = value.match(/^(\d{3})(\d{2})(\d{2})$/);
  const separated = value.match(/^(\d{2,3})\/(\d{1,2})\/(\d{1,2})$/);
  const parts = compact ? [compact[1], compact[2], compact[3]] : separated?.slice(1);
  if (!parts) return { rocYear: null, rocMonth: null, rocDay: null, gregorianYear: null, gregorianDate: null, hasValidDate: false };
  const [rocYear, rocMonth, rocDay] = parts.map(Number);
  const gregorianYear = rocYear + 1911;
  const date = new Date(Date.UTC(gregorianYear, rocMonth - 1, rocDay));
  if (!rocYear || rocMonth < 1 || rocMonth > 12 || rocDay < 1 || rocDay > 31 || date.getUTCFullYear() !== gregorianYear || date.getUTCMonth() !== rocMonth - 1 || date.getUTCDate() !== rocDay) return { rocYear: null, rocMonth: null, rocDay: null, gregorianYear: null, gregorianDate: null, hasValidDate: false };
  return { rocYear, rocMonth, rocDay, gregorianYear, gregorianDate: `${gregorianYear}-${String(rocMonth).padStart(2, '0')}-${String(rocDay).padStart(2, '0')}`, hasValidDate: true };
}

export function normalizeArticleType(raw: string) { return clean(raw) || 'unknown'; }
export function stableRegulationId(sequence: string, raw: CsvRow) { return sequence ? `urban-renewal-regulation-${sequence}` : `urban-renewal-regulation-${createHash('sha1').update(JSON.stringify(raw)).digest('hex').slice(0, 12)}`; }

export function convertUrbanRenewalRegulationRows(rows: CsvRow[]): UrbanRenewalRegulationRecord[] {
  return rows.map((sourceRaw) => {
    const sourceSequenceNumber = clean(getColumn(sourceRaw, [header.sequence, 'SeqNo']));
    const title = clean(getColumn(sourceRaw, [header.title, 'ItemName']));
    const rocDateRaw = clean(getColumn(sourceRaw, [header.date, '民國年月日', 'RocDate']));
    const articleTypeRaw = clean(getColumn(sourceRaw, [header.type]));
    const countyCodeRaw = clean(getColumn(sourceRaw, [header.county]));
    const date = parseRocDate(rocDateRaw);
    return { id: stableRegulationId(sourceSequenceNumber, sourceRaw), sourceSequenceNumber, title, rocDateRaw, rocYear: date.rocYear, rocMonth: date.rocMonth, rocDay: date.rocDay, gregorianDate: date.gregorianDate, gregorianYear: date.gregorianYear, articleTypeRaw, articleType: normalizeArticleType(articleTypeRaw), countyCodeRaw, countyCode: countyCodeRaw, hasValidDate: date.hasValidDate, sourceRaw };
  });
}

export function buildUrbanRenewalRegulationsSummary(records: UrbanRenewalRegulationRecord[]) {
  const valid = records.filter((record) => record.hasValidDate);
  const countBy = (items: UrbanRenewalRegulationRecord[], key: (record: UrbanRenewalRegulationRecord) => string) => [...new Map(items.map((record) => [key(record), 0])).keys()].map((value) => ({ value, count: items.filter((record) => key(record) === value).length })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  const keys = records.map((record) => record.sourceSequenceNumber).filter(Boolean);
  const rawRows = records.map((record) => JSON.stringify(record.sourceRaw));
  return {
    totalRecords: records.length, uniqueTitles: new Set(records.map((record) => record.title).filter(Boolean)).size, validDateCount: valid.length, invalidDateCount: records.length - valid.length,
    earliestGregorianDate: valid.map((record) => record.gregorianDate!).sort()[0] ?? null, latestGregorianDate: valid.map((record) => record.gregorianDate!).sort().at(-1) ?? null,
    byArticleType: countBy(records, (record) => record.articleType), byGregorianYear: countBy(valid, (record) => String(record.gregorianYear)),
    dataQuality: { missingTitleCount: records.filter((record) => !record.title).length, missingSequenceNumberCount: records.filter((record) => !record.sourceSequenceNumber).length, duplicateSequenceNumberCount: keys.length - new Set(keys).size, exactDuplicateRowCount: rawRows.length - new Set(rawRows).size, duplicateTitleCount: records.length - new Set(records.map((record) => record.title).filter(Boolean)).size, missingArticleTypeCount: records.filter((record) => !record.articleTypeRaw).length, missingCountyCodeCount: records.filter((record) => !record.countyCodeRaw).length, countyCodeValues: [...new Set(records.map((record) => record.countyCodeRaw).filter(Boolean))], additionalFields: [...new Set(records.flatMap((record) => Object.keys(record.sourceRaw)))].filter((field) => !Object.values(header).includes(field)) },
  };
}

export async function convertUrbanRenewalRegulations() {
  const file = (await listCsvFiles('data/raw/urban-renewal-regulations')).at(-1);
  const records = convertUrbanRenewalRegulationRows(file ? await readCsv(file) : []);
  await writeJson('public/data/urban-renewal-regulations/records.json', records);
  await writeJson('public/data/urban-renewal-regulations/summary.json', buildUrbanRenewalRegulationsSummary(records));
  await writeJson('public/data/urban-renewal-regulations/metadata.json', { sourceUrl: 'https://data.taipei/dataset/detail?id=6bc30ace-9322-412c-9092-aa151bdf4a03', sourceAgency: '臺北市都市更新處', updateFrequency: '不定期更新', downloadedAt: new Date().toISOString(), fields: ['SeqNo', 'ItemName', '民國年月日', 'ArticleType', 'CountyCode'] });
  return records;
}

if (process.argv[1]?.endsWith('convertUrbanRenewalRegulations.ts')) console.log((await convertUrbanRenewalRegulations()).length);

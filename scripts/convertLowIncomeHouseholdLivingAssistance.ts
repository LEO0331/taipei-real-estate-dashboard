import { createHash } from 'node:crypto';
import { getColumn, listCsvFiles, parseNumber, readCsv, writeJson, type CsvRow } from './data.ts';

export type LowIncomeHouseholdLivingAssistanceRecord = {
  id: string; periodRaw: string; rocYear: number | null; year: number | null; quarter: number | null; period: string | null;
  totalAmountNtd: number | null; category0Recipients: number | null; category0StandardNtd: number | null; category0AmountNtd: number | null;
  category1Recipients: number | null; category1StandardNtd: number | null; category1AmountNtd: number | null;
  category2HouseholdOccurrences: number | null; category2StandardNtd: number | null; category2AmountNtd: number | null; sourceRaw: CsvRow;
};

const text = (value: unknown) => String(value ?? '').trim();
export function parseLowIncomeAssistancePeriod(raw: unknown) {
  const periodRaw = text(raw); const match = periodRaw.match(/(\d{2,3})\s*年\s*第\s*([1-4])\s*季/);
  if (!match) return { periodRaw, rocYear: null, year: null, quarter: null, period: null };
  const rocYear = Number(match[1]); const quarter = Number(match[2]);
  return { periodRaw, rocYear, year: rocYear + 1911, quarter, period: `${rocYear + 1911}-Q${quarter}` };
}
const number = (row: CsvRow, name: string) => parseNumber(getColumn(row, [name])) ?? null;

export function convertLowIncomeHouseholdLivingAssistanceRows(rows: CsvRow[]): LowIncomeHouseholdLivingAssistanceRecord[] {
  return rows.map((sourceRaw) => {
    const parsed = parseLowIncomeAssistancePeriod(getColumn(sourceRaw, ['年/季']));
    return {
      id: `low-income-assistance-${parsed.period ?? createHash('sha1').update(JSON.stringify(sourceRaw)).digest('hex').slice(0, 10)}`,
      ...parsed, totalAmountNtd: number(sourceRaw, '總金額'),
      category0Recipients: number(sourceRaw, '第0類低收入戶人次'), category0StandardNtd: number(sourceRaw, '第0類低收入戶發放標準'), category0AmountNtd: number(sourceRaw, '第0類低收入戶金額'),
      category1Recipients: number(sourceRaw, '第1類低收入戶人次'), category1StandardNtd: number(sourceRaw, '第1類低收入戶發放標準'), category1AmountNtd: number(sourceRaw, '第1類低收入戶金額'),
      category2HouseholdOccurrences: number(sourceRaw, '第2類低收入戶戶次'), category2StandardNtd: number(sourceRaw, '第2類低收入戶發放標準'), category2AmountNtd: number(sourceRaw, '第2類低收入戶金額'), sourceRaw,
    };
  }).sort((a, b) => (a.year ?? 0) - (b.year ?? 0) || (a.quarter ?? 0) - (b.quarter ?? 0));
}

export function buildLowIncomeHouseholdLivingAssistanceSummary(records: LowIncomeHouseholdLivingAssistanceRecord[]) {
  const latest = records.at(-1);
  return { recordCount: records.length, firstPeriod: records[0]?.period ?? null, latestPeriod: latest?.period ?? null, latest,
    dataQuality: { invalidPeriodCount: records.filter((record) => !record.period).length, missingTotalAmountCount: records.filter((record) => record.totalAmountNtd === null).length, duplicatePeriodCount: records.length - new Set(records.map((record) => record.period)).size },
  };
}

export async function convertLowIncomeHouseholdLivingAssistance() {
  const file = (await listCsvFiles('data/raw/low-income-household-living-assistance')).at(-1);
  const records = convertLowIncomeHouseholdLivingAssistanceRows(file ? await readCsv(file) : []);
  const summary = buildLowIncomeHouseholdLivingAssistanceSummary(records);
  await writeJson('public/data/low-income-household-living-assistance/records.json', records);
  await writeJson('public/data/low-income-household-living-assistance/summary.json', summary);
  await writeJson('public/data/low-income-household-living-assistance/metadata.json', { sourceUrl: 'https://data.taipei/dataset/detail?id=63922471-d357-49d5-a1ba-216361b75637', sourceAgency: 'Taipei City Department of Social Welfare', updateFrequency: 'quarterly', amountUnit: 'NTD', recipientMeasure: 'Categories 0 and 1 are person-times; category 2 is household occurrences.', ...summary });
  return records;
}
if (process.argv[1]?.endsWith('convertLowIncomeHouseholdLivingAssistance.ts')) console.log((await convertLowIncomeHouseholdLivingAssistance()).length);

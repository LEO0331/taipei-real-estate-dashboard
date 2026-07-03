import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { AnnualTrendDirection, RealEstateSummary, TaipowerTaipeiElectricitySalesRecord, TaipowerTaipeiElectricitySalesSummary } from '../src/models.ts';
import { getColumn, listCsvFiles, readCsv, updateConversionReport, writeJson, type CsvRow } from './data.ts';

const directory = 'data/raw/taipower-taipei-electricity-sales';
const source = '台灣電力公司臺北市售電量';
const sourceAgency = '臺北市政府主計處';
const sourceUrl = 'https://data.taipei/dataset/detail?id=9bfb5424-1996-461a-b19b-f75101e2f459';
const module = 'taipower_taipei_electricity_sales' as const;

export function cleanText(raw: unknown): string | undefined {
  const text = String(raw ?? '').replace(/\u3000/g, ' ').trim();
  return !text || ['-', '--', 'nan', 'null', '尚無資料'].includes(text.toLowerCase()) ? undefined : text;
}

export function parseTaipeiElectricityPeriod(raw: unknown) {
  const value = cleanText(raw);
  const year = Number(value?.replace(/民國|年/g, '').match(/\d+/)?.[0]);
  if (!Number.isFinite(year)) return { raw: value, warning: `Invalid electricity period: ${value ?? ''}` };
  const rocYear = year >= 1911 ? year - 1911 : year;
  const gregorianYear = year >= 1911 ? year : year + 1911;
  if (rocYear < 1 || rocYear > 200 || gregorianYear < 1912 || gregorianYear > 2111) return { raw: value, warning: `Out-of-range electricity period: ${value}` };
  return { raw: value, rocYear, gregorianYear, periodLabelZh: `民國${rocYear}年`, periodLabelEn: String(gregorianYear) };
}

export function parseIntegerMetric(raw: unknown): number | undefined {
  const text = cleanText(raw)?.replace(/[,，\s]/g, '');
  if (!text) return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? Math.trunc(value) : undefined;
}

export function thousandKwhToKwh(valueThousandKwh: number | undefined): number | undefined {
  return valueThousandKwh === undefined || !Number.isFinite(valueThousandKwh) ? undefined : valueThousandKwh * 1000;
}

export function safeShare(numerator: number | undefined, denominator: number | undefined): number | undefined {
  return numerator === undefined || denominator === undefined || denominator === 0 ? undefined : numerator / denominator;
}

export function classifyAnnualTrend(change: number | undefined): AnnualTrendDirection {
  if (change === undefined || !Number.isFinite(change)) return 'first_record';
  if (change > 0) return 'increase';
  if (change < 0) return 'decrease';
  return 'no_change';
}

const compact = <T extends object>(value: T): T => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== '')) as T;
const percentChange = (current: number | undefined, previous: number | undefined) => current === undefined || previous === undefined || previous === 0 ? undefined : (current - previous) / previous;
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
const numberField = (row: CsvRow, aliases: string[]) => parseIntegerMetric(getColumn(row, aliases));

export function checkElectricityCategoryConsistency(record: TaipowerTaipeiElectricitySalesRecord): string[] {
  const warnings: string[] = [];
  const close = (a: number | undefined, b: number | undefined) => a === undefined || b === undefined || Math.abs(a - b) <= Math.max(2, Math.abs(a) * 0.01);
  if (!close(record.totalElectricitySalesThousandKwh, (record.lightingElectricitySalesThousandKwh ?? 0) + (record.powerElectricitySalesThousandKwh ?? 0) + (record.taipowerSelfUseElectricityThousandKwh ?? 0))) warnings.push('total electricity sales does not match lighting + power + Taipower self-use');
  if (!close(record.totalCustomerCount, (record.lightingCustomerCount ?? 0) + (record.powerCustomerCount ?? 0))) warnings.push('total customer count does not match lighting + power customers');
  if (!close(record.lightingElectricitySalesThousandKwh, (record.lightingFlatRateElectricitySalesThousandKwh ?? 0) + (record.lightingMeteredElectricitySalesThousandKwh ?? 0))) warnings.push('lighting sales does not match flat-rate + metered lighting');
  if (!close(record.powerElectricitySalesThousandKwh, (record.powerFlatRateElectricitySalesThousandKwh ?? 0) + (record.powerMeteredElectricitySalesThousandKwh ?? 0))) warnings.push('power sales does not match flat-rate + metered power');
  return warnings;
}

function makeRecord(row: CsvRow, sourceResourceName: string, index: number, warnings: string[]): TaipowerTaipeiElectricitySalesRecord | undefined {
  const period = parseTaipeiElectricityPeriod(getColumn(row, ['統計期']));
  if (period.warning || !period.rocYear || !period.gregorianYear) {
    warnings.push(`${period.warning ?? 'Missing electricity period'} in ${sourceResourceName} row ${index}`);
    return undefined;
  }
  const totalElectricitySalesThousandKwh = numberField(row, ['總用電量[千度]']);
  const lightingElectricitySalesThousandKwh = numberField(row, ['電燈用電量[千度]']);
  const powerElectricitySalesThousandKwh = numberField(row, ['電力用電量[千度]']);
  const taipowerSelfUseElectricityThousandKwh = numberField(row, ['台電自用用電量[千度]']);
  const lightingMeteredBusinessElectricitySalesThousandKwh = numberField(row, ['電燈/表燈/營業/用電量[千度]', '電燈/表燈/營業用/用電量[千度]']);
  const lightingMeteredNonBusinessElectricitySalesThousandKwh = numberField(row, ['電燈/表燈/非營業/用電量[千度]', '電燈/表燈/非營業用/用電量[千度]']);
  const powerMeteredElectricitySalesThousandKwh = numberField(row, ['電力/表計/用電量[千度]']);
  const record = compact({
    id: `taipower-taipei-electricity-sales-${period.rocYear}`,
    module, periodRaw: period.raw ?? '', rocYear: period.rocYear, gregorianYear: period.gregorianYear, periodLabelZh: period.periodLabelZh ?? '', periodLabelEn: period.periodLabelEn ?? '',
    totalCustomerCount: numberField(row, ['總用戶數[戶]']),
    totalElectricitySalesThousandKwh,
    totalElectricitySalesKwh: thousandKwhToKwh(totalElectricitySalesThousandKwh),
    totalElectricityUsePerCustomerKwh: numberField(row, ['每用戶用電量[度]']),
    lightingCustomerCount: numberField(row, ['電燈用戶數[戶]']),
    lightingElectricitySalesThousandKwh,
    lightingElectricitySalesKwh: thousandKwhToKwh(lightingElectricitySalesThousandKwh),
    lightingElectricityUsePerCustomerKwh: numberField(row, ['電燈每用戶用電量[度]']),
    lightingFlatRateCustomerCount: numberField(row, ['電燈/包燈/用戶數[戶]']),
    lightingFlatRateElectricitySalesThousandKwh: numberField(row, ['電燈/包燈/用電量[千度]']),
    lightingFlatRateUsePerCustomerKwh: numberField(row, ['電燈/包燈/每用戶用電量[度]']),
    lightingFlatRateGeneralCustomerCount: numberField(row, ['電燈/包燈/一般用/用戶數[戶]']),
    lightingFlatRateGeneralElectricitySalesThousandKwh: numberField(row, ['電燈/包燈/一般用/用電量[千度]']),
    lightingFlatRateGeneralUsePerCustomerKwh: numberField(row, ['電燈/包燈/一般用/每用戶用電量[度]']),
    lightingFlatRateStreetlightCustomerCount: numberField(row, ['電燈/包燈/公用路燈/用戶數[戶]']),
    lightingFlatRateStreetlightElectricitySalesThousandKwh: numberField(row, ['電燈/包燈/公用路燈/用電量[千度]']),
    lightingFlatRateStreetlightUsePerCustomerKwh: numberField(row, ['電燈/包燈/公用路燈/每用戶用電量[度]']),
    lightingMeteredCustomerCount: numberField(row, ['電燈/表燈/用戶數[戶]']),
    lightingMeteredElectricitySalesThousandKwh: numberField(row, ['電燈/表燈/用電量[千度]']),
    lightingMeteredUsePerCustomerKwh: numberField(row, ['電燈/表燈/每用戶用電量[度]']),
    lightingMeteredBusinessCustomerCount: numberField(row, ['電燈/表燈/營業用/用戶數[戶]']),
    lightingMeteredBusinessElectricitySalesThousandKwh,
    lightingMeteredBusinessUsePerCustomerKwh: numberField(row, ['電燈/表燈/營業/每用戶用電量[度]', '電燈/表燈/營業用/每用戶用電量[度]']),
    lightingMeteredNonBusinessCustomerCount: numberField(row, ['電燈/表燈/非營業/用戶數[戶]']),
    lightingMeteredNonBusinessElectricitySalesThousandKwh,
    lightingMeteredNonBusinessUsePerCustomerKwh: numberField(row, ['電燈/表燈/非營業用/每用戶用電量[度]', '電燈/表燈/非營業/每用戶用電量[度]']),
    powerCustomerCount: numberField(row, ['電力用戶數[戶]']),
    powerElectricitySalesThousandKwh,
    powerElectricitySalesKwh: thousandKwhToKwh(powerElectricitySalesThousandKwh),
    powerUsePerCustomerKwh: numberField(row, ['電力每用戶用電量[度]']),
    powerFlatRateCustomerCount: numberField(row, ['電力/包用/用戶數[戶]']),
    powerFlatRateElectricitySalesThousandKwh: numberField(row, ['電力/包用/用電量[千度]']),
    powerFlatRateUsePerCustomerKwh: numberField(row, ['電力/包用/每用戶用電量[度]']),
    powerMeteredCustomerCount: numberField(row, ['電力/表計/用戶數[戶]']),
    powerMeteredElectricitySalesThousandKwh,
    powerMeteredUsePerCustomerKwh: numberField(row, ['電力/表計/每用戶用電量[度]']),
    taipowerSelfUseElectricityThousandKwh,
    taipowerSelfUseElectricityKwh: thousandKwhToKwh(taipowerSelfUseElectricityThousandKwh),
    totalCustomerCountTrendDirection: 'first_record' as AnnualTrendDirection,
    totalElectricitySalesTrendDirection: 'first_record' as AnnualTrendDirection,
    totalElectricityUsePerCustomerTrendDirection: 'first_record' as AnnualTrendDirection,
    lightingShareOfTotalSales: safeShare(lightingElectricitySalesThousandKwh, totalElectricitySalesThousandKwh),
    powerShareOfTotalSales: safeShare(powerElectricitySalesThousandKwh, totalElectricitySalesThousandKwh),
    lightingMeteredBusinessShareOfLightingSales: safeShare(lightingMeteredBusinessElectricitySalesThousandKwh, lightingElectricitySalesThousandKwh),
    lightingMeteredNonBusinessShareOfLightingSales: safeShare(lightingMeteredNonBusinessElectricitySalesThousandKwh, lightingElectricitySalesThousandKwh),
    powerMeteredShareOfPowerSales: safeShare(powerMeteredElectricitySalesThousandKwh, powerElectricitySalesThousandKwh),
    isLatestRecord: false,
    categoryConsistencyWarnings: [] as string[],
    sourceRecordHash: createHash('sha1').update(JSON.stringify(row)).digest('hex').slice(0, 12),
    source,
    sourceAgency,
  } satisfies TaipowerTaipeiElectricitySalesRecord);
  record.categoryConsistencyWarnings = checkElectricityCategoryConsistency(record);
  return record;
}

export function addElectricityAnnualTrendFields(records: TaipowerTaipeiElectricitySalesRecord[]) {
  const sorted = [...records].sort((a, b) => a.gregorianYear - b.gregorianYear);
  const latestYear = sorted.at(-1)?.gregorianYear;
  sorted.forEach((record, index) => {
    const previous = sorted[index - 1];
    record.totalCustomerCountYearOverYearChange = previous && record.totalCustomerCount !== undefined && previous.totalCustomerCount !== undefined ? record.totalCustomerCount - previous.totalCustomerCount : undefined;
    record.totalElectricitySalesYearOverYearChange = previous && record.totalElectricitySalesThousandKwh !== undefined && previous.totalElectricitySalesThousandKwh !== undefined ? record.totalElectricitySalesThousandKwh - previous.totalElectricitySalesThousandKwh : undefined;
    record.totalElectricitySalesYearOverYearPercentChange = previous ? percentChange(record.totalElectricitySalesThousandKwh, previous.totalElectricitySalesThousandKwh) : undefined;
    record.totalElectricityUsePerCustomerYearOverYearChange = previous && record.totalElectricityUsePerCustomerKwh !== undefined && previous.totalElectricityUsePerCustomerKwh !== undefined ? record.totalElectricityUsePerCustomerKwh - previous.totalElectricityUsePerCustomerKwh : undefined;
    record.totalCustomerCountTrendDirection = classifyAnnualTrend(record.totalCustomerCountYearOverYearChange);
    record.totalElectricitySalesTrendDirection = classifyAnnualTrend(record.totalElectricitySalesYearOverYearChange);
    record.totalElectricityUsePerCustomerTrendDirection = classifyAnnualTrend(record.totalElectricityUsePerCustomerYearOverYearChange);
    record.isLatestRecord = record.gregorianYear === latestYear;
  });
  return sorted;
}

export function convertTaipowerTaipeiElectricitySalesRows(rows: CsvRow[], sourceResourceName = 'inline.csv', warnings: string[] = []) {
  const seenYears = new Set<number>();
  const records: TaipowerTaipeiElectricitySalesRecord[] = [];
  rows.forEach((row, index) => {
    const record = makeRecord(row, sourceResourceName, index + 1, warnings);
    if (!record) return;
    if (seenYears.has(record.rocYear)) warnings.push(`Duplicate electricity ROC year preserved: ${record.rocYear}`);
    seenYears.add(record.rocYear);
    records.push(record);
  });
  return addElectricityAnnualTrendFields(records);
}

export function buildTaipowerTaipeiElectricitySalesSummary(records: TaipowerTaipeiElectricitySalesRecord[]): TaipowerTaipeiElectricitySalesSummary {
  const sorted = [...records].sort((a, b) => a.gregorianYear - b.gregorianYear);
  const first = sorted[0];
  const latest = sorted.at(-1);
  const sales = sorted.map((record) => record.totalElectricitySalesThousandKwh).filter((value): value is number => value !== undefined);
  const perCustomer = sorted.map((record) => record.totalElectricityUsePerCustomerKwh).filter((value): value is number => value !== undefined);
  const duplicateYearCount = sorted.length - new Set(sorted.map((record) => record.rocYear)).size;
  return {
    totalRecords: sorted.length,
    minRocYear: first?.rocYear,
    maxRocYear: latest?.rocYear,
    minGregorianYear: first?.gregorianYear,
    maxGregorianYear: latest?.gregorianYear,
    latestRecord: latest && {
      rocYear: latest.rocYear,
      gregorianYear: latest.gregorianYear,
      totalCustomerCount: latest.totalCustomerCount,
      totalElectricitySalesThousandKwh: latest.totalElectricitySalesThousandKwh,
      totalElectricityUsePerCustomerKwh: latest.totalElectricityUsePerCustomerKwh,
      lightingElectricitySalesThousandKwh: latest.lightingElectricitySalesThousandKwh,
      powerElectricitySalesThousandKwh: latest.powerElectricitySalesThousandKwh,
      totalElectricitySalesYearOverYearChange: latest.totalElectricitySalesYearOverYearChange,
      totalElectricitySalesYearOverYearPercentChange: latest.totalElectricitySalesYearOverYearPercentChange,
    },
    firstTotalCustomerCount: first?.totalCustomerCount,
    latestTotalCustomerCount: latest?.totalCustomerCount,
    totalCustomerCountChange: first?.totalCustomerCount !== undefined && latest?.totalCustomerCount !== undefined ? latest.totalCustomerCount - first.totalCustomerCount : undefined,
    totalCustomerCountPercentChange: percentChange(latest?.totalCustomerCount, first?.totalCustomerCount),
    firstTotalElectricitySalesThousandKwh: first?.totalElectricitySalesThousandKwh,
    latestTotalElectricitySalesThousandKwh: latest?.totalElectricitySalesThousandKwh,
    totalElectricitySalesChangeThousandKwh: first?.totalElectricitySalesThousandKwh !== undefined && latest?.totalElectricitySalesThousandKwh !== undefined ? latest.totalElectricitySalesThousandKwh - first.totalElectricitySalesThousandKwh : undefined,
    totalElectricitySalesPercentChange: percentChange(latest?.totalElectricitySalesThousandKwh, first?.totalElectricitySalesThousandKwh),
    minTotalElectricitySalesThousandKwh: sales.length ? Math.min(...sales) : undefined,
    maxTotalElectricitySalesThousandKwh: sales.length ? Math.max(...sales) : undefined,
    averageTotalElectricitySalesThousandKwh: average(sales),
    minTotalElectricityUsePerCustomerKwh: perCustomer.length ? Math.min(...perCustomer) : undefined,
    maxTotalElectricityUsePerCustomerKwh: perCustomer.length ? Math.max(...perCustomer) : undefined,
    averageTotalElectricityUsePerCustomerKwh: average(perCustomer),
    latestLightingShareOfTotalSales: latest?.lightingShareOfTotalSales,
    latestPowerShareOfTotalSales: latest?.powerShareOfTotalSales,
    annualSeries: sorted.map((record) => ({
      rocYear: record.rocYear,
      gregorianYear: record.gregorianYear,
      totalCustomerCount: record.totalCustomerCount,
      totalElectricitySalesThousandKwh: record.totalElectricitySalesThousandKwh,
      totalElectricityUsePerCustomerKwh: record.totalElectricityUsePerCustomerKwh,
      lightingElectricitySalesThousandKwh: record.lightingElectricitySalesThousandKwh,
      powerElectricitySalesThousandKwh: record.powerElectricitySalesThousandKwh,
      lightingCustomerCount: record.lightingCustomerCount,
      powerCustomerCount: record.powerCustomerCount,
      totalElectricitySalesYearOverYearChange: record.totalElectricitySalesYearOverYearChange,
      totalElectricitySalesYearOverYearPercentChange: record.totalElectricitySalesYearOverYearPercentChange,
      totalCustomerCountYearOverYearChange: record.totalCustomerCountYearOverYearChange,
      totalElectricityUsePerCustomerYearOverYearChange: record.totalElectricityUsePerCustomerYearOverYearChange,
      lightingShareOfTotalSales: record.lightingShareOfTotalSales,
      powerShareOfTotalSales: record.powerShareOfTotalSales,
      lightingMeteredBusinessElectricitySalesThousandKwh: record.lightingMeteredBusinessElectricitySalesThousandKwh,
      lightingMeteredNonBusinessElectricitySalesThousandKwh: record.lightingMeteredNonBusinessElectricitySalesThousandKwh,
    })),
    dataQuality: {
      missingPeriodCount: 0,
      invalidPeriodCount: 0,
      duplicateYearCount,
      missingTotalCustomerCountCount: sorted.filter((record) => record.totalCustomerCount === undefined).length,
      invalidTotalCustomerCountCount: 0,
      missingTotalElectricitySalesCount: sorted.filter((record) => record.totalElectricitySalesThousandKwh === undefined).length,
      invalidTotalElectricitySalesCount: 0,
      missingPerCustomerUseCount: sorted.filter((record) => record.totalElectricityUsePerCustomerKwh === undefined).length,
      invalidPerCustomerUseCount: 0,
      categorySumMismatchCount: sorted.filter((record) => record.categoryConsistencyWarnings.length).length,
      duplicateFallbackKeyCount: duplicateYearCount,
    },
  };
}

async function updateRealEstateSummary(summary: TaipowerTaipeiElectricitySalesSummary) {
  try {
    const realEstate = JSON.parse(await readFile('public/data/real-price-summary.json', 'utf8')) as RealEstateSummary;
    realEstate.taipowerTaipeiElectricitySales = {
      latestYear: summary.latestRecord?.gregorianYear,
      latestTotalCustomerCount: summary.latestRecord?.totalCustomerCount,
      latestTotalElectricitySalesThousandKwh: summary.latestRecord?.totalElectricitySalesThousandKwh,
      latestTotalElectricityUsePerCustomerKwh: summary.latestRecord?.totalElectricityUsePerCustomerKwh,
      latestTotalElectricitySalesYearOverYearPercentChange: summary.latestRecord?.totalElectricitySalesYearOverYearPercentChange,
    };
    await writeJson('public/data/real-price-summary.json', realEstate);
  } catch {
    // Optional when run before the main real-estate summary exists.
  }
}

export async function convertTaipowerTaipeiElectricitySales() {
  const files = await listCsvFiles(directory);
  const warnings: string[] = [];
  const records = (await Promise.all(files.map(async (file) => convertTaipowerTaipeiElectricitySalesRows(await readCsv(file), basename(file), warnings)))).flat().sort((a, b) => a.gregorianYear - b.gregorianYear);
  const summary = buildTaipowerTaipeiElectricitySalesSummary(records);
  await writeJson('public/data/taipower-taipei-electricity-sales.json', records);
  await writeJson('public/data/taipower-taipei-electricity-sales-summary.json', summary);
  await updateRealEstateSummary(summary);
  await updateConversionReport({
    dataset: source,
    file: files[0] ?? directory,
    sourceUrl,
    status: files.length ? 'converted' : 'missing',
    notes: [
      `${records.length} annual electricity records`,
      `${summary.minGregorianYear}-${summary.maxGregorianYear}`,
      'UTF-8-SIG CSV supported via shared reader with Big5 fallback.',
      'Source slash-separated column names are preserved in generated records and conversion notes.',
      'Citywide annual electricity context only; no map markers, geocoding, district values, realtime demand, prices, outages, grid reliability, emissions, or energy-efficiency claims.',
    ],
  }, [...warnings, ...records.flatMap((record) => record.categoryConsistencyWarnings.map((warning) => `${record.periodLabelEn}: ${warning}`))]);
  return { records, summary };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { records, summary } = await convertTaipowerTaipeiElectricitySales();
  console.log(`Taipower Taipei electricity records: ${records.length}; latest year: ${summary.latestRecord?.gregorianYear}`);
}

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { LandValueTaxBracket, LandValueTaxPeriodCategory, LandValueTaxProgressiveBracketRecord, LandValueTaxProgressiveBracketSummary, RealEstateSummary } from '../src/models.ts';
import { getColumn, listCsvFiles, readCsv, updateConversionReport, writeJson, type CsvRow } from './data.ts';

const directory = 'data/raw/land-value-tax-progressive-brackets';
const source = '臺北市稅捐稽徵處歷年(70年起)地價稅累進起點地價及課稅級距表';
const sourceAgency = '臺北市稅捐稽徵處';
const sourceUrl = 'https://data.taipei/dataset/detail?id=60e5f439-0cc0-4163-a91e-98241b6846c3';
const module = 'land_value_tax_progressive_brackets' as const;

export function cleanText(raw: unknown): string | undefined {
  const text = String(raw ?? '').replace(/\u3000/g, ' ').trim();
  return !text || ['-', '--', 'nan', 'null', '尚無資料'].includes(text.toLowerCase()) ? undefined : text;
}

export function classifyLandValueTaxPeriod(raw: string | undefined): LandValueTaxPeriodCategory {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown';
  if (text === '全年') return 'annual';
  if (text === '全期') return 'full_period';
  if (text === '上半年') return 'first_half';
  if (text === '下半年') return 'second_half';
  if (text === '上期') return 'first_period';
  if (text === '下期') return 'second_period';
  return 'other';
}

export function parseLandValueTaxRocYear(raw: unknown) {
  const text = cleanText(raw);
  const year = Number(text?.match(/\d+/)?.[0]);
  if (!Number.isFinite(year)) return { raw: text, warning: `Invalid ROC year: ${text ?? ''}` };
  const rocYear = year >= 1911 ? year - 1911 : year;
  const gregorianYear = year >= 1911 ? year : year + 1911;
  if (rocYear < 1 || rocYear > 200 || gregorianYear < 1912 || gregorianYear > 2111) return { raw: text, warning: `Out-of-range ROC year: ${text}` };
  return { raw: text, rocYear, gregorianYear };
}

export function parseLandValueTaxPeriod(raw: unknown) {
  const taxPeriod = cleanText(raw);
  const taxPeriodCategory = classifyLandValueTaxPeriod(taxPeriod);
  return { taxPeriodRaw: taxPeriod, taxPeriod, taxPeriodCategory, warning: taxPeriodCategory === 'unknown' || taxPeriodCategory === 'other' ? `Unknown tax period: ${taxPeriod ?? ''}` : undefined };
}

export function parseLandValueTaxPaymentDate(raw: unknown) {
  const text = cleanText(raw);
  if (!text) return { raw: text };
  const digits = text.replace(/\D/g, '');
  let year: number | undefined;
  let month: number | undefined;
  let day: number | undefined;
  if (/^\d{8}$/.test(digits)) {
    year = Number(digits.slice(0, 4)); month = Number(digits.slice(4, 6)); day = Number(digits.slice(6, 8));
  } else if (/^\d{7}$/.test(digits)) {
    year = Number(digits.slice(0, 3)) + 1911; month = Number(digits.slice(3, 5)); day = Number(digits.slice(5, 7));
  } else {
    const parts = text.match(/\d+/g)?.map(Number) ?? [];
    [year, month, day] = parts;
    if (year && year < 1911) year += 1911;
  }
  if (!year || !month || !day) return { raw: text, warning: `Unable to parse payment date: ${text}` };
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return { raw: text, warning: `Invalid payment date: ${text}` };
  return { raw: text, date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
}

export function calculatePaymentPeriodDayCount(startDate: string | undefined, endDate: string | undefined): number | undefined {
  if (!startDate || !endDate) return undefined;
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  return Number.isFinite(start) && Number.isFinite(end) && end >= start ? Math.round((end - start) / 86_400_000) + 1 : undefined;
}

const number = (raw: string | undefined) => raw === undefined ? undefined : Number(raw.replace(/[,，\s]/g, ''));
const rate = (text: string) => Number(text.match(/[×x*]\s*(\d+(?:\.\d+)?)\s*\/\s*1000/)?.[1]);
const diff = (text: string) => number(text.match(/[–−-]\s*([0-9,，]+)/)?.[1]);
const compact = <T extends object>(value: T): T => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== '')) as T;
const percentChange = (current: number | undefined, previous: number | undefined) => current === undefined || previous === undefined || previous === 0 ? undefined : (current - previous) / previous;
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;

export function parseGeneralLandTaxFormula(raw: unknown) {
  const formulaRaw = cleanText(raw);
  const warnings: string[] = [];
  const brackets: LandValueTaxBracket[] = [];
  for (const line of formulaRaw?.split(/\r?\n/).map((item) => item.trim()).filter((item) => item.includes('/1000')) ?? []) {
    const rawLine = line;
    const itemRate = rate(line);
    if (!Number.isFinite(itemRate)) continue;
    const bracketNumber = Number(line.match(/^\(?(\d+)\)?/)?.[1] ?? brackets.length + 1);
    const clean = line.replace(/[,，\s]/g, '');
    const below = clean.match(/([0-9]+)以下/);
    const range = clean.match(/([0-9]+)~([0-9]+)/);
    const above = clean.match(/([0-9]+)以上/);
    const bracket = below
      ? { bracketNumber, upperBoundLandValue: number(below[1]), isLowerBoundInclusive: true, isUpperBoundInclusive: true, isOpenEnded: false, ratePermille: itemRate, progressiveDifferenceAmount: diff(line), rawLine }
      : range
        ? { bracketNumber, lowerBoundLandValue: number(range[1]), upperBoundLandValue: number(range[2]), isLowerBoundInclusive: true, isUpperBoundInclusive: true, isOpenEnded: false, ratePermille: itemRate, progressiveDifferenceAmount: diff(line), rawLine }
        : above
          ? { bracketNumber, lowerBoundLandValue: number(above[1]), isLowerBoundInclusive: true, isUpperBoundInclusive: false, isOpenEnded: true, ratePermille: itemRate, progressiveDifferenceAmount: diff(line), rawLine }
          : undefined;
    if (bracket) brackets.push(compact(bracket) as LandValueTaxBracket);
  }
  if (formulaRaw && !brackets.length) warnings.push('Unable to parse general land tax brackets');
  const rates = brackets.map((item) => item.ratePermille);
  return {
    formulaRaw,
    brackets,
    bracketCount: brackets.length,
    progressiveStartingPointLandValue: brackets[0]?.upperBoundLandValue,
    lowestRatePermille: rates.length ? Math.min(...rates) : undefined,
    highestRatePermille: rates.length ? Math.max(...rates) : undefined,
    highestBracketLowerBound: brackets.find((item) => item.isOpenEnded)?.lowerBoundLandValue,
    hasHalfYearMultiplier: /[×x*]\s*1\s*\/\s*2/.test(formulaRaw ?? ''),
    warnings,
  };
}

export function parseFlatLandTaxFormula(raw: unknown) {
  const formulaRaw = cleanText(raw);
  const ratePermille = formulaRaw ? rate(formulaRaw) : undefined;
  return { formulaRaw, ratePermille: Number.isFinite(ratePermille) ? ratePermille : undefined, hasHalfYearMultiplier: /[×x*]\s*1\s*\/\s*2/.test(formulaRaw ?? ''), warnings: formulaRaw && !Number.isFinite(ratePermille) ? ['Unable to parse flat land tax rate'] : [] };
}

function makeRecord(row: CsvRow, sourceResourceName: string, index: number, warnings: string[]): LandValueTaxProgressiveBracketRecord | undefined {
  const year = parseLandValueTaxRocYear(getColumn(row, ['年度']));
  if (year.warning || !year.rocYear || !year.gregorianYear) {
    warnings.push(`${year.warning ?? 'Missing year'} in ${sourceResourceName} row ${index}`);
    return undefined;
  }
  const period = parseLandValueTaxPeriod(getColumn(row, ['年期']));
  if (period.warning) warnings.push(`${period.warning} in ${sourceResourceName} row ${index}`);
  const start = parseLandValueTaxPaymentDate(getColumn(row, ['繳納期間起日']));
  const end = parseLandValueTaxPaymentDate(getColumn(row, ['繳納期間迄日']));
  if (start.warning) warnings.push(`${start.warning} in ${sourceResourceName} row ${index}`);
  if (end.warning) warnings.push(`${end.warning} in ${sourceResourceName} row ${index}`);
  const general = parseGeneralLandTaxFormula(getColumn(row, ['一般土地地價稅計算公式']));
  const selfUse = parseFlatLandTaxFormula(getColumn(row, ['自用住宅用地地價稅計算公式']));
  const industrial = parseFlatLandTaxFormula(getColumn(row, ['工業用地地價稅計算公式']));
  const publicFacility = parseFlatLandTaxFormula(getColumn(row, ['公共設施保留地地價稅計算公式']));
  const paymentPeriodDayCount = calculatePaymentPeriodDayCount(start.date, end.date);
  if (start.date && end.date && !paymentPeriodDayCount) warnings.push(`Invalid payment range in ${sourceResourceName} row ${index}`);
  return compact({
    id: `land-value-tax-progressive-brackets-${year.rocYear}-${period.taxPeriod ?? index}`,
    module, rocYearRaw: year.raw, rocYear: year.rocYear, gregorianYear: year.gregorianYear, yearLabelZh: `民國${year.rocYear}年`, yearLabelEn: String(year.gregorianYear),
    taxPeriodRaw: period.taxPeriodRaw ?? '', taxPeriod: period.taxPeriod ?? '', taxPeriodCategory: period.taxPeriodCategory,
    paymentPeriodStartRaw: start.raw, paymentPeriodEndRaw: end.raw, paymentPeriodStartDate: start.date, paymentPeriodEndDate: end.date, paymentPeriodMonth: start.date ? Number(start.date.slice(5, 7)) : undefined, paymentPeriodDayCount,
    generalLandTaxFormulaRaw: general.formulaRaw ?? '', generalLandTaxBrackets: general.brackets, generalLandTaxBracketCount: general.bracketCount, generalLandProgressiveStartingPointLandValue: general.progressiveStartingPointLandValue, generalLandLowestRatePermille: general.lowestRatePermille, generalLandHighestRatePermille: general.highestRatePermille, generalLandHighestBracketLowerBound: general.highestBracketLowerBound, generalLandFormulaHasHalfYearMultiplier: general.hasHalfYearMultiplier,
    selfUseResidentialLandTaxFormulaRaw: selfUse.formulaRaw ?? '', selfUseResidentialLandTaxRatePermille: selfUse.ratePermille, selfUseResidentialFormulaHasHalfYearMultiplier: selfUse.hasHalfYearMultiplier,
    industrialLandTaxFormulaRaw: industrial.formulaRaw ?? '', industrialLandTaxRatePermille: industrial.ratePermille, industrialFormulaHasHalfYearMultiplier: industrial.hasHalfYearMultiplier,
    publicFacilityReservedLandTaxFormulaRaw: publicFacility.formulaRaw ?? '', publicFacilityReservedLandTaxRatePermille: publicFacility.ratePermille, publicFacilityReservedFormulaHasHalfYearMultiplier: publicFacility.hasHalfYearMultiplier,
    isLatestRecord: false, sourceRecordHash: createHash('sha1').update(JSON.stringify(row)).digest('hex').slice(0, 12), source, sourceAgency,
  } satisfies LandValueTaxProgressiveBracketRecord);
}

export function addLandValueTaxTrendFields(records: LandValueTaxProgressiveBracketRecord[]) {
  const sorted = [...records].sort((a, b) => a.gregorianYear - b.gregorianYear || a.taxPeriod.localeCompare(b.taxPeriod));
  const latest = sorted.at(-1);
  sorted.forEach((record) => {
    const previous = [...sorted].reverse().find((item) => item.gregorianYear < record.gregorianYear && item.taxPeriodCategory === record.taxPeriodCategory) ?? [...sorted].reverse().find((item) => item.gregorianYear < record.gregorianYear);
    record.yearOverYearProgressiveStartingPointChange = previous && record.generalLandProgressiveStartingPointLandValue !== undefined && previous.generalLandProgressiveStartingPointLandValue !== undefined ? record.generalLandProgressiveStartingPointLandValue - previous.generalLandProgressiveStartingPointLandValue : undefined;
    record.yearOverYearProgressiveStartingPointPercentChange = previous ? percentChange(record.generalLandProgressiveStartingPointLandValue, previous.generalLandProgressiveStartingPointLandValue) : undefined;
    record.isLatestRecord = record === latest;
  });
  return sorted;
}

export function convertLandValueTaxProgressiveBracketRows(rows: CsvRow[], sourceResourceName = 'inline.csv', warnings: string[] = []) {
  const seenYearPeriods = new Set<string>();
  const seenFallback = new Set<string>();
  const records: LandValueTaxProgressiveBracketRecord[] = [];
  rows.forEach((row, index) => {
    const record = makeRecord(row, sourceResourceName, index + 1, warnings);
    if (!record) return;
    const key = `${record.rocYearRaw}|${record.taxPeriodRaw}`;
    const fallback = `${key}|${record.paymentPeriodStartRaw}|${record.paymentPeriodEndRaw}`;
    if (seenYearPeriods.has(key)) warnings.push(`Duplicate land value tax year-period preserved: ${key}`);
    if (seenFallback.has(fallback)) warnings.push(`Duplicate land value tax fallback key preserved: ${fallback}`);
    seenYearPeriods.add(key);
    seenFallback.add(fallback);
    records.push(record);
  });
  return addLandValueTaxTrendFields(records);
}

export function buildLandValueTaxProgressiveBracketSummary(records: LandValueTaxProgressiveBracketRecord[]): LandValueTaxProgressiveBracketSummary {
  const sorted = [...records].sort((a, b) => a.gregorianYear - b.gregorianYear || a.taxPeriod.localeCompare(b.taxPeriod));
  const first = sorted[0];
  const latest = sorted.at(-1);
  const starts = sorted.map((record) => record.generalLandProgressiveStartingPointLandValue).filter((value): value is number => value !== undefined);
  const lowestRates = sorted.map((record) => record.generalLandLowestRatePermille).filter((value): value is number => value !== undefined);
  const highestRates = sorted.map((record) => record.generalLandHighestRatePermille).filter((value): value is number => value !== undefined);
  const periodCategories = [...new Set(sorted.map((record) => record.taxPeriodCategory))];
  const years = [...new Set(sorted.map((record) => record.gregorianYear))];
  const duplicateYearPeriodCount = sorted.length - new Set(sorted.map((record) => `${record.rocYear}|${record.taxPeriod}`)).size;
  const summary: LandValueTaxProgressiveBracketSummary = {
    totalRecords: sorted.length, minRocYear: first?.rocYear, maxRocYear: latest?.rocYear, minGregorianYear: first?.gregorianYear, maxGregorianYear: latest?.gregorianYear,
    latestRecord: latest && { rocYear: latest.rocYear, gregorianYear: latest.gregorianYear, taxPeriod: latest.taxPeriod, paymentPeriodStartDate: latest.paymentPeriodStartDate, paymentPeriodEndDate: latest.paymentPeriodEndDate, generalLandProgressiveStartingPointLandValue: latest.generalLandProgressiveStartingPointLandValue, generalLandLowestRatePermille: latest.generalLandLowestRatePermille, generalLandHighestRatePermille: latest.generalLandHighestRatePermille, generalLandTaxBracketCount: latest.generalLandTaxBracketCount, selfUseResidentialLandTaxRatePermille: latest.selfUseResidentialLandTaxRatePermille, industrialLandTaxRatePermille: latest.industrialLandTaxRatePermille, publicFacilityReservedLandTaxRatePermille: latest.publicFacilityReservedLandTaxRatePermille, yearOverYearProgressiveStartingPointChange: latest.yearOverYearProgressiveStartingPointChange, yearOverYearProgressiveStartingPointPercentChange: latest.yearOverYearProgressiveStartingPointPercentChange },
    firstProgressiveStartingPointLandValue: first?.generalLandProgressiveStartingPointLandValue, latestProgressiveStartingPointLandValue: latest?.generalLandProgressiveStartingPointLandValue, minProgressiveStartingPointLandValue: starts.length ? Math.min(...starts) : undefined, maxProgressiveStartingPointLandValue: starts.length ? Math.max(...starts) : undefined, averageProgressiveStartingPointLandValue: average(starts),
    totalProgressiveStartingPointChange: first?.generalLandProgressiveStartingPointLandValue !== undefined && latest?.generalLandProgressiveStartingPointLandValue !== undefined ? latest.generalLandProgressiveStartingPointLandValue - first.generalLandProgressiveStartingPointLandValue : undefined,
    totalProgressiveStartingPointPercentChange: percentChange(latest?.generalLandProgressiveStartingPointLandValue, first?.generalLandProgressiveStartingPointLandValue),
    minGeneralLandLowestRatePermille: lowestRates.length ? Math.min(...lowestRates) : undefined, maxGeneralLandHighestRatePermille: highestRates.length ? Math.max(...highestRates) : undefined,
    byTaxPeriodCategory: periodCategories.map((taxPeriodCategory) => ({ taxPeriodCategory, count: sorted.filter((record) => record.taxPeriodCategory === taxPeriodCategory).length })),
    byGregorianYear: years.map((gregorianYear) => { const items = sorted.filter((record) => record.gregorianYear === gregorianYear); const primary = items.find((record) => record.taxPeriodCategory === 'annual') ?? items[0]; return { gregorianYear, rocYear: primary.rocYear, recordCount: items.length, taxPeriods: items.map((record) => record.taxPeriod), progressiveStartingPointLandValue: primary.generalLandProgressiveStartingPointLandValue, generalLandTaxBracketCount: primary.generalLandTaxBracketCount, selfUseResidentialLandTaxRatePermille: primary.selfUseResidentialLandTaxRatePermille, industrialLandTaxRatePermille: primary.industrialLandTaxRatePermille, publicFacilityReservedLandTaxRatePermille: primary.publicFacilityReservedLandTaxRatePermille }; }),
    annualSeries: sorted.map((record) => ({ rocYear: record.rocYear, gregorianYear: record.gregorianYear, taxPeriod: record.taxPeriod, paymentPeriodStartDate: record.paymentPeriodStartDate, paymentPeriodEndDate: record.paymentPeriodEndDate, paymentPeriodMonth: record.paymentPeriodMonth, paymentPeriodDayCount: record.paymentPeriodDayCount, generalLandProgressiveStartingPointLandValue: record.generalLandProgressiveStartingPointLandValue, generalLandLowestRatePermille: record.generalLandLowestRatePermille, generalLandHighestRatePermille: record.generalLandHighestRatePermille, generalLandTaxBracketCount: record.generalLandTaxBracketCount, selfUseResidentialLandTaxRatePermille: record.selfUseResidentialLandTaxRatePermille, industrialLandTaxRatePermille: record.industrialLandTaxRatePermille, publicFacilityReservedLandTaxRatePermille: record.publicFacilityReservedLandTaxRatePermille, yearOverYearProgressiveStartingPointChange: record.yearOverYearProgressiveStartingPointChange, yearOverYearProgressiveStartingPointPercentChange: record.yearOverYearProgressiveStartingPointPercentChange })),
    dataQuality: { missingYearCount: 0, invalidYearCount: 0, duplicateYearPeriodCount, missingTaxPeriodCount: sorted.filter((record) => !record.taxPeriodRaw).length, unknownTaxPeriodCount: sorted.filter((record) => record.taxPeriodCategory === 'unknown' || record.taxPeriodCategory === 'other').length, missingPaymentPeriodStartCount: sorted.filter((record) => !record.paymentPeriodStartRaw).length, invalidPaymentPeriodStartCount: sorted.filter((record) => record.paymentPeriodStartRaw && !record.paymentPeriodStartDate).length, missingPaymentPeriodEndCount: sorted.filter((record) => !record.paymentPeriodEndRaw).length, invalidPaymentPeriodEndCount: sorted.filter((record) => record.paymentPeriodEndRaw && !record.paymentPeriodEndDate).length, invalidPaymentPeriodRangeCount: sorted.filter((record) => record.paymentPeriodStartDate && record.paymentPeriodEndDate && !record.paymentPeriodDayCount).length, missingGeneralLandFormulaCount: sorted.filter((record) => !record.generalLandTaxFormulaRaw).length, failedGeneralLandBracketParseCount: sorted.filter((record) => record.generalLandTaxFormulaRaw && !record.generalLandTaxBracketCount).length, missingSelfUseResidentialFormulaCount: sorted.filter((record) => !record.selfUseResidentialLandTaxFormulaRaw).length, failedSelfUseResidentialRateParseCount: sorted.filter((record) => record.selfUseResidentialLandTaxFormulaRaw && record.selfUseResidentialLandTaxRatePermille === undefined).length, missingIndustrialFormulaCount: sorted.filter((record) => !record.industrialLandTaxFormulaRaw).length, failedIndustrialRateParseCount: sorted.filter((record) => record.industrialLandTaxFormulaRaw && record.industrialLandTaxRatePermille === undefined).length, missingPublicFacilityReservedFormulaCount: sorted.filter((record) => !record.publicFacilityReservedLandTaxFormulaRaw).length, failedPublicFacilityReservedRateParseCount: sorted.filter((record) => record.publicFacilityReservedLandTaxFormulaRaw && record.publicFacilityReservedLandTaxRatePermille === undefined).length, duplicateFallbackKeyCount: duplicateYearPeriodCount },
  };
  return summary;
}

async function updateRealEstateSummary(summary: LandValueTaxProgressiveBracketSummary) {
  try {
    const realEstate = JSON.parse(await readFile('public/data/real-price-summary.json', 'utf8')) as RealEstateSummary;
    realEstate.landValueTaxProgressiveBrackets = {
      latestYear: summary.latestRecord?.gregorianYear,
      latestProgressiveStartingPointLandValue: summary.latestRecord?.generalLandProgressiveStartingPointLandValue,
      latestGeneralLandHighestRatePermille: summary.latestRecord?.generalLandHighestRatePermille,
      latestGeneralLandTaxBracketCount: summary.latestRecord?.generalLandTaxBracketCount,
      latestYearOverYearProgressiveStartingPointPercentChange: summary.latestRecord?.yearOverYearProgressiveStartingPointPercentChange,
    };
    await writeJson('public/data/real-price-summary.json', realEstate);
  } catch {
    // Optional when run before the main real-estate summary exists.
  }
}

export async function convertLandValueTaxProgressiveBrackets() {
  const files = await listCsvFiles(directory);
  const warnings: string[] = [];
  const records = (await Promise.all(files.map(async (file) => convertLandValueTaxProgressiveBracketRows(await readCsv(file), basename(file), warnings)))).flat().sort((a, b) => a.gregorianYear - b.gregorianYear || a.taxPeriod.localeCompare(b.taxPeriod));
  const summary = buildLandValueTaxProgressiveBracketSummary(records);
  await writeJson('public/data/land-value-tax-progressive-brackets.json', records);
  await writeJson('public/data/land-value-tax-progressive-bracket-summary.json', summary);
  await updateRealEstateSummary(summary);
  await updateConversionReport({
    dataset: source,
    file: files[0] ?? directory,
    sourceUrl,
    status: files.length ? 'converted' : 'missing',
    notes: [`${records.length} land value tax bracket records`, `${summary.minGregorianYear}-${summary.maxGregorianYear}`, 'UTF-8-SIG CSV supported via shared reader with Big5 fallback.', 'Formula parsing preserves source formulas and is for visualization only; no official tax calculation, parcel lookup, geocoding, map markers, or tax advice.'],
  }, warnings);
  return { records, summary };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { records, summary } = await convertLandValueTaxProgressiveBrackets();
  console.log(`Land value tax bracket records: ${records.length}; latest year: ${summary.latestRecord?.gregorianYear}`);
}

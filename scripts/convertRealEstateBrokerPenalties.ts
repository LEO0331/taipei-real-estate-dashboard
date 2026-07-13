import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { RealEstateBrokerPenaltyRecord, RealEstateBrokerPenaltySubjectType, RealEstateBrokerPenaltySummary, RealEstateSummary } from '../src/models.ts';
import { getColumn, listCsvFiles, parseTaiwanDate, readCsv, updateConversionReport, writeJson, type CsvRow } from './data.ts';

const directory = 'data/raw/real-estate-broker-penalties';
const source = '臺北市違反不動產經紀業管理條例裁罰名單';
const sourceAgency = '臺北市政府地政局';
const sourceUrl = 'https://data.taipei/dataset/detail?id=f1f30ba1-f081-47f3-b7a6-e38721f5600c';
const module = 'real_estate_broker_penalties' as const;

const clean = (value: unknown) => {
  const text = String(value ?? '').replace(/\u3000/g, ' ').trim();
  return text && !['-', '--', 'null', 'nan'].includes(text.toLowerCase()) ? text : undefined;
};
const normalize = (value: string | undefined) => value?.replace(/\s+/g, '').replace(/[，,。．.、:：;；()（）\[\]【】]/g, '');
const hash = (row: CsvRow) => createHash('sha1').update(JSON.stringify(row)).digest('hex').slice(0, 16);

export function parsePenaltyAmount(raw: unknown): number | undefined {
  const text = clean(raw);
  if (!text) return undefined;
  const normalized = text.replace(/[，,]/g, '').replace(/(?:新臺幣|新台幣|NTD|NT\$|元|圓|罰鍰|處罰金|約|共|計)/gi, '');
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  const value = match ? Number(match[0]) : NaN;
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function classifySubjectType(subject: string | undefined): RealEstateBrokerPenaltySubjectType {
  if (!subject) return 'unknown';
  // Classification is deliberately lexical only: no identity or operating-status inference.
  return /公司|企業|有限公司|股份有限公司|不動產經紀業|房屋|地產|仲介/.test(subject) ? 'brokerage' : 'individual';
}

export function classifyViolationCategory(rule: string | undefined): string {
  if (!rule) return '未分類 / Unclassified';
  const article = rule.match(/(?:第\s*)?\d+(?:\s*之\s*\d+)?\s*條/)?.[0]?.replace(/\s/g, '');
  return article ? `管理條例 ${article}` : '其他規定 / Other provision';
}

export function makeRealEstateBrokerPenaltyRecord(row: CsvRow, index: number): { record?: RealEstateBrokerPenaltyRecord; invalidDate: boolean; invalidAmount: boolean; missingFields: number } {
  const cityNameRaw = clean(getColumn(row, ['縣市', '城市', 'city', 'city name']));
  const dispositionDateRaw = clean(getColumn(row, ['處分日期', '處分日', '日期', 'disposition date']));
  const subjectNameRaw = clean(getColumn(row, ['經紀業/姓名', '經紀業姓名', '經紀業／姓名', '受處分人', 'subject']));
  const penaltyAmountRaw = clean(getColumn(row, ['處罰金額', '罰鍰金額', '罰款金額', 'penalty amount']));
  const violationRuleRaw = clean(getColumn(row, ['違反規定', '違反法規', '違規事項', 'violation rule']));
  const parsedDate = parseTaiwanDate(dispositionDateRaw);
  const penaltyAmount = parsePenaltyAmount(penaltyAmountRaw);
  const missingFields = [cityNameRaw, dispositionDateRaw, subjectNameRaw, penaltyAmountRaw, violationRuleRaw].filter((item) => !item).length;
  const invalidDate = !!dispositionDateRaw && !parsedDate.date;
  const invalidAmount = !!penaltyAmountRaw && penaltyAmount === undefined;
  if (missingFields === 5) return { invalidDate, invalidAmount, missingFields };
  return {
    invalidDate,
    invalidAmount,
    missingFields,
    record: {
      id: `${parsedDate.date ?? 'unknown-date'}-${normalize(subjectNameRaw) ?? 'unknown-subject'}-${penaltyAmountRaw ?? 'unknown-amount'}-${index}`,
      module, source, sourceAgency, sourceRecordHash: hash(row),
      cityNameRaw, cityName: cityNameRaw,
      dispositionDateRaw, dispositionDate: parsedDate.date, dispositionYear: parsedDate.year, dispositionMonth: parsedDate.month,
      subjectNameRaw, subjectName: subjectNameRaw, subjectNameNormalized: normalize(subjectNameRaw),
      penaltyAmountRaw, penaltyAmount,
      violationRuleRaw, violationRule: violationRuleRaw, violationRuleNormalized: normalize(violationRuleRaw),
      violationCategory: classifyViolationCategory(violationRuleRaw), subjectType: classifySubjectType(subjectNameRaw),
    },
  };
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return undefined;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const sum = (records: RealEstateBrokerPenaltyRecord[]) => records.reduce((total, record) => total + (record.penaltyAmount ?? 0), 0);

export function buildRealEstateBrokerPenaltySummary(records: RealEstateBrokerPenaltyRecord[], dataQuality: RealEstateBrokerPenaltySummary['dataQuality']): RealEstateBrokerPenaltySummary {
  const amounts = records.map((record) => record.penaltyAmount).filter((value): value is number => value !== undefined);
  const years = [...new Set(records.map((record) => record.dispositionYear).filter((value): value is number => value !== undefined))].sort((a, b) => a - b);
  const categoryCounts = new Map<string, RealEstateBrokerPenaltyRecord[]>();
  for (const record of records) categoryCounts.set(record.violationCategory, [...(categoryCounts.get(record.violationCategory) ?? []), record]);
  const byViolationCategory = [...categoryCounts].map(([violationCategory, items]) => ({ violationCategory, recordCount: items.length, totalPenaltyAmount: sum(items) })).sort((a, b) => b.recordCount - a.recordCount || b.totalPenaltyAmount - a.totalPenaltyAmount);
  const bands = [[0, 50_000, 'Under NT$50,000'], [50_000, 100_000, 'NT$50,000–99,999'], [100_000, 300_000, 'NT$100,000–299,999'], [300_000, undefined, 'NT$300,000+']] as const;
  return {
    totalRecords: records.length, latestYear: years.at(-1), totalPenaltyAmount: amounts.reduce((total, value) => total + value, 0),
    averagePenaltyAmount: amounts.length ? amounts.reduce((total, value) => total + value, 0) / amounts.length : undefined,
    medianPenaltyAmount: median(amounts), highestPenaltyAmount: amounts.length ? Math.max(...amounts) : undefined,
    uniqueSubjectCount: new Set(records.map((record) => record.subjectNameNormalized).filter(Boolean)).size,
    mostCommonViolationCategory: byViolationCategory[0]?.violationCategory,
    byYear: years.map((year) => { const items = records.filter((record) => record.dispositionYear === year); const totalPenaltyAmount = sum(items); const parsed = items.filter((record) => record.penaltyAmount !== undefined); return { year, recordCount: items.length, totalPenaltyAmount, averagePenaltyAmount: parsed.length ? totalPenaltyAmount / parsed.length : undefined }; }),
    byViolationCategory,
    bySubjectType: (['brokerage', 'individual', 'unknown'] as const).map((subjectType) => ({ subjectType, recordCount: records.filter((record) => record.subjectType === subjectType).length })),
    penaltyAmountDistribution: bands.map(([min, max, label]) => ({ label, min, max, recordCount: amounts.filter((value) => value >= min && (max === undefined || value < max)).length })),
    dataQuality,
  };
}

export async function convertRealEstateBrokerPenalties() {
  const files = await listCsvFiles(directory);
  const file = files.at(-1);
  const rows = file ? await readCsv(file) : [];
  let invalidDateCount = 0; let invalidAmountCount = 0; let missingFieldCount = 0;
  const seen = new Set<string>(); let duplicateCount = 0;
  const records = rows.flatMap((row, index) => {
    const result = makeRealEstateBrokerPenaltyRecord(row, index + 1);
    invalidDateCount += Number(result.invalidDate); invalidAmountCount += Number(result.invalidAmount); missingFieldCount += result.missingFields;
    if (!result.record) return [];
    const dedupeKey = [result.record.dispositionDate ?? result.record.dispositionDateRaw, result.record.subjectNameNormalized, result.record.penaltyAmount ?? result.record.penaltyAmountRaw, result.record.violationRuleNormalized].join('|');
    if (seen.has(dedupeKey)) { duplicateCount += 1; return []; }
    seen.add(dedupeKey); return [result.record];
  }).sort((a, b) => (a.dispositionDate ?? '').localeCompare(b.dispositionDate ?? '') || (a.subjectNameNormalized ?? '').localeCompare(b.subjectNameNormalized ?? ''));
  const dataQuality = { invalidDateCount, invalidAmountCount, missingFieldCount, duplicateCount, recordsWithParsedDate: records.filter((record) => record.dispositionDate).length, recordsWithParsedAmount: records.filter((record) => record.penaltyAmount !== undefined).length };
  const summary = buildRealEstateBrokerPenaltySummary(records, dataQuality);
  await writeJson('public/data/real-estate-broker-penalties/records.json', records);
  await writeJson('public/data/real-estate-broker-penalties/summary.json', summary);
  try {
    const overview = JSON.parse(await readFile('public/data/real-price-summary.json', 'utf8')) as RealEstateSummary;
    overview.realEstateBrokerPenalties = { totalRecords: summary.totalRecords, latestYear: summary.latestYear, totalPenaltyAmount: summary.totalPenaltyAmount };
    await writeJson('public/data/real-price-summary.json', overview);
  } catch { /* Overview is optional for standalone conversion. */ }
  await updateConversionReport({ dataset: source, file: file ?? directory, status: file ? 'converted' : 'missing', sourceUrl, notes: [`${records.length} normalized records`, `Invalid dates: ${invalidDateCount}; invalid amounts: ${invalidAmountCount}; missing fields: ${missingFieldCount}; duplicates removed: ${duplicateCount}.`, 'All source fields are preserved as raw strings. UTF-8-SIG, Big5, and CP950 decoding is handled by readCsv.', 'No addresses or coordinates are present; no map markers are generated.'] }, []);
  return { records, summary };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { records } = await convertRealEstateBrokerPenalties();
  console.log(`real-estate broker penalties: ${records.length}`);
}

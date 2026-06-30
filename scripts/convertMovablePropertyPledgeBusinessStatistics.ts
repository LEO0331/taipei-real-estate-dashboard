import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { getColumn, listCsvFiles, percentChange, readCsv, updateConversionReport, writeJson } from './data.ts';
import type { CsvRow } from './data.ts';
import type { MovablePropertyPledgeAnnualSummary, MovablePropertyPledgeBusinessRecord, MovablePropertyPledgeBusinessSummary, MovablePropertyPledgeItemCategory, RealEstateSummary } from '../src/models.ts';

const directory = 'data/raw/movable-property-pledge-business-statistics';
const source = '臺北市動產質借處營業概況';
const sourceAgency = '臺北市政府財政局動產質借處';
const sourceUrl = 'https://data.taipei/dataset/detail?id=da9ed005-8f06-446a-b61a-d46e7d8d6ac9';
const module = 'movable_property_pledge_business_statistics' as const;

const labels: Record<MovablePropertyPledgeItemCategory, { zh: string; en: string }> = {
  total: { zh: '合計', en: 'Total' },
  gold_jewelry: { zh: '黃金珠寶', en: 'Gold and jewelry' },
  watches: { zh: '鐘錶', en: 'Watches' },
  motorcycle: { zh: '機車', en: 'Motorcycle' },
  other: { zh: '其他', en: 'Other' },
  unknown: { zh: '未分類', en: 'Unknown' },
};

export function cleanText(raw: unknown): string | undefined {
  const text = String(raw ?? '').replace(/\u3000/g, ' ').trim();
  return !text || ['-', '--', 'nan', 'null'].includes(text.toLowerCase()) ? undefined : text;
}

export function parseYearFromResourceName(resourceName: string) {
  const rocYear = Number(resourceName.match(/(\d{3})年度/)?.[1] ?? resourceName.match(/(\d{3})年/)?.[1]);
  return Number.isFinite(rocYear) ? { rocYear, dataYear: rocYear + 1911 } : { warning: `Unable to parse ROC year from ${resourceName}` };
}

export function parseNtdAmount(raw: unknown) {
  const text = cleanText(raw)?.replace(/[,，\s元]/g, '');
  if (!text) return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

export function parseCaseCount(raw: unknown) {
  const value = parseNtdAmount(String(raw ?? '').replace('件', ''));
  return value === undefined ? undefined : Math.trunc(value);
}

export function classifyMovablePropertyPledgeItemCategory(raw: string | undefined): MovablePropertyPledgeItemCategory {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown';
  if (text === '計' || text.includes('合計') || text.includes('總計')) return 'total';
  if (text.includes('黃金') || text.includes('金飾') || text.includes('珠寶')) return 'gold_jewelry';
  if (text.includes('手錶') || text.includes('鐘錶')) return 'watches';
  if (text.includes('機車')) return 'motorcycle';
  return 'other';
}

const divide = (a: number | undefined, b: number | undefined) => a === undefined || !b ? undefined : a / b;
const ratio = (a: number | undefined, b: number | undefined) => { const value = divide(a, b); return value === undefined ? undefined : value * 100; };
const compact = <T extends object>(value: T): T => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== '')) as T;
const normal = (value: string | undefined) => cleanText(value)?.replace(/\s/g, '') ?? '';
const hash = (row: CsvRow) => createHash('sha1').update(JSON.stringify(row)).digest('hex').slice(0, 12);
const completeScore = (record: MovablePropertyPledgeBusinessRecord) => [
  record.annualPledgeCaseCount, record.annualPledgePrincipalNtd, record.cashInterestIncomeNtd, record.annualSaleTotalNtd,
  record.annualSalePrincipalNtd, record.annualSaleInterestNtd, record.annualSaleProfitNtd,
].filter((value) => value !== undefined).length;

function makeRecord(row: CsvRow, sourceResourceName: string, index: number, warnings: string[]): MovablePropertyPledgeBusinessRecord | undefined {
  const year = parseYearFromResourceName(sourceResourceName);
  if (!year.dataYear) {
    warnings.push(year.warning ?? `Missing year: ${sourceResourceName}`);
    return undefined;
  }
  const branchRaw = cleanText(getColumn(row, ['分處別', '分處']));
  const itemRaw = cleanText(getColumn(row, ['項目']));
  const itemCategory = classifyMovablePropertyPledgeItemCategory(itemRaw);
  const annualPledgeCaseCount = parseCaseCount(getColumn(row, ['本年質借件數', '本年質借筆數']));
  const annualPledgePrincipalNtd = parseNtdAmount(getColumn(row, ['本年質借本金', '本年質借本金金額']));
  const cashInterestIncomeNtd = parseNtdAmount(getColumn(row, ['現金利息收入', '現金利息收入金額']));
  const annualSaleTotalNtd = parseNtdAmount(getColumn(row, ['本年變賣總計', '本年變賣總計金額']));
  const annualSalePrincipalNtd = parseNtdAmount(getColumn(row, ['本年變賣本金', '本年變賣本金金額']));
  const annualSaleInterestNtd = parseNtdAmount(getColumn(row, ['本年變賣利息', '本年變賣利息金額']));
  const annualSaleProfitNtd = parseNtdAmount(getColumn(row, ['本年變賣利益', '本年變賣利益金額']));
  const branchName = branchRaw;
  const id = `${year.dataYear}|${normal(branchName)}|${normal(itemRaw) || index}`;
  return compact({
    id, module, dataYear: year.dataYear, rocYear: year.rocYear, sourceResourceName,
    branchRaw, branchName, branchNameNormalized: normal(branchName), itemRaw, itemCategory, itemCategoryNormalized: labels[itemCategory].en,
    annualPledgeCaseCount, annualPledgePrincipalNtd, cashInterestIncomeNtd, annualSaleTotalNtd, annualSalePrincipalNtd, annualSaleInterestNtd, annualSaleProfitNtd,
    averagePrincipalPerCaseNtd: divide(annualPledgePrincipalNtd, annualPledgeCaseCount),
    cashInterestIncomePerCaseNtd: divide(cashInterestIncomeNtd, annualPledgeCaseCount),
    saleTotalToPledgePrincipalRatioPercent: ratio(annualSaleTotalNtd, annualPledgePrincipalNtd),
    saleProfitToSaleTotalRatioPercent: ratio(annualSaleProfitNtd, annualSaleTotalNtd),
    salePrincipalSharePercent: ratio(annualSalePrincipalNtd, annualSaleTotalNtd),
    saleInterestSharePercent: ratio(annualSaleInterestNtd, annualSaleTotalNtd),
    isTotalRow: itemCategory === 'total',
    sourceRecordHash: hash(row),
    source,
    sourceAgency,
  } satisfies MovablePropertyPledgeBusinessRecord);
}

export function buildMovablePropertyPledgeBusinessSummary(records: MovablePropertyPledgeBusinessRecord[]): MovablePropertyPledgeBusinessSummary {
  const years = [...new Set(records.map((record) => record.dataYear))].sort((a, b) => a - b);
  const total = <K extends keyof MovablePropertyPledgeBusinessRecord>(items: MovablePropertyPledgeBusinessRecord[], key: K) => items.reduce((sum, item) => sum + (typeof item[key] === 'number' ? item[key] as number : 0), 0);
  const isCitywide = (record: MovablePropertyPledgeBusinessRecord) => record.branchName === '總計';
  const selectedForYear = (year: number) => {
    const items = records.filter((record) => record.dataYear === year);
    const citywideTotal = items.filter((record) => isCitywide(record) && record.isTotalRow);
    const branchTotals = items.filter((record) => !isCitywide(record) && record.isTotalRow);
    return citywideTotal.length ? citywideTotal : branchTotals.length ? branchTotals : items.filter((record) => !isCitywide(record));
  };
  const top = (items: MovablePropertyPledgeBusinessRecord[], key: 'annualPledgeCaseCount' | 'annualPledgePrincipalNtd') => [...items].sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0))[0];
  const byYear: MovablePropertyPledgeAnnualSummary[] = years.map((dataYear) => {
    const all = records.filter((record) => record.dataYear === dataYear);
    const items = selectedForYear(dataYear);
    const cases = total(items, 'annualPledgeCaseCount');
    const principal = total(items, 'annualPledgePrincipalNtd');
    const interest = total(items, 'cashInterestIncomeNtd');
    const sale = total(items, 'annualSaleTotalNtd');
    const topCategory = top(items, 'annualPledgeCaseCount')?.itemCategory;
    return {
      dataYear,
      recordCount: all.length,
      totalPledgeCaseCount: cases,
      totalPledgePrincipalNtd: principal,
      totalCashInterestIncomeNtd: interest,
      totalSaleTotalNtd: sale,
      totalSalePrincipalNtd: total(items, 'annualSalePrincipalNtd'),
      totalSaleInterestNtd: total(items, 'annualSaleInterestNtd'),
      totalSaleProfitNtd: total(items, 'annualSaleProfitNtd'),
      averagePrincipalPerCaseNtd: divide(principal, cases),
      cashInterestIncomePerCaseNtd: divide(interest, cases),
      branchCount: new Set(all.map((record) => record.branchName).filter((value) => value && value !== '總計')).size,
      itemCategoryCount: new Set(all.map((record) => record.itemCategory)).size,
      topBranchByPledgeCaseCount: top(items, 'annualPledgeCaseCount')?.branchName,
      topBranchByPledgePrincipal: top(items, 'annualPledgePrincipalNtd')?.branchName,
      topItemCategoryByPledgeCaseCount: topCategory,
    };
  });
  const byBranch = [...new Set(records.map((record) => record.branchName).filter((value): value is string => !!value && value !== '總計'))].map((branchName) => {
    const items = records.filter((record) => record.branchName === branchName && (record.isTotalRow || !records.some((other) => other.branchName === branchName && other.dataYear === record.dataYear && other.isTotalRow)));
    return { branchName, recordCount: records.filter((record) => record.branchName === branchName).length, totalPledgeCaseCount: total(items, 'annualPledgeCaseCount'), totalPledgePrincipalNtd: total(items, 'annualPledgePrincipalNtd'), totalCashInterestIncomeNtd: total(items, 'cashInterestIncomeNtd'), totalSaleTotalNtd: total(items, 'annualSaleTotalNtd') };
  });
  const byItemCategory = ([...new Set(records.map((record) => record.itemCategory))] as MovablePropertyPledgeItemCategory[]).map((itemCategory) => {
    const items = records.filter((record) => record.itemCategory === itemCategory);
    return { itemCategory, itemLabelZh: labels[itemCategory].zh, itemLabelEn: labels[itemCategory].en, recordCount: items.length, totalPledgeCaseCount: total(items, 'annualPledgeCaseCount'), totalPledgePrincipalNtd: total(items, 'annualPledgePrincipalNtd'), totalCashInterestIncomeNtd: total(items, 'cashInterestIncomeNtd'), totalSaleTotalNtd: total(items, 'annualSaleTotalNtd') };
  });
  const latestYear = years.at(-1);
  const latestItems = latestYear ? selectedForYear(latestYear) : [];
  return { totalRecords: records.length, minYear: years[0], maxYear: latestYear, latestYear, branchCount: byBranch.length, itemCategoryCount: byItemCategory.length, latestAnnualSummary: byYear.at(-1), byYear, byBranch, byItemCategory, latestYearBranchBreakdown: latestItems.map((record) => ({ branchName: record.branchName ?? '—', pledgeCaseCount: record.annualPledgeCaseCount, pledgePrincipalNtd: record.annualPledgePrincipalNtd, cashInterestIncomeNtd: record.cashInterestIncomeNtd, saleTotalNtd: record.annualSaleTotalNtd })) };
}

export async function convertMovablePropertyPledgeBusinessStatistics() {
  const files = await listCsvFiles(directory);
  const warnings: string[] = [];
  const seen = new Map<string, MovablePropertyPledgeBusinessRecord>();
  for (const file of files) {
    const sourceResourceName = basename(file);
    const rows = await readCsv(file);
    rows.forEach((row, index) => {
      const record = makeRecord(row, sourceResourceName, index + 1, warnings);
      if (!record) return;
      const duplicate = seen.get(record.id);
      if (duplicate) warnings.push(`Duplicate year-branch-item row: ${record.id}`);
      if (!duplicate || completeScore(record) > completeScore(duplicate)) seen.set(record.id, record);
    });
  }
  const records = [...seen.values()].sort((a, b) => a.dataYear - b.dataYear || (a.branchName ?? '').localeCompare(b.branchName ?? '', 'zh-Hant') || (a.itemRaw ?? '').localeCompare(b.itemRaw ?? '', 'zh-Hant'));
  for (const key of new Set(records.map((record) => `${record.branchNameNormalized}|${record.itemCategory}|${record.itemRaw ?? ''}`))) {
    const items = records.filter((record) => `${record.branchNameNormalized}|${record.itemCategory}|${record.itemRaw ?? ''}` === key).sort((a, b) => a.dataYear - b.dataYear);
    items.forEach((record, index) => {
      const previous = items[index - 1];
      if (!previous) return;
      record.yearOverYearPledgeCaseChangePercent = percentChange(record.annualPledgeCaseCount, previous.annualPledgeCaseCount);
      record.yearOverYearPledgePrincipalChangePercent = percentChange(record.annualPledgePrincipalNtd, previous.annualPledgePrincipalNtd);
      record.yearOverYearCashInterestIncomeChangePercent = percentChange(record.cashInterestIncomeNtd, previous.cashInterestIncomeNtd);
      record.yearOverYearSaleTotalChangePercent = percentChange(record.annualSaleTotalNtd, previous.annualSaleTotalNtd);
    });
  }
  const summary = buildMovablePropertyPledgeBusinessSummary(records);
  await writeJson('public/data/movable-property-pledge-business-records.json', records);
  await writeJson('public/data/movable-property-pledge-business-summary.json', summary);
  await writeJson('public/data/movable-property-pledge-business-annual-summary.json', summary.byYear);
  try {
    const realEstate = JSON.parse(await readFile('public/data/real-price-summary.json', 'utf8')) as RealEstateSummary;
    realEstate.movablePropertyPledgeBusinessStatistics = {
      latestYear: summary.latestYear,
      latestYearPledgeCaseCount: summary.latestAnnualSummary?.totalPledgeCaseCount,
      latestYearPledgePrincipalNtd: summary.latestAnnualSummary?.totalPledgePrincipalNtd,
      latestYearCashInterestIncomeNtd: summary.latestAnnualSummary?.totalCashInterestIncomeNtd,
    };
    await writeJson('public/data/real-price-summary.json', realEstate);
  } catch {
    // real-price summary is optional when this converter is run alone.
  }
  await updateConversionReport({ dataset: source, file: files[0] ?? directory, sourceUrl, status: files.length ? 'converted' : 'missing', notes: [`${records.length} normalized records`, `${files.length} annual CSV file(s)`, 'Official agency metadata: 財政局動質處.', 'Annual operating statistics only; socioeconomic context, not price/rent/mortgage/lending advice.'] }, warnings);
  return { records, summary };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { records } = await convertMovablePropertyPledgeBusinessStatistics();
  console.log(`movable-property pledge records: ${records.length}`);
}

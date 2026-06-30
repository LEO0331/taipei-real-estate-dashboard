import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { DISTRICTS, type District, type IncomePerEarnerByDistrictYearRecord, type IncomePerEarnerByDistrictYearSummary, type RealEstateSummary } from '../src/models.ts';
import { getColumn, listCsvFiles, parseCsv, percentChange, updateConversionReport, writeJson, type CsvRow } from './data.ts';

const directory = 'data/raw/income-per-earner-by-district-year';
const source = '臺北市所得收入者每人所得－行政區別按年別';
const sourceAgency = '臺北市政府主計處';
const sourceUrl = 'https://data.taipei/dataset/detail?id=33da4ba0-c366-45eb-a71f-1991e6455ed6';
const module = 'income_per_earner_by_district_year' as const;

export function cleanText(raw: unknown): string | undefined {
  const text = String(raw ?? '').replace(/\u3000/g, ' ').trim();
  return !text || ['-', '--', 'nan', 'null'].includes(text.toLowerCase()) ? undefined : text;
}

export function parseRocYear(raw: unknown) {
  const text = cleanText(raw);
  const rocYear = Number(text?.match(/\d+/)?.[0]);
  return Number.isFinite(rocYear) ? { rocYear, dataYear: rocYear + 1911 } : {};
}

export function parseNtdValue(raw: unknown): number | undefined {
  const text = cleanText(raw)?.replace(/[,，\s元]/g, '');
  if (!text) return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

export function normalizeIncomeDistrict(raw: unknown): { district?: District; districtNormalized: string; isCityAverage: boolean } {
  const districtNormalized = cleanText(raw)?.replace(/臺北市|台北市|\s/g, '') ?? '';
  const isCityAverage = /總平均|平均/.test(districtNormalized);
  const district = DISTRICTS.find((item) => districtNormalized === item || districtNormalized.includes(item));
  return { district, districtNormalized, isCityAverage };
}

const ratio = (a: number | undefined, b: number | undefined) => a === undefined || !b ? undefined : (a / b) * 100;
const compact = <T extends object>(value: T): T => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== '')) as T;
const hash = (row: CsvRow) => createHash('sha1').update(JSON.stringify(row)).digest('hex').slice(0, 12);
const total = <K extends keyof IncomePerEarnerByDistrictYearRecord>(items: IncomePerEarnerByDistrictYearRecord[], key: K) =>
  items.reduce((sum, item) => sum + (typeof item[key] === 'number' ? item[key] as number : 0), 0);

async function readIncomeCsv(path: string): Promise<CsvRow[]> {
  const bytes = await readFile(path);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return parseCsv(new TextDecoder('utf-8').decode(bytes));
  const big5Rows = parseCsv(new TextDecoder('big5').decode(bytes));
  const headers = Object.keys(big5Rows[0] ?? {});
  if (headers.includes('年別') && headers.includes('行政區')) return big5Rows;
  return parseCsv(new TextDecoder('utf-8').decode(bytes));
}

function makeRecord(row: CsvRow, sourceResourceName: string, index: number, warnings: string[]): IncomePerEarnerByDistrictYearRecord | undefined {
  const yearRaw = cleanText(getColumn(row, ['年別']));
  const year = parseRocYear(yearRaw);
  if (!year.dataYear) {
    warnings.push(`Unable to parse income year in ${sourceResourceName} row ${index}`);
    return undefined;
  }
  const districtRaw = cleanText(getColumn(row, ['行政區']));
  const { district, districtNormalized, isCityAverage } = normalizeIncomeDistrict(districtRaw);
  if (!district && !isCityAverage) warnings.push(`Unknown district "${districtRaw}" in ${sourceResourceName} row ${index}`);
  const totalIncomeNtd = parseNtdValue(getColumn(row, ['[一]所得收入總計[NT]', '所得收入總計']));
  const employeeCompensationNtd = parseNtdValue(getColumn(row, ['1.受僱人員報酬[NT]', '受僱人員報酬']));
  const mainJobSalaryNtd = parseNtdValue(getColumn(row, ['[1]本業薪資[NT]', '本業薪資']));
  const sideJobSalaryNtd = parseNtdValue(getColumn(row, ['[2]兼業薪資[NT]', '兼業薪資']));
  const businessOwnerIncomeNtd = parseNtdValue(getColumn(row, ['2.產業主所得[NT]', '產業主所得']));
  const propertyIncomeNtd = parseNtdValue(getColumn(row, ['3.財產所得收入[NT]', '財產所得收入']));
  const currentTransferIncomeNtd = parseNtdValue(getColumn(row, ['5.經常移轉收入[NT]', '經常移轉收入']));
  const nonConsumptionExpenditureNtd = parseNtdValue(getColumn(row, ['[二]非消費支出[NT]', '非消費支出']));
  const interestExpenditureNtd = parseNtdValue(getColumn(row, ['1.利息支出[NT]', '利息支出']));
  const disposableIncomeNtd = parseNtdValue(getColumn(row, ['[三]可支配所得[NT]', '可支配所得']));
  return compact({
    id: `${year.dataYear}|${isCityAverage ? 'city-average' : districtNormalized || index}`,
    module, source, sourceAgency, sourceResourceName, sourceRecordHash: hash(row),
    yearRaw, rocYear: year.rocYear, dataYear: year.dataYear, districtRaw, district, districtNormalized, isCityAverage,
    incomeEarnerCount: parseNtdValue(getColumn(row, ['所得收入者人數'])),
    totalIncomeNtd, employeeCompensationNtd, mainJobSalaryNtd, sideJobSalaryNtd,
    otherEmployeeIncomeNtd: parseNtdValue(getColumn(row, ['[3]其他收入[NT]', '其他收入'])),
    businessOwnerIncomeNtd,
    agriculturalNetIncomeNtd: parseNtdValue(getColumn(row, ['[1]農業淨收入[NT]', '農業淨收入'])),
    businessNetIncomeNtd: parseNtdValue(getColumn(row, ['[2]營業淨收入[NT]', '營業淨收入'])),
    professionalPracticeNetIncomeNtd: parseNtdValue(getColumn(row, ['[3]執行業務淨收入[NT]', '執行業務淨收入'])),
    propertyIncomeNtd,
    imputedOwnerOccupiedRentIncomeNtd: parseNtdValue(getColumn(row, ['4.自用住宅設算租金收入[NT]', '自用住宅設算租金收入'])),
    currentTransferIncomeNtd,
    transferFromPrivateNtd: parseNtdValue(getColumn(row, ['[1]從私人[NT]', '從私人'])),
    transferFromGovernmentNtd: parseNtdValue(getColumn(row, ['[2]從政府[NT]', '從政府'])),
    socialInsuranceBenefitNtd: parseNtdValue(getColumn(row, ['[3]社會保險受益[NT]', '社會保險受益'])),
    transferFromEnterpriseNtd: parseNtdValue(getColumn(row, ['[4]從企業[NT]', '從企業'])),
    transferFromAbroadNtd: parseNtdValue(getColumn(row, ['[5]從國外[NT]', '從國外'])),
    miscellaneousIncomeNtd: parseNtdValue(getColumn(row, ['6.雜項收入[NT]', '雜項收入'])),
    nonConsumptionExpenditureNtd, interestExpenditureNtd,
    currentTransferExpenditureNtd: parseNtdValue(getColumn(row, ['2.經常移轉支出[NT]', '經常移轉支出'])),
    transferToPrivateNtd: parseNtdValue(getColumn(row, ['[1]對私人[NT]', '對私人'])),
    transferToGovernmentNtd: parseNtdValue(getColumn(row, ['[2]對政府[NT]', '對政府'])),
    socialInsuranceExpenditureNtd: parseNtdValue(getColumn(row, ['[3]社會保險[NT]', '社會保險'])),
    transferToAbroadNtd: parseNtdValue(getColumn(row, ['[4]對國外[NT]', '對國外'])),
    disposableIncomeNtd,
    employeeCompensationSharePercent: ratio(employeeCompensationNtd, totalIncomeNtd),
    businessOwnerIncomeSharePercent: ratio(businessOwnerIncomeNtd, totalIncomeNtd),
    propertyIncomeSharePercent: ratio(propertyIncomeNtd, totalIncomeNtd),
    currentTransferIncomeSharePercent: ratio(currentTransferIncomeNtd, totalIncomeNtd),
    nonConsumptionExpenditureToTotalIncomePercent: ratio(nonConsumptionExpenditureNtd, totalIncomeNtd),
    interestExpenditureToTotalIncomePercent: ratio(interestExpenditureNtd, totalIncomeNtd),
    disposableIncomeToTotalIncomePercent: ratio(disposableIncomeNtd, totalIncomeNtd),
    mainJobSalaryShareOfEmployeeCompensationPercent: ratio(mainJobSalaryNtd, employeeCompensationNtd),
    sideJobSalaryShareOfEmployeeCompensationPercent: ratio(sideJobSalaryNtd, employeeCompensationNtd),
  } satisfies IncomePerEarnerByDistrictYearRecord);
}

function addRank(items: IncomePerEarnerByDistrictYearRecord[], key: 'totalIncomeNtd' | 'disposableIncomeNtd', rankKey: 'totalIncomeRank' | 'disposableIncomeRank') {
  [...items].filter((record) => !record.isCityAverage).sort((a, b) => (b[key] ?? -Infinity) - (a[key] ?? -Infinity)).forEach((record, index) => { record[rankKey] = index + 1; });
}

export function buildIncomePerEarnerSummary(records: IncomePerEarnerByDistrictYearRecord[]): IncomePerEarnerByDistrictYearSummary {
  const years = [...new Set(records.map((record) => record.dataYear))].sort((a, b) => a - b);
  const latestYear = years.at(-1);
  const latest = records.filter((record) => record.dataYear === latestYear);
  const latestDistricts = latest.filter((record) => !record.isCityAverage && record.district);
  const byYear = years.map((dataYear) => {
    const items = records.filter((record) => record.dataYear === dataYear);
    const city = items.find((record) => record.isCityAverage);
    const districts = items.filter((record) => !record.isCityAverage && record.district);
    const topIncome = [...districts].sort((a, b) => (b.totalIncomeNtd ?? 0) - (a.totalIncomeNtd ?? 0))[0];
    const topDisposable = [...districts].sort((a, b) => (b.disposableIncomeNtd ?? 0) - (a.disposableIncomeNtd ?? 0))[0];
    const lowDisposable = [...districts].sort((a, b) => (a.disposableIncomeNtd ?? Infinity) - (b.disposableIncomeNtd ?? Infinity))[0];
    return { dataYear, rocYear: city?.rocYear ?? items[0]?.rocYear, recordCount: items.length, cityAverageTotalIncomeNtd: city?.totalIncomeNtd, cityAverageDisposableIncomeNtd: city?.disposableIncomeNtd, cityAverageIncomeEarnerCount: city?.incomeEarnerCount, topDistrictByTotalIncome: topIncome?.district, topDistrictByDisposableIncome: topDisposable?.district, lowestDistrictByDisposableIncome: lowDisposable?.district };
  });
  const byDistrict = DISTRICTS.map((district) => {
    const items = records.filter((record) => record.district === district).sort((a, b) => a.dataYear - b.dataYear);
    const first = items[0];
    const latestItem = items.at(-1);
    return { district, recordCount: items.length, latestTotalIncomeNtd: latestItem?.totalIncomeNtd, latestDisposableIncomeNtd: latestItem?.disposableIncomeNtd, latestIncomeEarnerCount: latestItem?.incomeEarnerCount, totalIncomeChangeSinceFirstPercent: percentChange(latestItem?.totalIncomeNtd, first?.totalIncomeNtd), disposableIncomeChangeSinceFirstPercent: percentChange(latestItem?.disposableIncomeNtd, first?.disposableIncomeNtd) };
  });
  const city = latest.find((record) => record.isCityAverage);
  return {
    totalRecords: records.length,
    minYear: years[0],
    maxYear: latestYear,
    latestYear,
    districtCount: new Set(records.map((record) => record.district).filter(Boolean)).size,
    hasCityAverage: records.some((record) => record.isCityAverage),
    latestCityAverage: city,
    latestYearDistrictRanking: latestDistricts.sort((a, b) => (a.disposableIncomeRank ?? 99) - (b.disposableIncomeRank ?? 99)).map((record) => ({ district: record.district, totalIncomeNtd: record.totalIncomeNtd, disposableIncomeNtd: record.disposableIncomeNtd, incomeEarnerCount: record.incomeEarnerCount, totalIncomeRank: record.totalIncomeRank, disposableIncomeRank: record.disposableIncomeRank })),
    byYear,
    byDistrict,
    latestIncomeComposition: [
      { key: 'employeeCompensation', labelZh: '受僱人員報酬', labelEn: 'Employee compensation', valueNtd: city?.employeeCompensationNtd, sharePercent: city?.employeeCompensationSharePercent },
      { key: 'businessOwnerIncome', labelZh: '產業主所得', labelEn: 'Business-owner income', valueNtd: city?.businessOwnerIncomeNtd, sharePercent: city?.businessOwnerIncomeSharePercent },
      { key: 'propertyIncome', labelZh: '財產所得收入', labelEn: 'Property income', valueNtd: city?.propertyIncomeNtd, sharePercent: city?.propertyIncomeSharePercent },
      { key: 'transferIncome', labelZh: '經常移轉收入', labelEn: 'Current transfer income', valueNtd: city?.currentTransferIncomeNtd, sharePercent: city?.currentTransferIncomeSharePercent },
    ],
  };
}

export async function convertIncomePerEarnerByDistrictYear() {
  const files = await listCsvFiles(directory);
  const warnings: string[] = [];
  const seen = new Map<string, IncomePerEarnerByDistrictYearRecord>();
  for (const file of files) {
    const rows = await readIncomeCsv(file);
    rows.forEach((row, index) => {
      const record = makeRecord(row, basename(file), index + 1, warnings);
      if (record) seen.set(record.id, record);
    });
  }
  const records = [...seen.values()].sort((a, b) => a.dataYear - b.dataYear || a.districtNormalized.localeCompare(b.districtNormalized, 'zh-Hant'));
  for (const key of new Set(records.map((record) => record.isCityAverage ? 'city-average' : record.districtNormalized))) {
    const items = records.filter((record) => (record.isCityAverage ? 'city-average' : record.districtNormalized) === key).sort((a, b) => a.dataYear - b.dataYear);
    items.forEach((record, index) => {
      const previous = items[index - 1];
      record.yearOverYearTotalIncomeChangePercent = percentChange(record.totalIncomeNtd, previous?.totalIncomeNtd);
      record.yearOverYearDisposableIncomeChangePercent = percentChange(record.disposableIncomeNtd, previous?.disposableIncomeNtd);
    });
  }
  for (const year of new Set(records.map((record) => record.dataYear))) {
    const items = records.filter((record) => record.dataYear === year);
    addRank(items, 'totalIncomeNtd', 'totalIncomeRank');
    addRank(items, 'disposableIncomeNtd', 'disposableIncomeRank');
  }
  const summary = buildIncomePerEarnerSummary(records);
  const latest = records.filter((record) => record.dataYear === summary.latestYear);
  await writeJson('public/data/income-per-earner-by-district-year-records.json', records);
  await writeJson('public/data/income-per-earner-by-district-year-summary.json', summary);
  await writeJson('public/data/income-per-earner-by-district-year-latest.json', latest);
  try {
    const realEstate = JSON.parse(await readFile('public/data/real-price-summary.json', 'utf8')) as RealEstateSummary;
    realEstate.incomePerEarnerByDistrictYear = {
      latestYear: summary.latestYear,
      cityAverageTotalIncomeNtd: summary.latestCityAverage?.totalIncomeNtd,
      cityAverageDisposableIncomeNtd: summary.latestCityAverage?.disposableIncomeNtd,
      cityAverageIncomeEarnerCount: summary.latestCityAverage?.incomeEarnerCount,
      topDistrictByDisposableIncome: summary.byYear.at(-1)?.topDistrictByDisposableIncome,
    };
    await writeJson('public/data/real-price-summary.json', realEstate);
  } catch {
    // Optional when this converter is run before the main real-estate summary exists.
  }
  await updateConversionReport({
    dataset: source,
    file: files[0] ?? directory,
    sourceUrl,
    status: files.length ? 'converted' : 'missing',
    notes: [`${records.length} normalized records`, `${summary.minYear}-${summary.maxYear}`, 'Official agency metadata: 臺北市政府主計處.', 'Rankings exclude 總平均 and compare district-level rows only.', 'Socioeconomic income/affordability context only; not prediction, appraisal, tax, investment, lending, or financial advice.'],
  }, warnings);
  return { records, summary, latest };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { records, summary } = await convertIncomePerEarnerByDistrictYear();
  console.log(`income per earner records: ${records.length}; latest year: ${summary.latestYear}`);
}

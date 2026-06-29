import {
  buildResidentialPriceMonthlyIndexSummary,
  convertResidentialPriceMonthlyIndexRows,
  listCsvFiles,
  readCsv,
  updateConversionReport,
  writeJson,
} from './data.ts';

const files = await listCsvFiles('data/raw/residential-price-monthly-index');
const warnings: string[] = [];
const records = files.length ? convertResidentialPriceMonthlyIndexRows(await readCsv(files.at(-1)!), warnings) : [];
const summary = buildResidentialPriceMonthlyIndexSummary(records);
const categorySeries = summary.byCategory.map((category) => ({
  category: category.category,
  categoryLabelZh: category.categoryLabelZh,
  categoryLabelEn: category.categoryLabelEn,
  records: records
    .filter((record) => record.category === category.category)
    .map((record) => ({
      period: record.period,
      periodDate: record.periodDate,
      monthlyIndex: record.monthlyIndex,
      threeMonthMovingAverageIndex: record.threeMonthMovingAverageIndex,
      sixMonthMovingAverageIndex: record.sixMonthMovingAverageIndex,
      monthlyIndexChangePercent: record.monthlyIndexChangePercent,
      threeMonthMovingAverageChangePercent: record.threeMonthMovingAverageChangePercent,
      sixMonthMovingAverageChangePercent: record.sixMonthMovingAverageChangePercent,
      standardTotalPriceTenThousandNtd: record.standardTotalPriceTenThousandNtd,
      standardUnitPriceTenThousandNtdPerPing: record.standardUnitPriceTenThousandNtdPerPing,
      yearOverYearMonthlyIndexChangePercent: record.yearOverYearMonthlyIndexChangePercent,
      yearOverYearStandardUnitPriceChangePercent: record.yearOverYearStandardUnitPriceChangePercent,
    })),
}));

await writeJson('public/data/residential-price-monthly-index-records.json', records);
await writeJson('public/data/residential-price-monthly-index-summary.json', summary);
await writeJson('public/data/residential-price-monthly-index-category-series.json', categorySeries);
await updateConversionReport({
  dataset: '臺北市住宅價格月指數',
  file: files.at(-1) ?? 'data/raw/residential-price-monthly-index',
  status: files.length ? 'converted' : 'missing',
  sourceUrl: 'https://data.taipei/dataset/detail?id=ce4ea2c6-6334-44f8-945a-5705492b187d',
  notes: [
    `${records.length} normalized records`,
    'CP950/Big5 CSV is decoded with UTF-8 fallback first, then Big5.',
    'ROC year/month periods are converted to Gregorian monthly periods.',
    'Percent columns remain percentage-point values, not decimal ratios.',
    'Standard residential total price remains in NTD 10k and standard unit price remains in NTD 10k/ping, with NTD-derived fields.',
  ],
}, warnings);

console.log(`residential price monthly index records: ${records.length}`);

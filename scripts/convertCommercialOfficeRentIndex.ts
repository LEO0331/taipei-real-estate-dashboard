import {
  buildCommercialOfficeRentIndexSummary,
  convertCommercialOfficeRentIndexRows,
  listCsvFiles,
  readCsv,
  updateConversionReport,
  writeJson,
} from './data.ts';

const files = await listCsvFiles('data/raw/commercial-office-rent-index');
const warnings: string[] = [];
const records = files.length ? convertCommercialOfficeRentIndexRows(await readCsv(files.at(-1)!), warnings) : [];
const summary = buildCommercialOfficeRentIndexSummary(records);
const categorySeries = summary.byCategory.map((category) => ({
  category: category.category,
  categoryLabelZh: category.categoryLabelZh,
  categoryLabelEn: category.categoryLabelEn,
  records: records
    .filter((record) => record.category === category.category)
    .map((record) => ({
      period: record.period,
      periodDate: record.periodDate,
      quarterlyIndex: record.quarterlyIndex,
      quarterlyChangePercent: record.quarterlyChangePercent,
      standardRentNtdPerPingPerMonth: record.standardRentNtdPerPingPerMonth,
      standardRentNtdPerSqmPerMonth: record.standardRentNtdPerSqmPerMonth,
      yearOverYearQuarterlyIndexChangePercent: record.yearOverYearQuarterlyIndexChangePercent,
      yearOverYearStandardRentChangePercent: record.yearOverYearStandardRentChangePercent,
      rentGapNtdPerPingPerMonth: record.rentGapNtdPerPingPerMonth,
      rentGapPercent: record.rentGapPercent,
    })),
}));

await writeJson('public/data/commercial-office-rent-index-records.json', records);
await writeJson('public/data/commercial-office-rent-index-summary.json', summary);
await writeJson('public/data/commercial-office-rent-index-category-series.json', categorySeries);
await updateConversionReport({
  dataset: '臺北市商辦租金指數',
  file: files.at(-1) ?? 'data/raw/commercial-office-rent-index',
  status: files.length ? 'converted' : 'missing',
  sourceUrl: 'https://data.taipei/dataset/detail?id=8a3d1df7-9169-4dd0-ae0a-949d970e9bb3',
  notes: [
    `${records.length} normalized records`,
    'UTF-8-SIG CSV; Big5/CP950 fallback is supported by TextDecoder.',
    'ROC quarter periods are converted to Gregorian quarter periods.',
    'Quarterly change rates remain source percent values, not decimal ratios.',
    'Standard rent unit price remains NTD per ping per month, with NTD per square meter derived.',
  ],
}, warnings);

console.log(`commercial office rent index records: ${records.length}`);

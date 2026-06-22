import { convertQuarterlyRows, listCsvFiles, readCsv, updateConversionReport, writeJson } from './data.ts';

const files = await listCsvFiles('data/raw/quarterly-market-analysis');
const warnings: string[] = [];
const file = files.at(-1);
const filename = file?.split('/').at(-1) ?? '';
const rocYear = Number(filename.match(/(\d{3})年/)?.[1] ?? 114);
const quarter = Number(filename.match(/第(\d)季/)?.[1] ?? 2);
const records = file ? convertQuarterlyRows(await readCsv(file), rocYear + 1911, quarter, warnings) : [];

await writeJson('public/data/quarterly-market-analysis.json', records);
await writeJson('public/data/quarterly-market-summary.json', {
  latestQuarter: records[0]?.quarterLabel,
  totalSaleCaseCount: records.reduce((sum, item) => sum + (item.totalSaleCaseCount ?? 0), 0),
  residentialZoneCaseCount: records.reduce((sum, item) => sum + (item.residentialZoneCaseCount ?? 0), 0),
  commercialZoneCaseCount: records.reduce((sum, item) => sum + (item.commercialZoneCaseCount ?? 0), 0),
  industrialZoneCaseCount: records.reduce((sum, item) => sum + (item.industrialZoneCaseCount ?? 0), 0),
  topDistrict: [...records].sort((a, b) => (b.totalSaleCaseCount ?? 0) - (a.totalSaleCaseCount ?? 0))[0]?.district,
});
await updateConversionReport({
  dataset: '臺北市實價登錄每季動態分析',
  file: file ?? 'data/raw/quarterly-market-analysis',
  status: file ? 'converted' : 'missing',
  notes: [`${records.length} district records`, `Quarter inferred from filename: ${rocYear + 1911}-Q${quarter}`],
}, warnings);
console.log(`quarterly records: ${records.length}`);

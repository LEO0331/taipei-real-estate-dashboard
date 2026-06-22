import { aggregatePopulationRows, listCsvFiles, readCsv, updateConversionReport, writeJson } from './data.ts';

const files = await listCsvFiles('data/raw/population-by-age');
const rows = (await Promise.all(files.map(readCsv))).flat();
const summaries = aggregatePopulationRows(rows);

await writeJson('public/data/population-district-summary.json', summaries);
await updateConversionReport({
  dataset: '臺北市各里人口數按年齡分',
  file: files.at(-1) ?? 'data/raw/population-by-age',
  status: files.length ? 'converted' : 'missing',
  notes: [`${summaries.length} district-month summaries`, 'District total rows (sex=計) avoid double-counting district, village, male, and female rows.'],
});
console.log(`population summaries: ${summaries.length}`);

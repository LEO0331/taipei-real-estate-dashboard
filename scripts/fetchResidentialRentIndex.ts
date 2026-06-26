import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { listCsvFiles, updateConversionReport } from './data.ts';

const force = process.argv.includes('--force');
const directory = 'data/raw/residential-rent-index';
await mkdir(directory, { recursive: true });

const existing = await listCsvFiles(directory);
if (existing.length && !force) {
  await updateConversionReport({
    dataset: '臺北市住宅租金指數',
    file: existing.at(-1)!,
    status: 'available',
    sourceUrl: 'https://data.taipei/dataset/detail?id=029c6d0d-c880-4de7-b2fb-9e56669a6f20',
    notes: ['Local CSV is available; use --force to refresh from Taipei Open Data.'],
  });
  console.log(`residential rent index local file: ${existing.at(-1)}`);
} else {
  const warnings: string[] = [];
  try {
    const response = await fetch('https://data.taipei/api/v1/dataset/029c6d0d-c880-4de7-b2fb-9e56669a6f20?scope=resourceAquire');
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const text = await response.text();
    const file = join(directory, `residential-rent-index-${new Date().toISOString().slice(0, 10)}.csv`);
    await writeFile(file, text);
    await updateConversionReport({
      dataset: '臺北市住宅租金指數',
      file,
      status: 'available',
      sourceUrl: response.url,
      downloadedAt: new Date().toISOString(),
      notes: ['Downloaded from Taipei Open Data API endpoint.'],
    });
    console.log(`residential rent index downloaded: ${file}`);
  } catch (error) {
    warnings.push(`Residential rent index download failed: ${error instanceof Error ? error.message : String(error)}`);
    await updateConversionReport({
      dataset: '臺北市住宅租金指數',
      file: existing.at(-1) ?? directory,
      status: existing.length ? 'available' : 'failed',
      sourceUrl: 'https://data.taipei/dataset/detail?id=029c6d0d-c880-4de7-b2fb-9e56669a6f20',
      notes: existing.length ? ['Download failed; existing local CSV remains available.'] : ['Download failed and no local CSV is available.'],
    }, warnings);
    console.log(warnings[0]);
  }
}

import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { updateConversionReport } from './data.ts';

const directory = 'data/raw/residential-price-monthly-index';
await mkdir(directory, { recursive: true });
const files = (await readdir(directory)).filter((file) => file.toLowerCase().endsWith('.csv'));
const force = process.argv.includes('--force');
const sourceUrl = process.env.RESIDENTIAL_PRICE_MONTHLY_INDEX_CSV_URL;
const warnings: string[] = [];

if ((!files.length || force) && sourceUrl) {
  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    await writeFile(join(directory, `住宅價格月指數-${new Date().toISOString().slice(0, 10)}.csv`), bytes);
  } catch (error) {
    warnings.push(`臺北市住宅價格月指數 download failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const nextFiles = (await readdir(directory)).filter((file) => file.toLowerCase().endsWith('.csv')).sort();
const latest = nextFiles.at(-1);
await updateConversionReport({
  dataset: '臺北市住宅價格月指數',
  file: latest ? join(directory, latest) : directory,
  status: latest ? 'available' : 'missing',
  sourceUrl: sourceUrl ?? 'https://data.taipei/dataset/detail?id=ce4ea2c6-6334-44f8-945a-5705492b187d',
  notes: [
    sourceUrl ? 'Downloaded from RESIDENTIAL_PRICE_MONTHLY_INDEX_CSV_URL when needed.' : 'Set RESIDENTIAL_PRICE_MONTHLY_INDEX_CSV_URL to download automatically; local CSV fallback is supported.',
    latest ? `${latest}: ${(await stat(join(directory, latest))).size} bytes` : 'No local CSV found.',
  ],
}, warnings);

console.log(`residential price monthly index files: ${nextFiles.length}`);

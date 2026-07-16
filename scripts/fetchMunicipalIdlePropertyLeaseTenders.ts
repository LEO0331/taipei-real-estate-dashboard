import { mkdir, writeFile } from 'node:fs/promises';
import { listCsvFiles, updateConversionReport } from './data.ts';

const directory = 'data/raw/municipal-idle-property-lease-tenders';
const target = `${directory}/source.csv`;
const sourceUrl = 'https://data.taipei/dataset/detail?id=be46d539-5a32-4d12-9022-76228006b0e8';
const url = 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=d912c17a-35a1-4382-a2aa-2862729fcacf';

await mkdir(directory, { recursive: true });
const existing = await listCsvFiles(directory);
const force = process.argv.includes('--force');

if (existing.length && !force) {
  await updateConversionReport({ dataset: '臺北市市有閒置房地出租招標結果', file: existing.at(-1)!, status: 'available', sourceUrl, notes: ['Using local raw CSV; pass --force to refresh from Taipei Open Data.'] });
  console.log(`municipal idle-property lease tenders local file: ${existing.at(-1)}`);
} else {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    await writeFile(target, Buffer.from(await response.arrayBuffer()));
    await updateConversionReport({ dataset: '臺北市市有閒置房地出租招標結果', file: target, status: 'available', sourceUrl, downloadedAt: new Date().toISOString(), notes: ['Official CSV staged for static conversion.'] });
    console.log(`municipal idle-property lease tenders CSV: ${target}`);
  } catch (error) {
    const warning = `municipal idle-property lease tenders download failed: ${error instanceof Error ? error.message : String(error)}`;
    await updateConversionReport({ dataset: '臺北市市有閒置房地出租招標結果', file: existing.at(-1) ?? directory, status: existing.length ? 'available' : 'failed', sourceUrl, notes: existing.length ? ['Download failed; continuing with the local CSV.'] : ['Download failed and no local CSV is available.'] }, [warning]);
    console.warn(warning);
  }
}

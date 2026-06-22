import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { listCsvFiles, updateConversionReport } from './data.ts';

const datasets = [
  {
    dataset: '臺北市實價周報',
    directory: 'data/raw/real-price-weekly',
    filename: 'RPWeekData-latest.csv',
    sourceUrl: 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=2979c431-7a32-4067-9af2-e716cd825c4b',
  },
  {
    dataset: '臺北市實價登錄每季動態分析',
    directory: 'data/raw/quarterly-market-analysis',
    filename: '臺北市114年第2季實價登錄動態分析-latest.csv',
    sourceUrl: 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=7465b5ab-58c7-45b9-b7e6-ed87e75892a9',
  },
  {
    dataset: '臺北市各里人口數按年齡分',
    directory: 'data/raw/population-by-age',
    filename: '112迄今各里人口數按年齡分-latest.csv',
    sourceUrl: 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=c8f5b53d-ef3d-4321-ae8e-58cd2a5ee73c',
  },
] as const;

const force = process.argv.includes('--force');

for (const { dataset, directory, filename, sourceUrl } of datasets) {
  let files = await listCsvFiles(directory);
  let downloadedAt: string | undefined;
  if (force || !files.length) {
    try {
      const response = await fetch(sourceUrl);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      await mkdir(directory, { recursive: true });
      const path = join(directory, filename);
      await writeFile(path, Buffer.from(await response.arrayBuffer()));
      files = await listCsvFiles(directory);
      downloadedAt = new Date().toISOString();
    } catch (error) {
      await updateConversionReport({
        dataset,
        file: files.at(-1) ?? directory,
        status: files.length ? 'available' : 'failed',
        sourceUrl,
        notes: [`Download failed: ${error instanceof Error ? error.message : String(error)}`, files.length ? 'Continuing with local CSV.' : 'No local fallback is available.'],
      });
      console.warn(`${dataset}: download failed; ${files.length ? 'using local file' : 'no fallback'}`);
      continue;
    }
  }
  await updateConversionReport({
    dataset,
    file: files.at(-1) ?? directory,
    status: files.length ? 'available' : 'missing',
    sourceUrl,
    downloadedAt,
    notes: downloadedAt
      ? [`Downloaded ${basename(files.at(-1)!)}`]
      : ['Using local raw CSV; pass --force to replace it with the latest official resource.'],
  });
  console.log(`${dataset}: ${files.length ? `${files.length} local file(s)` : 'missing'}`);
}

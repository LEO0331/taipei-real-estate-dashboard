import { mkdir, writeFile } from 'node:fs/promises';
import { listCsvFiles } from './data.ts';
const directory = 'data/raw/public-works-excellence-award-projects';
await mkdir(directory, { recursive: true });
const existing = await listCsvFiles(directory);
if (existing.length && !process.argv.includes('--force')) console.log(`public works awards local file: ${existing.at(-1)}`);
else { const response = await fetch('https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=cf8053d8-59e9-4430-b05b-0292c6c32ee5', { signal: AbortSignal.timeout(30_000) }); if (!response.ok) throw new Error(`HTTP ${response.status}`); await writeFile(`${directory}/source.csv`, Buffer.from(await response.arrayBuffer())); }

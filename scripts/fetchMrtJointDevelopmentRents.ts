import { mkdir, writeFile } from 'node:fs/promises';
import { listCsvFiles } from './data.ts';

const directory = 'data/raw/mrt-joint-development-rents';
const sourceUrl = 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=664a256d-4ea1-41bc-8be6-acd53d9864a0';

await mkdir(directory, { recursive: true });
const existing = await listCsvFiles(directory);

if (existing.length && !process.argv.includes('--force')) {
  console.log(`MRT joint-development rents local file: ${existing.at(-1)}`);
} else {
  const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`MRT joint-development rents download failed: HTTP ${response.status}`);
  await writeFile(`${directory}/source.csv`, Buffer.from(await response.arrayBuffer()));
  console.log('Downloaded MRT joint-development rents source.csv');
}

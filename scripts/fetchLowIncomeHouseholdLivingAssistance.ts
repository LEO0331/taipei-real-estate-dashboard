import { mkdir, writeFile } from 'node:fs/promises';
import { listCsvFiles } from './data.ts';

const directory = 'data/raw/low-income-household-living-assistance';
const url = 'https://data.taipei/api/dataset/63922471-d357-49d5-a1ba-216361b75637/resource/f781347b-9b4b-4e39-94ed-6e2bebaca35a/download';

export async function fetchLowIncomeHouseholdLivingAssistance() {
  await mkdir(directory, { recursive: true });
  if ((await listCsvFiles(directory)).length && !process.argv.includes('--force')) return;
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Low-income living assistance download failed: HTTP ${response.status}`);
  await writeFile(`${directory}/source.csv`, Buffer.from(await response.arrayBuffer()));
}

if (process.argv[1]?.endsWith('fetchLowIncomeHouseholdLivingAssistance.ts')) await fetchLowIncomeHouseholdLivingAssistance();

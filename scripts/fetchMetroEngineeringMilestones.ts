import { mkdir, writeFile } from 'node:fs/promises';

const directory = 'data/raw/metro-engineering-milestones';
const resources = [
  { year: 2024, id: 'fe6f0e9a-af9c-4240-885b-9255f1cbc6cd' },
  { year: 2025, id: '2c899636-f360-4b42-bee3-2f0cf51eb0a3' },
];

await mkdir(directory, { recursive: true });
for (const resource of resources) {
  const response = await fetch(`https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=${resource.id}`, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Unable to download ${resource.year} metro milestones: HTTP ${response.status}`);
  await writeFile(`${directory}/${resource.year}.csv`, Buffer.from(await response.arrayBuffer()));
}

import { mkdir, writeFile } from 'node:fs/promises';

const directory = 'data/raw/municipal-public-land-inventory';
await mkdir(directory, { recursive: true });
const response = await fetch('https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=58cba634-89e6-4640-8060-8b8b7e67d6bb');
if (!response.ok) throw new Error(`Download failed: ${response.status}`);
await writeFile(`${directory}/source.csv`, Buffer.from(await response.arrayBuffer()));

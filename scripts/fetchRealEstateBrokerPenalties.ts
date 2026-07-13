import { mkdir, writeFile } from 'node:fs/promises';
import { updateConversionReport } from './data.ts';

const directory = 'data/raw/real-estate-broker-penalties';
const url = 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=fc6c6a47-8b43-4301-a67b-6f31a788bc83';
const target = `${directory}/source.csv`;
await mkdir(directory, { recursive: true });
const response = await fetch(url);
if (!response.ok) throw new Error(`Download failed: ${response.status}`);
await writeFile(target, Buffer.from(await response.arrayBuffer()));
await updateConversionReport({ dataset: '臺北市違反不動產經紀業管理條例裁罰名單', file: target, status: 'available', sourceUrl: 'https://data.taipei/dataset/detail?id=f1f30ba1-f081-47f3-b7a6-e38721f5600c', downloadedAt: new Date().toISOString(), notes: ['Official CSV downloaded for conversion. A manually placed CSV in this directory is also supported.'] });
console.log(`real-estate broker penalties CSV: ${target}`);

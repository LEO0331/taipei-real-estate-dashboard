import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { updateConversionReport } from './data.ts';

const dataset = '臺北市動產質借處營業概況';
const sourceUrl = 'https://data.taipei/dataset/detail?id=da9ed005-8f06-446a-b61a-d46e7d8d6ac9';
const baseUrl = 'https://data.taipei';
const directory = 'data/raw/movable-property-pledge-business-statistics';
const resources = [
  ['112', 'ae42ed5b-5b10-48e4-9fc5-aa0d978fda28'],
  ['111', '517209e8-932a-4b41-b724-21939fffa675'],
  ['110', '9836320c-9ae4-4f20-9e14-b66817efa9a5'],
  ['109', '13400657-2c5b-4c09-9a8c-b531b0004868'],
  ['108', 'd594c3b2-01d9-4373-b7ce-530bbe6c0b8a'],
  ['107', '5e1f2881-6325-4251-839f-e91e50a98a84'],
  ['106', '1652e982-ed8b-488e-9a9e-86c33f0ae4d2'],
  ['105', '33a81b92-abb9-4108-8c99-ca4209d6e116'],
  ['104', '2cb33f40-6bbb-4e53-b8df-810c9941ef0e'],
  ['103', '762a9369-51d5-4713-b5b8-fb163d6d1722'],
  ['102', '3a4e835c-2834-40c0-b033-2471c4ef570b'],
  ['101', '4248b655-632a-4a07-b904-8f399ad6e692'],
] as const;

await mkdir(directory, { recursive: true });
const force = process.argv.includes('--force');
const warnings: string[] = [];

for (const [rocYear, rid] of resources) {
  const name = `臺北市動產質借處營業概況-${rocYear}年度.csv`;
  const file = join(directory, name);
  const exists = await stat(file).then(() => true).catch(() => false);
  if (exists && !force) continue;
  try {
    const url = `${baseUrl}/api/dataset/da9ed005-8f06-446a-b61a-d46e7d8d6ac9/resource/${rid}/download`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    await writeFile(file, new Uint8Array(await response.arrayBuffer()));
  } catch (error) {
    warnings.push(`${name} download failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const files = (await readdir(directory)).filter((file) => file.toLowerCase().endsWith('.csv')).sort();
const bytes = await Promise.all(files.map((file) => stat(join(directory, file)).then((item) => item.size)));
await updateConversionReport({
  dataset,
  file: directory,
  status: files.length ? 'available' : 'missing',
  sourceUrl,
  downloadedAt: new Date().toISOString(),
  notes: [`${files.length} local annual CSV file(s)`, `${bytes.reduce((sum, item) => sum + item, 0)} bytes`, 'Official resources are Big5 CSV files; conversion has Big5 fallback.'],
}, warnings);

console.log(`movable-property pledge CSV files: ${files.length}`);

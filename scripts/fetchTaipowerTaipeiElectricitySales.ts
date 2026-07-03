import { copyFile, mkdir, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { updateConversionReport } from './data.ts';

const sourcePath = '/Users/Leo/Downloads/A05035701_21063128531.csv';
const outputDirectory = 'data/raw/taipower-taipei-electricity-sales';
const sourceUrl = 'https://data.taipei/dataset/detail?id=9bfb5424-1996-461a-b19b-f75101e2f459';

export async function fetchTaipowerTaipeiElectricitySales() {
  const warnings: string[] = [];
  const outputPath = join(outputDirectory, basename(sourcePath));
  let status: 'available' | 'missing' = 'missing';
  try {
    await mkdir(outputDirectory, { recursive: true });
    await copyFile(sourcePath, outputPath);
    status = 'available';
  } catch (error) {
    warnings.push(`Unable to copy Taipower Taipei electricity CSV from ${sourcePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  await updateConversionReport({
    dataset: '台灣電力公司臺北市售電量',
    file: status === 'available' ? outputPath : sourcePath,
    sourceUrl,
    downloadedAt: new Date().toISOString(),
    status,
    notes: ['Source sample copied from the uploaded UTF-8-SIG CSV for local conversion.'],
  }, warnings);
  return { outputPath, bytes: await stat(outputPath).then((value) => value.size).catch(() => undefined), status };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await fetchTaipowerTaipeiElectricitySales();
  console.log(`Taipower Taipei electricity source ${result.status}: ${result.outputPath}`);
}

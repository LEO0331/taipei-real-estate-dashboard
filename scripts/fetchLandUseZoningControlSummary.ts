import { copyFile, mkdir, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { updateConversionReport } from './data.ts';

const sourcePath = '/Users/Leo/Downloads/1150409-土地使用容積建蔽彙整表.csv';
const outputDirectory = 'data/raw/land-use-zoning-control-summary';
const sourceUrl = 'https://data.taipei/dataset/detail?id=d61ca24b-7b2b-4e75-8004-c568902e6300';

export async function fetchLandUseZoningControlSummary() {
  const warnings: string[] = [];
  const outputPath = join(outputDirectory, basename(sourcePath));
  let status: 'available' | 'missing' = 'missing';
  try {
    await mkdir(outputDirectory, { recursive: true });
    await copyFile(sourcePath, outputPath);
    status = 'available';
  } catch (error) {
    warnings.push(`Unable to copy land-use zoning CSV from ${sourcePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  await updateConversionReport({ dataset: '臺北市土地使用內容與使用管制彙整表', file: status === 'available' ? outputPath : sourcePath, sourceUrl, downloadedAt: new Date().toISOString(), status, notes: ['Source sample copied from the uploaded UTF-8-SIG CSV for local conversion.'] }, warnings);
  return { outputPath, bytes: await stat(outputPath).then((value) => value.size).catch(() => undefined), status };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await fetchLandUseZoningControlSummary();
  console.log(`Land-use zoning source ${result.status}: ${result.outputPath}`);
}

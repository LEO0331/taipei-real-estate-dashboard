import { copyFile, mkdir, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { updateConversionReport } from './data.ts';

const sourcePath = '/Users/Leo/Downloads/臺北市稅捐稽徵處歷年(70年起)地價稅累進起點地價及課稅級距表70-114年.csv';
const outputDirectory = 'data/raw/land-value-tax-progressive-brackets';
const sourceUrl = 'https://data.taipei/dataset/detail?id=60e5f439-0cc0-4163-a91e-98241b6846c3';

export async function fetchLandValueTaxProgressiveBrackets() {
  const warnings: string[] = [];
  const outputPath = join(outputDirectory, basename(sourcePath));
  let status: 'available' | 'missing' = 'missing';
  try {
    await mkdir(outputDirectory, { recursive: true });
    await copyFile(sourcePath, outputPath);
    status = 'available';
  } catch (error) {
    warnings.push(`Unable to copy land value tax bracket CSV from ${sourcePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  await updateConversionReport({
    dataset: '臺北市稅捐稽徵處歷年(70年起)地價稅累進起點地價及課稅級距表',
    file: status === 'available' ? outputPath : sourcePath,
    sourceUrl,
    downloadedAt: new Date().toISOString(),
    status,
    notes: ['Source sample copied from the uploaded UTF-8-SIG CSV for local conversion.'],
  }, warnings);
  return { outputPath, bytes: await stat(outputPath).then((value) => value.size).catch(() => undefined), status };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await fetchLandValueTaxProgressiveBrackets();
  console.log(`Land value tax bracket source ${result.status}: ${result.outputPath}`);
}

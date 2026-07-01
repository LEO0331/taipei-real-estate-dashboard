import { copyFile, mkdir, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { updateConversionReport } from './data.ts';

const sourcePath = '/Users/Leo/Downloads/pi00101yac.csv';
const outputDirectory = 'data/raw/consumer-price-basic-annual-index';
const sourceUrl = 'https://data.taipei/dataset/detail?id=7ee57050-4d27-482c-bae5-ebd15ca86702';

export async function fetchConsumerPriceBasicAnnualIndex() {
  const warnings: string[] = [];
  const outputPath = join(outputDirectory, basename(sourcePath));
  let status: 'available' | 'missing' = 'missing';
  try {
    await mkdir(outputDirectory, { recursive: true });
    await copyFile(sourcePath, outputPath);
    status = 'available';
  } catch (error) {
    warnings.push(`Unable to copy annual CPI CSV from ${sourcePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  await updateConversionReport({
    dataset: '臺北市消費者物價指數基本分類年指數',
    file: status === 'available' ? outputPath : sourcePath,
    sourceUrl,
    downloadedAt: new Date().toISOString(),
    status,
    notes: ['Source sample copied from the uploaded Big5/CP950 CSV for local conversion.'],
  }, warnings);
  return { outputPath, bytes: await stat(outputPath).then((value) => value.size).catch(() => undefined), status };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await fetchConsumerPriceBasicAnnualIndex();
  console.log(`annual CPI source ${result.status}: ${result.outputPath}`);
}

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { retainedSources, stageRetainedSource } from './retainedSource.ts';

export async function fetchConsumerPriceBasicAnnualIndex(options: { root?: string } = {}) {
  return stageRetainedSource(retainedSources[0], { root: options.root, importPath: process.env.CPI_ANNUAL_SOURCE_FILE });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await fetchConsumerPriceBasicAnnualIndex();
  console.log(`Annual CPI source ${result.mode}: ${result.outputPath}`);
}

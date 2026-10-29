import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { retainedSources, stageRetainedSource } from './retainedSource.ts';

export async function fetchLandValueTaxProgressiveBrackets(options: { root?: string } = {}) {
  return stageRetainedSource(retainedSources[2], { root: options.root, importPath: process.env.LAND_VALUE_TAX_SOURCE_FILE });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await fetchLandValueTaxProgressiveBrackets();
  console.log(`Land value tax source ${result.mode}: ${result.outputPath}`);
}

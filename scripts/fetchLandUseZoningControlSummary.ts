import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { retainedSources, stageRetainedSource } from './retainedSource.ts';

export async function fetchLandUseZoningControlSummary(options: { root?: string } = {}) {
  return stageRetainedSource(retainedSources[3], { root: options.root, importPath: process.env.LAND_USE_ZONING_SOURCE_FILE });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await fetchLandUseZoningControlSummary();
  console.log(`Land-use zoning source ${result.mode}: ${result.outputPath}`);
}

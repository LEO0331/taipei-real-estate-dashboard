import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { retainedSources, stageRetainedSource } from './retainedSource.ts';

export async function fetchTaipowerTaipeiElectricitySales(options: { root?: string } = {}) {
  return stageRetainedSource(retainedSources[1], { root: options.root, importPath: process.env.TAIPEI_ELECTRICITY_SOURCE_FILE });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await fetchTaipowerTaipeiElectricitySales();
  console.log(`Taipei electricity source ${result.mode}: ${result.outputPath}`);
}

import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { readCsv, updateConversionReport } from './data.ts';

export const retainedSources = [
  { dataset: '臺北市消費者物價指數基本分類年指數', path: 'data/raw/consumer-price-basic-annual-index/pi00101yac.csv', sourceUrl: 'https://data.taipei/dataset/detail?id=7ee57050-4d27-482c-bae5-ebd15ca86702', environment: 'CPI_ANNUAL_SOURCE_FILE', warningPrefix: 'Unable to copy annual CPI CSV from ', requiredHeaders: ["年別","基本分類","原始值[統計數值]"] },
  { dataset: '台灣電力公司臺北市售電量', path: 'data/raw/taipower-taipei-electricity-sales/A05035701_21063128531.csv', sourceUrl: 'https://data.taipei/dataset/detail?id=9bfb5424-1996-461a-b19b-f75101e2f459', environment: 'TAIPEI_ELECTRICITY_SOURCE_FILE', warningPrefix: 'Unable to copy Taipower Taipei electricity CSV from ', requiredHeaders: ["統計期","總用戶數[戶]","總用電量[千度]"] },
  { dataset: '臺北市稅捐稽徵處歷年(70年起)地價稅累進起點地價及課稅級距表', path: 'data/raw/land-value-tax-progressive-brackets/臺北市稅捐稽徵處歷年(70年起)地價稅累進起點地價及課稅級距表70-114年.csv', sourceUrl: 'https://data.taipei/dataset/detail?id=60e5f439-0cc0-4163-a91e-98241b6846c3', environment: 'LAND_VALUE_TAX_SOURCE_FILE', warningPrefix: 'Unable to copy land value tax bracket CSV from ', requiredHeaders: ["年度","一般土地地價稅計算公式"] },
  { dataset: '臺北市土地使用內容與使用管制彙整表', path: 'data/raw/land-use-zoning-control-summary/1150409-土地使用容積建蔽彙整表.csv', sourceUrl: 'https://data.taipei/dataset/detail?id=d61ca24b-7b2b-4e75-8004-c568902e6300', environment: 'LAND_USE_ZONING_SOURCE_FILE', warningPrefix: 'Unable to copy land-use zoning CSV from ', requiredHeaders: ["行政區","分區","筆數","面積/平方公尺"] },
] as const;

export async function verifyLocalCsv(path: string, requiredHeaders: readonly string[] = []) {
  const info = await stat(path);
  if (!info.isFile() || info.size === 0 || info.size > 10_000_000) throw new Error(`Invalid retained CSV size: ${path}`);
  const rows = await readCsv(path);
  if (!rows.length || Object.keys(rows[0]).length < 2) throw new Error(`Retained CSV requires a header and data rows: ${path}`);
  if (requiredHeaders.some(header => !Object.hasOwn(rows[0], header))) throw new Error(`Unexpected retained CSV schema: ${path}`);
  return { bytes: info.size, sha256: createHash('sha256').update(await readFile(path)).digest('hex') };
}

/** A retained upload is not a fresh download. A new local file must be explicitly selected. */
export async function stageRetainedSource(source: typeof retainedSources[number], options: { root?: string; importPath?: string } = {}) {
  const root = options.root ?? process.cwd();
  const target = resolve(root, source.path);
  const selected = options.importPath ? resolve(root, options.importPath) : target;
  // Validate first; an invalid import must not replace a last-known-good retained file.
  const evidence = await verifyLocalCsv(selected, source.requiredHeaders);
  if (selected !== target) {
    await mkdir(dirname(target), { recursive: true });
    await copyFile(selected, target);
  }
  const mode = options.importPath ? 'configured-local-import' : 'retained-static-input';
  await updateConversionReport({
    dataset: source.dataset, file: target, sourceUrl: source.sourceUrl, status: 'available',
    downloadedAt: undefined,
    notes: [
      `Input mode: ${mode}; SHA-256 ${evidence.sha256}.`,
      'Validated local CSV; no live source acquisition was performed.',
      'Source publication and retrieval dates are unknown. Local verification is not an update to source freshness.',
    ],
  }, [], { reportPath: resolve(root, 'public/data/conversion-report.json'), resolvedWarningPrefixes: [source.warningPrefix] });
  return { outputPath: source.path, ...evidence, status: 'available' as const, mode };
}

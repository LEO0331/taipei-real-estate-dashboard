import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { retainedSources, verifyLocalCsv } from './retainedSource.ts';

const sha256 = (value: Buffer) => createHash('sha256').update(value).digest('hex');
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));

/** Read the live application's literal loader targets instead of maintaining a second catalogue. */
export function requiredJsonPaths(source: string): string[] {
  const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const paths = new Set(['conversion-report.json', 'urban-renewal-decision/snapshot.json']);
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'loadJson' && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) paths.add(node.arguments[0].text);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return [...paths].sort();
}

export function validateConversionReport(value: unknown) {
  if (!object(value) || !date(value.generatedAt) || !Array.isArray(value.sources) || !value.sources.length || !Array.isArray(value.warnings)) throw new Error('Invalid conversion-report schema');
  for (const source of value.sources) {
    if (!object(source) || typeof source.dataset !== 'string' || !source.dataset || typeof source.file !== 'string' || !source.file || !['converted', 'available'].includes(String(source.status))) throw new Error('Conversion source is missing, failed or malformed');
    if (source.sourceUrl !== undefined) {
      let url: URL;
      try { url = new URL(String(source.sourceUrl)); } catch { throw new Error('Invalid source URL'); }
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid source URL');
    }
  }
  for (const warning of value.warnings) {
    if (typeof warning !== 'string' || !warning.trim()) throw new Error('Invalid conversion warning schema');
    if (retainedSources.some(source => warning.startsWith(source.warningPrefix))) throw new Error('Unresolved legacy local-source copy failure; run the retained-source fetchers before publishing');
  }
  // Unknown quality warnings are disclosed verbatim, not silently classified as resolved.
  return { generatedAt: value.generatedAt as string, sources: value.sources, warnings: value.warnings as string[] };
}

function safeDataPath(name: string) {
  if (!name || isAbsolute(name) || name.includes('\\') || name.split('/').some(part => part === '..' || part === '' || part === '.')) throw new Error(`Unsafe data reference: ${name}`);
  return name;
}

export async function buildReleaseManifest(options: { root?: string; dataDirectory?: string; codeSha: string }) {
  const root = resolve(options.root ?? process.cwd());
  if (!/^[a-f0-9]{40}$/i.test(options.codeSha)) throw new Error('Release code SHA must be an exact 40-character commit');
  const dataRoot = resolve(options.dataDirectory ?? join(root, 'public/data'));
  const files: string[] = [];
  async function visit(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if ((await lstat(path)).isSymbolicLink()) throw new Error('Release data must not contain symbolic links');
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && entry.name.endsWith('.json')) files.push(relative(dataRoot, path).split(sep).join('/'));
      if (files.length > 2_000) throw new Error('Release data file limit exceeded');
    }
  }
  await visit(dataRoot);
  const values = new Map<string, unknown>();
  const dataFiles: Array<{ path: string; bytes: number; sha256: string }> = [];
  let totalBytes = 0;
  for (const path of files.sort()) {
    const content = await readFile(join(dataRoot, path));
    totalBytes += content.length;
    if (content.length > 20_000_000 || totalBytes > 200_000_000) throw new Error('Release data byte limit exceeded');
    try { values.set(path, JSON.parse(content.toString('utf8'))); } catch { throw new Error(`Malformed JSON: ${path}`); }
    dataFiles.push({ path, bytes: content.length, sha256: sha256(content) });
  }
  const required = requiredJsonPaths(await readFile(join(root, 'src/App.tsx'), 'utf8'));
  for (const path of required) if (!values.has(safeDataPath(path))) throw new Error(`Missing application data: ${path}`);
  const conversion = validateConversionReport(values.get('conversion-report.json'));
  const snapshot = values.get('urban-renewal-decision/snapshot.json');
  if (!object(snapshot) || typeof snapshot.snapshotId !== 'string' || !snapshot.snapshotId || !date(snapshot.analysisAsOf) || !date(snapshot.generatedAt) || !object(snapshot.renewalUnits)) throw new Error('Invalid Urban Renewal snapshot identity');
  if (values.has('building-use-permits/manifest.json')) {
    const permits = values.get('building-use-permits/manifest.json');
    if (!object(permits) || !Array.isArray(permits.chunks)) throw new Error('Invalid permit manifest');
    for (const chunk of permits.chunks) {
      if (!object(chunk) || typeof chunk.path !== 'string' || !Number.isSafeInteger(chunk.recordCount) || Number(chunk.recordCount) < 0) throw new Error('Invalid permit chunk reference');
      const key = `building-use-permits/${safeDataPath(chunk.path)}`;
      const records = values.get(key);
      if (!Array.isArray(records) || records.length !== chunk.recordCount) throw new Error(`Missing or inconsistent permit chunk: ${key}`);
    }
  }
  const retainedInputs = [];
  for (const source of retainedSources) retainedInputs.push({
    path: source.path, sourceUrl: source.sourceUrl, ...(await verifyLocalCsv(join(root, source.path), source.requiredHeaders)),
    mode: process.env[source.environment] ? 'configured-local-import' : 'retained-static-input',
    publicationDate: null, retrievalDate: null,
  });
  return {
    schemaVersion: 1, codeSha: options.codeSha.toLowerCase(), dataFiles,
    conversion, snapshot: { id: snapshot.snapshotId, analysisAsOf: snapshot.analysisAsOf, generatedAt: snapshot.generatedAt, sha256: dataFiles.find(file => file.path === 'urban-renewal-decision/snapshot.json')!.sha256 },
    retainedInputs,
    freshnessScope: 'Hashes identify the published data edition. Processing, local import and verification times do not establish current authority publication, retrieval or real-world status. Unknown source dates remain null; inspect each dataset coverage and conversion warning.',
  };
}

export async function writeReleaseManifest(options: { root?: string; dataDirectory?: string; codeSha: string }) {
  const manifest = await buildReleaseManifest(options);
  const output = resolve(options.root ?? process.cwd(), 'public/release-manifest.json');
  await mkdir(dirname(output), { recursive: true });
  await writeFile(`${output}.tmp`, `${JSON.stringify(manifest, null, 2)}\n`);
  await rename(`${output}.tmp`, output);
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const directoryArgument = process.argv.indexOf('--data-dir');
  if (directoryArgument >= 0 && (!process.argv[directoryArgument + 1] || process.argv[directoryArgument + 1].startsWith('--'))) throw new Error('--data-dir requires a directory');
  const dataDirectory = directoryArgument >= 0 ? process.argv[directoryArgument + 1] : process.env.RELEASE_DATA_DIR;
  const codeSha = process.env.GITHUB_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const manifest = await writeReleaseManifest({ codeSha, dataDirectory });
  console.log(`Release ${manifest.codeSha}: ${manifest.dataFiles.length} JSON files, ${manifest.conversion.warnings.length} disclosed warnings, ${manifest.snapshot.id}.`);
}

import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const supplement = {
  package: 'victory-vendor', version: '37.3.6',
  path: 'licenses/victory-vendor-37.3.6-LICENSE.txt',
  url: 'https://raw.githubusercontent.com/FormidableLabs/victory/v37.3.6/LICENSE.txt',
  sha256: '34dee5fd5e5cc756efb5ad4d64652bce719bdf5e900ca5d7538253e737930bc4',
};

export async function buildThirdPartyNotices(root = '.') {
  const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
  const sections = ['Software licenses and attribution',
    'Factual inventory of the installed locked production dependency graph, including transitive type packages and packaged vendored notices. License metadata is reported verbatim; complete available license/notice texts follow.',
    'PROJECT LICENSE\n' + (await readFile(join(root, 'LICENSE'), 'utf8')).replace(/\r\n/g, '\n')];
  const explorer = await readFile(join(root, 'src/CivicExplorer.tsx'), 'utf8');
  const copied = [...explorer.matchAll(/\/\*([\s\S]*?)\*\//g)].find(match => match[1].includes('Copyright (c) 2026 LeoChen.'))?.[1];
  if (!copied?.includes('Permission is hereby granted')) throw new Error('Copied Explorer attribution is missing');
  sections.push('COPIED EXPLORER GEOMETRY - src/CivicExplorer.tsx\n' + copied.replace(/\r\n/g, '\n').replace(/^ \* ?/gm, '').trim());
  const inventory = [];
  for (const path of Object.keys(lock.packages).filter(path => path && !lock.packages[path].dev).sort()) {
    const installed = JSON.parse(await readFile(join(root, path, 'package.json'), 'utf8'));
    if (installed.version !== lock.packages[path].version) throw new Error(`Installed version differs from lock: ${path}`);
    const files = [];
    async function visit(relative = '') {
      for (const entry of await readdir(join(root, path, relative), { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const file = relative ? `${relative}/${entry.name}` : entry.name;
        if (entry.isDirectory()) await visit(file);
        else if (entry.isFile() && /^(?:licen[cs]e|copying|notice)(?:[._-].*)?$/i.test(entry.name)) files.push(file);
      }
    }
    await visit();
    const licenses = [];
    for (const file of files.sort()) {
      const bytes = await readFile(join(root, path, file));
      licenses.push({ source: `${path}/${file}`, sha256: digest(bytes), text: bytes.toString('utf8') });
    }
    if (installed.name === supplement.package) {
      if (installed.version !== supplement.version) throw new Error('Review the version-pinned victory-vendor supplemental license');
      const bytes = await readFile(join(root, supplement.path));
      if (digest(bytes) !== supplement.sha256) throw new Error('Supplemental license hash changed');
      licenses.push({ source: `${supplement.path} (publisher version-pinned supplement; installed wrapper omits its root license)`, url: supplement.url, sha256: digest(bytes), text: bytes.toString('utf8') });
    }
    if (!licenses.length || licenses.some(file => !file.text.trim())) throw new Error(`No complete license text found: ${path}`);
    const entry = { name: installed.name, version: installed.version, path, license: installed.license ?? lock.packages[path].license ?? 'Not stated', licenses };
    inventory.push(entry);
    for (const file of licenses) sections.push(`${'='.repeat(78)}\n${entry.name}@${entry.version}\nInstalled path: ${path}\nPackage license metadata: ${JSON.stringify(entry.license)}\nSource: ${file.source}${file.url ? `\nPublisher source: ${file.url}` : ''}\nSource SHA256: ${file.sha256}\n${'-'.repeat(78)}\n${file.text}`);
  }
  // Plain-text static hosts do not always declare a charset; retain publisher
  // Unicode correctly when the artifact is opened directly in a browser.
  return { text: '\uFEFF' + sections.join('\n\n') + '\n', inventory };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { text, inventory } = await buildThirdPartyNotices();
  await writeFile('public/THIRD_PARTY_NOTICES.txt', text);
  console.log(`Prepared full notices for ${inventory.length} locked production-graph packages and ${inventory.reduce((n, item) => n + item.licenses.length, 0)} license/notice texts, plus project/copied attribution.`);
}

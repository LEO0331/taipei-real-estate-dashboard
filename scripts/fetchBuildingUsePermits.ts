import { access, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const rawDir = join(process.cwd(), 'data/raw/building-use-permits');

async function listXmlFiles(directory: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await listXmlFiles(path));
    else if (entry.name.toLowerCase().endsWith('.xml')) found.push(path);
  }
  return found.sort();
}

const files = await listXmlFiles(rawDir);
if (!files.length) {
  throw new Error(`Place official XML files under ${rawDir}; this project does not download raw XML during frontend builds.`);
}

let totalBytes = 0;
for (const file of files) {
  await access(file);
  totalBytes += (await stat(file)).size;
}

console.log(`Using ${files.length} local building-use-permit XML file(s) (${totalBytes.toLocaleString()} bytes) under ${rawDir}`);

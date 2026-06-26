import { access, stat } from 'node:fs/promises';
import { join } from 'node:path';

const file = join(process.cwd(), 'data/raw/building-use-permits/Taipei02_90年至114年.xml');
try {
  await access(file);
  console.log(`Using local building-use-permit XML (${(await stat(file)).size.toLocaleString()} bytes): ${file}`);
} catch {
  throw new Error(`Place the official XML at ${file}; this project does not download raw XML during frontend builds.`);
}

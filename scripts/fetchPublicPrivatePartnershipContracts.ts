import { mkdir, writeFile } from 'node:fs/promises';
import { updateConversionReport } from './data.ts';
const directory='data/raw/public-private-partnership-contracts'; const target=`${directory}/source.csv`; const sourceUrl='https://data.taipei/dataset/detail?id=55e72e92-61ae-49e4-81f3-a6c17a07f51d';
await mkdir(directory,{recursive:true}); const response=await fetch('https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=68c87c9c-4dc0-4e3c-88e0-81e524f221e1'); if(!response.ok) throw new Error(`Download failed: ${response.status}`); await writeFile(target,Buffer.from(await response.arrayBuffer())); await updateConversionReport({dataset:'臺北市政府財政局促參案件簽約概況',file:target,status:'available',sourceUrl,downloadedAt:new Date().toISOString()});

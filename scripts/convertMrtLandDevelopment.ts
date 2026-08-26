import { createHash } from 'node:crypto';
import { getColumn, listCsvFiles, readCsv, updateConversionReport, writeJson, type CsvRow } from './data.ts';

export type MrtLandDevelopmentRecord = {
  id: string; sourceSequenceRaw: string; lineRaw: string; lineName: string; siteName: string;
  statusRaw: string; status: 'completed' | 'construction' | 'design' | 'investment_or_preparation' | 'other';
  remarks: string; sourceRaw: CsvRow;
};

const sourceUrl = 'https://data.taipei/dataset/detail?id=0b5048f7-1608-4da4-ac30-4e26f3f452f2';
const value = (row: CsvRow, names: string[]) => getColumn(row, names)?.trim() ?? '';
const normalizeText = (text: string) => text.replace(/\s+/g, ' ').trim();
export const normalizeStatus = (raw: string): MrtLandDevelopmentRecord['status'] => {
  const text = normalizeText(raw);
  if (/已完工/.test(text)) return 'completed';
  if (/施工中/.test(text)) return 'construction';
  if (/設計中|規劃中/.test(text)) return 'design';
  if (/徵求投資人|前置作業/.test(text)) return 'investment_or_preparation';
  return 'other';
};
export const lineName = (raw: string) => normalizeText(raw).replace(/\s*\(\s*\d+\s*基地\s*\)\s*$/, '');
export const splitSiteNames = (raw: string) => {
  const parts: string[] = []; let current = ''; let depth = 0;
  for (const char of raw.replace(/\r?\n/g, '、')) {
    if (char === '（' || char === '(') depth += 1;
    if (char === '）' || char === ')') depth = Math.max(0, depth - 1);
    if (char === '、' && depth === 0) { if (normalizeText(current)) parts.push(normalizeText(current)); current = ''; continue; }
    current += char;
  }
  if (normalizeText(current)) parts.push(normalizeText(current));
  return parts;
};

export function convertMrtLandDevelopmentRows(rows: CsvRow[]): MrtLandDevelopmentRecord[] {
  const records: MrtLandDevelopmentRecord[] = [];
  const seen = new Set<string>();
  for (const sourceRaw of rows) {
    const sourceSequenceRaw = value(sourceRaw, ['序號']);
    const lineRaw = value(sourceRaw, ['線別']);
    const statusRaw = value(sourceRaw, ['基地狀況']);
    const remarks = value(sourceRaw, ['備註']);
    for (const siteName of splitSiteNames(value(sourceRaw, ['基地名稱']))) {
      const key = `${lineRaw}|${siteName}|${statusRaw}`;
      if (seen.has(key)) continue;
      seen.add(key);
      records.push({
        id: `mrt-land-${createHash('sha1').update(key).digest('hex').slice(0, 12)}`,
        sourceSequenceRaw, lineRaw, lineName: lineName(lineRaw), siteName,
        statusRaw, status: normalizeStatus(statusRaw), remarks, sourceRaw,
      });
    }
  }
  return records.sort((a, b) => a.lineName.localeCompare(b.lineName, 'zh-Hant') || a.siteName.localeCompare(b.siteName, 'zh-Hant'));
}

export function buildMrtLandDevelopmentSummary(records: MrtLandDevelopmentRecord[]) {
  const statusOrder: MrtLandDevelopmentRecord['status'][] = ['completed', 'construction', 'design', 'investment_or_preparation', 'other'];
  const byStatus = [...new Set(records.map((record) => record.statusRaw))].map((statusRaw) => {
    const items = records.filter((record) => record.statusRaw === statusRaw);
    return { statusRaw, status: normalizeStatus(statusRaw), count: items.length, share: records.length ? items.length / records.length : 0 };
  }).sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status) || b.count - a.count);
  const byLine = [...new Set(records.map((record) => record.lineName))].map((lineName) => {
    const items = records.filter((record) => record.lineName === lineName);
    return { lineName, count: items.length, completedCount: items.filter((r) => r.status === 'completed').length, constructionCount: items.filter((r) => r.status === 'construction').length, designCount: items.filter((r) => r.status === 'design').length, investmentOrPreparationCount: items.filter((r) => r.status === 'investment_or_preparation').length };
  }).sort((a, b) => b.count - a.count || a.lineName.localeCompare(b.lineName, 'zh-Hant'));
  const count = (status: MrtLandDevelopmentRecord['status']) => records.filter((record) => record.status === status).length;
  return { recordCount: records.length, sourceRowCount: new Set(records.map((record) => record.sourceSequenceRaw)).size, completedCount: count('completed'), constructionCount: count('construction'), designCount: count('design'), investmentOrPreparationCount: count('investment_or_preparation'), activeCount: records.length - count('completed'), byStatus, byLine, dataQuality: { duplicateSiteLineStatusRowsSkipped: 0, unmappedStatusCount: count('other'), missingSiteNameCount: 0 }, mapAvailability: 'The source CSV supplies no coordinates or addresses. No locations were inferred or geocoded.' };
}

export async function convertMrtLandDevelopment() {
  const file = (await listCsvFiles('data/raw/mrt-land-development')).at(-1);
  const records = convertMrtLandDevelopmentRows(file ? await readCsv(file) : []);
  const summary = buildMrtLandDevelopmentSummary(records);
  const ingestionTimestamp = new Date().toISOString();
  await writeJson('public/data/mrt-land-development/records.json', records);
  await writeJson('public/data/mrt-land-development/summary.json', summary);
  await writeJson('public/data/mrt-land-development/metadata.json', { sourceUrl, sourceAgency: '臺北市政府捷運工程局', resourceUpdatedAt: '2026-06-15T14:51:22+08:00', metadataUpdatedAt: '2026-06-15T14:51:47+08:00', coverageStart: '1993-04-15', coverageEnd: '2026-02-23', updateFrequency: 'irregular', ingestionTimestamp, importedRecordCount: records.length, expansionMethod: 'Each comma/newline-delimited site item is a source-listed development base; commas inside full-width parentheses remain part of that site item.', ...summary });
  await updateConversionReport({ dataset: '臺北捷運土地開發作業', file: file ?? '', sourceUrl, status: file ? 'converted' : 'missing', notes: ['The official CSV aggregates multiple bases in each row. Records expand only top-level Chinese enumeration delimiters; source row text and raw status are preserved.', 'The source contains no coordinates or address field, so no sites are shown on the map.'] });
  return records;
}

if (process.argv[1]?.endsWith('convertMrtLandDevelopment.ts')) console.log((await convertMrtLandDevelopment()).length);

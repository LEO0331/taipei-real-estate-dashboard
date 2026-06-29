import { createReadStream } from 'node:fs';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import {
  DISTRICTS, classifyBuildingConstructionType, classifyFloorUse, classifyZoning, parsePublicUseStatus,
  type BuildingUsePermitDetailRecord, type BuildingUsePermitRecord, type BuildingUsePermitSummary,
  type District, type FloorUseCategory,
} from '../src/models.ts';
import { updateConversionReport } from './data.ts';

const root = process.cwd();
const rawDir = join(root, 'data/raw/building-use-permits');
const output = join(root, 'public/data/building-use-permits');
const sourceUrl = 'https://data.taipei/dataset/detail?id=c876ff02-af2e-4eb8-bd33-d444f5052733';
const currentYearSourceUrl = 'https://data.taipei/dataset/detail?id=0816f991-e6c8-4da0-a789-d022fee1462b';
const xmlFiles = process.argv.slice(2);

const decode = (text: string) => text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
const values = (xml: string, tag: string) => [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))].map((match) => decode(match[1]));
const value = (xml: string, tag: string) => values(xml, tag)[0];
export function parseRocYear(raw: unknown) { const text = String(raw ?? '').trim(); const rocYear = /^\d{3}$/.test(text) ? Number(text) : undefined; return { rocYear, gregorianYear: rocYear ? rocYear + 1911 : undefined }; }
export function parseRocDate(raw: unknown) {
  const text = String(raw ?? '').trim(); if (!text) return {};
  if (!/^\d{7}$/.test(text)) return { raw: text, warning: `Invalid ROC date: ${text}` };
  const rocYear = Number(text.slice(0, 3)); const month = Number(text.slice(3, 5)); const day = Number(text.slice(5)); const date = new Date(Date.UTC(rocYear + 1911, month - 1, day));
  if (month < 1 || month > 12 || day < 1 || day > 31 || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return { raw: text, rocYear, gregorianYear: rocYear + 1911, warning: `Invalid ROC date: ${text}` };
  return { raw: text, rocYear, gregorianYear: rocYear + 1911, isoDate: `${rocYear + 1911}-${text.slice(3, 5)}-${text.slice(5)}` };
}
export function parseNumberWithUnit(raw: unknown) { const text = String(raw ?? '').trim().replace(/[,，\s]/g, '').replace(/㎡|平方公尺|M|米|元/gi, ''); const match = text.match(/-?\d+(?:\.\d+)?/); return match && Number.isFinite(Number(match[0])) ? Number(match[0]) : undefined; }
export function parseDistrictFromAddresses(addresses: string[]): District | undefined { return DISTRICTS.find((district) => addresses.some((address) => address.includes(district))); }
const median = (values: number[]) => { const sorted = values.filter(Number.isFinite).sort((a, b) => a - b); if (!sorted.length) return undefined; const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; };
const primaryStructure = (raw: string | undefined) => raw?.replace(/\(.*/, '').split(/[、，,]/)[0].trim() || undefined;
export function parseFloorRecord(raw: string) { const floorLabel = raw.split(',')[0]?.trim(); const areaSqm = parseNumberWithUnit(raw.match(/面積[:：]([^,，]+)/)?.[1]); const heightM = parseNumberWithUnit(raw.match(/高度[:：]([^,，]+)/)?.[1]); const useRaw = raw.match(/用途[:：](.*)$/)?.[1]?.trim(); return { raw, floorLabel, areaSqm, heightM, useRaw, useCategory: classifyFloorUse(useRaw) }; }
export function parseParkingRecord(raw: string) { const field = (name: string) => raw.match(new RegExp(`${name}[:：]([^,，]+)`))?.[1]?.trim(); const parts = raw.split(/[,，]/).map((part) => part.trim()); return { raw, setupType: field('設置類別'), vehicleType: field('車位分類'), reviewType: field('檢討類別'), locationIndoorOutdoor: parts.find((part) => /室內|室外/.test(part)), locationAboveBelowGround: parts.find((part) => /地上|地下/.test(part)), spaceCount: parseNumberWithUnit(field('輛數')), areaSqm: parseNumberWithUnit(field('面積')) }; }

export function normalize(xml: string): BuildingUsePermitDetailRecord {
  const addresses = values(xml, '地址'); const landSections = values(xml, '地段號'); const floors = values(xml, '樓層').map(parseFloorRecord); const parking = values(xml, '停車空間說明').map(parseParkingRecord);
  const permitYearRaw = value(xml, '執照年度'); const { rocYear: permitYearRoc, gregorianYear: permitYearGregorian } = parseRocYear(permitYearRaw); const permitNumber = value(xml, '執照號碼'); const issue = parseRocDate(value(xml, '發照日期')); const completion = parseRocDate(value(xml, '竣工日期')); const start = parseRocDate(value(xml, '開工日期'));
  const constructionTypeRaw = value(xml, '建造類別'); const structureTypeRaw = value(xml, '構造種類'); const zoningRaw = value(xml, '使用分區'); const district = parseDistrictFromAddresses(addresses);
  const categoryCount = (category: FloorUseCategory) => floors.filter((floor) => floor.useCategory === category).length;
  const parkingCount = (matcher: RegExp) => parking.filter((item) => matcher.test(item.vehicleType ?? '')).reduce((sum, item) => sum + (item.spaceCount ?? 0), 0) || undefined;
  const id = `${permitYearRaw ?? ''}|${permitNumber ?? issue.raw ?? addresses[0] ?? ''}`;
  return {
    id, permitYearRaw, permitYearRoc, permitYearGregorian, permitNumber, issueDateRaw: issue.raw, issueDate: issue.isoDate, originalPermitNumber: value(xml, '原核發執照'),
    constructionTypeRaw, constructionType: classifyBuildingConstructionType(constructionTypeRaw), structureTypeRaw, structureTypePrimary: primaryStructure(structureTypeRaw), publicUseStatus: parsePublicUseStatus(structureTypeRaw), zoningRaw, zoningCategory: classifyZoning(zoningRaw), district, primaryAddress: addresses[0], addressCount: addresses.length, addressesSample: addresses.slice(0, 3), landSectionCount: landSections.length, landSectionsSample: landSections.slice(0, 3),
    buildingInfo: { buildingCount: parseNumberWithUnit(value(xml, '棟數')), blockCount: parseNumberWithUnit(value(xml, '幢數')), aboveGroundFloors: parseNumberWithUnit(value(xml, '地上層數')), undergroundFloors: parseNumberWithUnit(value(xml, '地下層數')), householdCount: parseNumberWithUnit(value(xml, '戶數')) },
    buildingArea: { arcadeSiteAreaSqm: parseNumberWithUnit(value(xml, '騎樓基地面積')), otherSiteAreaSqm: parseNumberWithUnit(value(xml, '其他基地面積')), buildingAreaSqm: parseNumberWithUnit(value(xml, '建築面積')), legalOpenSpaceAreaSqm: parseNumberWithUnit(value(xml, '法定空地面積')), aboveGroundShelterAreaSqm: parseNumberWithUnit(value(xml, '地上避難面積')), undergroundShelterAreaSqm: parseNumberWithUnit(value(xml, '地下避難面積')) },
    buildingHeightM: parseNumberWithUnit(value(xml, '建物高度')), projectCostNtd: parseNumberWithUnit(value(xml, '工程金額')), completionDateRaw: completion.raw, completionDate: completion.isoDate, startDateRaw: start.raw, startDate: start.isoDate,
    floorSummary: { floorRecordCount: floors.length, primaryUses: [...new Set(floors.map((floor) => floor.useRaw).filter(Boolean))].slice(0, 5) as string[], residentialFloorRecordCount: categoryCount('residential'), officeFloorRecordCount: categoryCount('office'), retailFloorRecordCount: categoryCount('retail'), parkingFloorRecordCount: categoryCount('parking') },
    parkingSummary: { parkingRecordCount: parking.length, carSpaces: parkingCount(/汽車|小客車/), motorcycleSpaces: parkingCount(/機車/), bicycleSpaces: parkingCount(/自行車/), otherSpaces: parking.filter((item) => !/汽車|小客車|機車|自行車/.test(item.vehicleType ?? '')).reduce((sum, item) => sum + (item.spaceCount ?? 0), 0) || undefined },
    remarksCount: values(xml, '備註說明').length, hasChangeSummary: values(xml, '變更概要').some(Boolean) || values(xml, '變更說明').some(Boolean), sourceDetailAvailable: true,
    designerRaw: value(xml, '設計人'), supervisorRaw: value(xml, '監造人'), contractorRaw: value(xml, '承造人'), allAddresses: addresses, allLandSections: landSections, floorRecords: floors, parkingRecords: parking, miscellaneousWorkItems: values(xml, '說明'), applicableLawItems: [...values(xml, '法令'), ...values(xml, '適用法令')], remarks: values(xml, '備註說明'), changeSummaryItems: [...values(xml, '變更概要'), ...values(xml, '變更說明')].filter(Boolean),
  };
}
const compact = (record: BuildingUsePermitDetailRecord): BuildingUsePermitRecord => { const { designerRaw, supervisorRaw, contractorRaw, allAddresses, allLandSections, floorRecords, parkingRecords, miscellaneousWorkItems, applicableLawItems, remarks, changeSummaryItems, ...item } = record; return item; };
const add = (map: Map<string, number>, key: string | undefined) => key && map.set(key, (map.get(key) ?? 0) + 1);

async function listXmlFiles(directory: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await listXmlFiles(path));
    else if (entry.name.toLowerCase().endsWith('.xml')) found.push(path);
  }
  return found.sort();
}

async function parseXmlFile(path: string, byYear: Map<number, BuildingUsePermitDetailRecord[]>, seen: Set<string>, warnings: string[], invalidDates: string[]) {
  let duplicates = 0;
  let carry = '';
  const decoder = new StringDecoder('utf8');
  const stream = createReadStream(path);
  for await (const part of stream) {
    carry += decoder.write(part);
    let end;
    while ((end = carry.indexOf('</Data>')) >= 0) {
      const recordXml = carry.slice(0, end + 7);
      carry = carry.slice(end + 7);
      const start = recordXml.indexOf('<Data>');
      if (start < 0) continue;
      const record = normalize(recordXml.slice(start));
      if (seen.has(record.id)) {
        duplicates += 1;
        continue;
      }
      seen.add(record.id);
      if (!record.permitYearGregorian) {
        warnings.push(`Missing permit year: ${record.id}`);
        continue;
      }
      if (record.issueDateRaw && !record.issueDate) invalidDates.push(record.issueDateRaw);
      byYear.set(record.permitYearGregorian, [...(byYear.get(record.permitYearGregorian) ?? []), record]);
    }
  }
  return duplicates;
}

async function main() {
  await rm(output, { recursive: true, force: true }); await mkdir(join(output, 'chunks/by-year-district'), { recursive: true }); await mkdir(join(output, 'details/by-year-district'), { recursive: true });
  const sourceFiles = xmlFiles.length ? xmlFiles : await listXmlFiles(rawDir);
  const sourceBytes = (await Promise.all(sourceFiles.map((file) => stat(file).then((item) => item.size).catch(() => 0)))).reduce((sum, size) => sum + size, 0);
  const byYear = new Map<number, BuildingUsePermitDetailRecord[]>(); const seen = new Set<string>(); const warnings: string[] = []; const invalidDates: string[] = []; let duplicates = 0;
  for (const file of sourceFiles) duplicates += await parseXmlFile(file, byYear, seen, warnings, invalidDates);
  const records = [...byYear.values()].flat(); const construction = new Map<string, number>(); const publicUse = new Map<string, number>(); const district = new Map<string, BuildingUsePermitRecord[]>(); const structure = new Map<string, number>(); const zoning = new Map<string, number>();
  for (const record of records) { add(construction, record.constructionType); add(publicUse, record.publicUseStatus); add(structure, record.structureTypePrimary ?? 'unknown'); add(zoning, record.zoningCategory); if (record.district) district.set(record.district, [...(district.get(record.district) ?? []), compact(record)]); }
  const summary: BuildingUsePermitSummary = { totalRecords: records.length, minPermitYearGregorian: Math.min(...byYear.keys()), maxPermitYearGregorian: Math.max(...byYear.keys()), minIssueDate: records.map((item) => item.issueDate).filter(Boolean).sort()[0], maxIssueDate: records.map((item) => item.issueDate).filter(Boolean).sort().at(-1), districtCount: district.size, recordsWithDistrict: records.filter((item) => item.district).length, recordsMissingDistrict: records.filter((item) => !item.district).length, totalHouseholdCount: records.reduce((sum, item) => sum + (item.buildingInfo?.householdCount ?? 0), 0), totalProjectCostNtd: records.reduce((sum, item) => sum + (item.projectCostNtd ?? 0), 0), totalBuildingAreaSqm: records.reduce((sum, item) => sum + (item.buildingArea?.buildingAreaSqm ?? 0), 0), totalCarParkingSpaces: records.reduce((sum, item) => sum + (item.parkingSummary.carSpaces ?? 0), 0), totalMotorcycleParkingSpaces: records.reduce((sum, item) => sum + (item.parkingSummary.motorcycleSpaces ?? 0), 0), medianAboveGroundFloors: median(records.map((item) => item.buildingInfo?.aboveGroundFloors ?? NaN)), medianBuildingHeightM: median(records.map((item) => item.buildingHeightM ?? NaN)), constructionTypeCounts: [...construction].map(([constructionType, count]) => ({ constructionType: constructionType as BuildingUsePermitRecord['constructionType'], count })), publicUseStatusCounts: [...publicUse].map(([publicUseStatus, count]) => ({ publicUseStatus: publicUseStatus as BuildingUsePermitRecord['publicUseStatus'], count })) };
  const yearly = [...byYear].sort(([a], [b]) => a - b).map(([year, items]) => ({ year, rocYear: year - 1911, recordCount: items.length, totalHouseholdCount: items.reduce((sum, item) => sum + (item.buildingInfo?.householdCount ?? 0), 0), totalProjectCostNtd: items.reduce((sum, item) => sum + (item.projectCostNtd ?? 0), 0), totalBuildingAreaSqm: items.reduce((sum, item) => sum + (item.buildingArea?.buildingAreaSqm ?? 0), 0), totalCarParkingSpaces: items.reduce((sum, item) => sum + (item.parkingSummary.carSpaces ?? 0), 0), totalMotorcycleParkingSpaces: items.reduce((sum, item) => sum + (item.parkingSummary.motorcycleSpaces ?? 0), 0), medianAboveGroundFloors: median(items.map((item) => item.buildingInfo?.aboveGroundFloors ?? NaN)), medianBuildingHeightM: median(items.map((item) => item.buildingHeightM ?? NaN)), newConstructionCount: items.filter((item) => item.constructionType === 'new_construction').length, additionCount: items.filter((item) => item.constructionType === 'addition').length, repairCount: items.filter((item) => item.constructionType === 'repair').length, reconstructionCount: items.filter((item) => item.constructionType === 'reconstruction').length }));
  const districts = [...district].map(([name, items]) => ({ district: name, recordCount: items.length, totalHouseholdCount: items.reduce((sum, item) => sum + (item.buildingInfo?.householdCount ?? 0), 0), totalProjectCostNtd: items.reduce((sum, item) => sum + (item.projectCostNtd ?? 0), 0), totalBuildingAreaSqm: items.reduce((sum, item) => sum + (item.buildingArea?.buildingAreaSqm ?? 0), 0), totalCarParkingSpaces: items.reduce((sum, item) => sum + (item.parkingSummary.carSpaces ?? 0), 0), totalMotorcycleParkingSpaces: items.reduce((sum, item) => sum + (item.parkingSummary.motorcycleSpaces ?? 0), 0), medianAboveGroundFloors: median(items.map((item) => item.buildingInfo?.aboveGroundFloors ?? NaN)), medianBuildingHeightM: median(items.map((item) => item.buildingHeightM ?? NaN)) }));
  const write = (name: string, data: unknown) => writeFile(join(output, name), `${JSON.stringify(data)}\n`); const chunks: Array<{ chunkType: 'by_year_district' | 'detail'; key: string; path: string; recordCount: number; sizeBytes: number }> = []; const detailIndex: Record<string, string> = {};
  for (const [year, items] of byYear) { const groups = new Map<string, BuildingUsePermitDetailRecord[]>(); for (const item of items) { const key = item.district ?? '未分類'; groups.set(key, [...(groups.get(key) ?? []), item]); } for (const [districtName, group] of groups) { const key = `${year}-${districtName}`; const chunkPath = `chunks/by-year-district/${key}.json`; const detailPath = `details/by-year-district/${key}.json`; await write(chunkPath, group.map(compact)); await write(detailPath, group); const chunkSize = (await stat(join(output, chunkPath))).size; const detailSize = (await stat(join(output, detailPath))).size; chunks.push({ chunkType: 'by_year_district', key, path: chunkPath, recordCount: group.length, sizeBytes: chunkSize }); if (detailSize <= 1_000_000) { chunks.push({ chunkType: 'detail', key, path: detailPath, recordCount: group.length, sizeBytes: detailSize }); for (const item of group) detailIndex[item.id] = detailPath; } else { await rm(join(output, detailPath)); const midpoint = Math.ceil(group.length / 2); for (const [index, part] of [group.slice(0, midpoint), group.slice(midpoint)].entries()) { const partPath = `details/by-year-district/${key}-${index + 1}.json`; await write(partPath, part); chunks.push({ chunkType: 'detail', key: `${key}-${index + 1}`, path: partPath, recordCount: part.length, sizeBytes: (await stat(join(output, partPath))).size }); for (const item of part) detailIndex[item.id] = partPath; } } if (chunkSize > 1_000_000) warnings.push(`Large compact chunk: ${key} (${chunkSize} bytes)`); } }
  await Promise.all([write('summary.json', summary), write('yearly-summary.json', yearly), write('district-summary.json', districts), write('construction-type-summary.json', [...construction].map(([key, count]) => ({ key, count }))), write('structure-type-summary.json', [...structure].map(([key, count]) => ({ key, count }))), write('zoning-summary.json', [...zoning].map(([key, count]) => ({ key, count }))), write('parking-summary.json', yearly.map(({ year, totalCarParkingSpaces, totalMotorcycleParkingSpaces }) => ({ year, totalCarParkingSpaces, totalMotorcycleParkingSpaces }))), write('search-index.json', records.map(({ id, permitNumber, permitYearGregorian, issueDate, district, primaryAddress, constructionTypeRaw, structureTypePrimary }) => ({ id, permitNumber, permitYearGregorian, issueDate, district, primaryAddress, constructionTypeRaw, structureTypePrimary }))), write('detail-index.json', detailIndex)]);
  await write('manifest.json', { generatedAt: new Date().toISOString(), sourceFileName: sourceFiles.map((file) => file.split('/').at(-1)).join(', '), sourceFileSizeBytes: sourceBytes, sourceDatasetUrl: sourceUrl, currentYearSourceDatasetUrl: currentYearSourceUrl, totalRecords: records.length, years: [...byYear.keys()].sort(), districts: [...district.keys()].sort(), chunks, notes: ['Generated from XML with a Node stream; raw XML is not served to the browser.', 'Includes all XML files under data/raw/building-use-permits, including 115 current-year records when present.', 'Detail records load only when requested.'] });
  await updateConversionReport({ dataset: '臺北市歷年使用執照摘要', file: sourceFiles[0] ?? rawDir, sourceUrl, status: 'converted', notes: [`${records.length} records from ${sourceFiles.length} XML file(s)`, `${duplicates} duplicates skipped`, `115 current-year source: ${currentYearSourceUrl}`, 'Includes 臺北市115年度使用執照摘要 when data/raw/building-use-permits/115/Taipei02.xml is present.'] }, [...warnings, ...invalidDates.map((date) => `Invalid ROC date: ${date}`)]);
  console.log(`Converted ${records.length} use-permit records from ${sourceFiles.length} XML file(s) into ${byYear.size} yearly chunks.`);
}
if (import.meta.url === `file://${process.argv[1]}`) void main();

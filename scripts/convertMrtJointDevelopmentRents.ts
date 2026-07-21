import { createHash } from 'node:crypto';
import { getColumn, listCsvFiles, parseNumber, readCsv, updateConversionReport, writeJson } from './data.ts';

const headers = {
  sequence: '\u9805\u6b21', project: '\u5efa\u6848\u540d\u7a31', floorArea: '\u6a13\u5730\u677f\u9762\u7a4d', rent: '\u6bcf\u576a\u6708\u79df\u91d1',
  authority: '\u7ba1\u7406\u6a5f\u95dc', buildings: '\u623f\u820d\u6578\u91cf', use: '\u5efa\u7269\u7528\u9014', households: '\u6236\u6578',
} as const;

const empty = (value: string | undefined) => {
  const normalized = value?.trim();
  return normalized && !['-', '--', '—'].includes(normalized) ? normalized : undefined;
};
const nonNegativeInteger = (value: string | undefined) => {
  const parsed = parseNumber(value);
  return parsed !== undefined && parsed >= 0 && Number.isInteger(parsed) ? parsed : undefined;
};
const numericRange = (value: string | undefined) => {
  const numbers = (value ?? '').replace(/,/g, '').match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  return numbers.length && numbers.every((number) => Number.isFinite(number) && number >= 0) ? numbers : [];
};
const representativeRent = (value: string | undefined) => {
  const values = numericRange(value);
  return values.length ? values.reduce((sum, number) => sum + number, 0) / values.length : undefined;
};
const stationFromProject = (projectName: string | undefined) => {
  const match = projectName?.match(/^(.+?)(?:\u7ad9|\u5340\u516c\u6240\u7ad9)/);
  return match?.[0];
};

export async function convertMrtJointDevelopmentRents() {
  const file = (await listCsvFiles('data/raw/mrt-joint-development-rents')).at(-1);
  const rows = file ? await readCsv(file) : [];
  let inheritedProject: string | undefined;
  let inheritedAuthority: string | undefined;
  let inheritedSequence: string | undefined;
  let continuation = 0;
  const seen = new Set<string>();
  const quality = { invalidAreaCount: 0, unknownAreaUnitCount: 0, invalidRentCount: 0, invalidBuildingCount: 0, invalidHouseholdCount: 0, duplicateCount: 0, missingProjectNameCount: 0 };
  const records = rows.flatMap((sourceRaw) => {
    const listedProject = empty(getColumn(sourceRaw, [headers.project]));
    const listedSequence = empty(getColumn(sourceRaw, [headers.sequence]));
    if (listedProject) { inheritedProject = listedProject; inheritedAuthority = empty(getColumn(sourceRaw, [headers.authority])); inheritedSequence = listedSequence; continuation = 0; }
    else continuation += 1;
    const projectName = listedProject ?? inheritedProject;
    const sequence = listedSequence ?? inheritedSequence;
    const floorAreaRaw = empty(getColumn(sourceRaw, [headers.floorArea])) ?? '';
    const monthlyRentPerPingRaw = empty(getColumn(sourceRaw, [headers.rent])) ?? '';
    const buildingCount = nonNegativeInteger(empty(getColumn(sourceRaw, [headers.buildings])));
    const householdCount = nonNegativeInteger(empty(getColumn(sourceRaw, [headers.households])));
    const monthlyRentPerPing = representativeRent(monthlyRentPerPingRaw);
    const id = sequence ? `${sequence}${continuation ? `-${continuation}` : ''}` : createHash('sha1').update(JSON.stringify(sourceRaw)).digest('hex').slice(0, 16);
    const duplicateKey = [projectName, empty(getColumn(sourceRaw, [headers.use])), floorAreaRaw, monthlyRentPerPingRaw, buildingCount, householdCount].join('|');
    if (seen.has(duplicateKey)) { quality.duplicateCount += 1; return []; }
    seen.add(duplicateKey);
    if (!projectName) quality.missingProjectNameCount += 1;
    if (floorAreaRaw) { quality.unknownAreaUnitCount += 1; if (!numericRange(floorAreaRaw).length) quality.invalidAreaCount += 1; }
    if (monthlyRentPerPingRaw && monthlyRentPerPing === undefined) quality.invalidRentCount += 1;
    if (empty(getColumn(sourceRaw, [headers.buildings])) && buildingCount === undefined) quality.invalidBuildingCount += 1;
    if (empty(getColumn(sourceRaw, [headers.households])) && householdCount === undefined) quality.invalidHouseholdCount += 1;
    return [{
      id, projectName: projectName ?? '', stationName: stationFromProject(projectName), floorAreaRaw, floorAreaSquareMeters: null, floorAreaPing: null,
      monthlyRentPerPingRaw, monthlyRentPerPing: monthlyRentPerPing ?? null, managingAuthority: empty(getColumn(sourceRaw, [headers.authority])) ?? inheritedAuthority ?? '',
      buildingCount: buildingCount ?? null, buildingUse: empty(getColumn(sourceRaw, [headers.use])) ?? '', householdCount: householdCount ?? null,
      estimatedMonthlyRent: null, sourceRaw,
    }];
  });
  const summary = { totalRecords: records.length, dataQuality: quality, areaUnitNote: 'The source header does not state an area unit, so no square-metre or ping conversion, total floor area, or estimated monthly rent is derived.' };
  await writeJson('public/data/mrt-joint-development-rents/records.json', records);
  await writeJson('public/data/mrt-joint-development-rents/summary.json', summary);
  await updateConversionReport({ dataset: '\u81fa\u5317\u6377\u904b\u806f\u5408\u958b\u767c\u5927\u6a13\u6bcf\u576a\u6bcf\u6708\u79df\u91d1\u4e00\u89bd\u8868', file: file ?? '', sourceUrl: 'https://data.taipei/dataset/detail?id=21b647dd-9442-4fc6-926c-269ac116f500', status: file ? 'converted' : 'missing', notes: [summary.areaUnitNote] });
  return records;
}

if (process.argv[1]?.endsWith('convertMrtJointDevelopmentRents.ts')) console.log((await convertMrtJointDevelopmentRents()).length);

import { createHash } from 'node:crypto';
import { getColumn, readCsv, writeJson } from './data.ts';

export type MetroMilestoneCategory = 'planning_approval' | 'construction_start' | 'construction_progress' | 'inspection_audit' | 'contract_procurement' | 'completion_opening' | 'land_development' | 'award_recognition' | 'official_visit' | 'environmental_safety' | 'administrative' | 'other';

const directory = 'data/raw/metro-engineering-milestones';
const resources = [{ year: 2024, id: 'fe6f0e9a-af9c-4240-885b-9255f1cbc6cd' }, { year: 2025, id: '2c899636-f360-4b42-bee3-2f0cf51eb0a3' }];
const clean = (value: string | undefined) => (value ?? '').replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
const projectTerms = ['萬大線第一期', '萬大線第二期', '萬大線', '環狀線北環段', '環狀線南環段', '環狀線東環段', '環狀線北機廠', '環狀線', '信義線東延段', '北投機廠'];
const categoryTerms: Record<MetroMilestoneCategory, string[]> = {
  planning_approval: ['審查', '核定', '核准', '簽約', '都市計畫', '環評'], construction_start: ['開工', '動土', '起造'], construction_progress: ['施工', '進度', '貫通', '吊裝', '組裝', '工程'], inspection_audit: ['查核', '檢查', '稽查', '驗收', '督導', '視察'], contract_procurement: ['決標', '招標', '採購', '廠商'], completion_opening: ['完工', '通車', '啟用'], land_development: ['聯合開發', '土地開發', '招商'], award_recognition: ['獲獎', '獎項', '表揚'], official_visit: ['視察', '參訪', '拜會'], environmental_safety: ['環境', '安全', '防災', '職安', '減碳'], administrative: ['會議', '報告', '公告'], other: [],
};

export function extractContractCodes(value: string) { return [...new Set(value.match(/\b(?:C[A-Z]|D[A-Z]|I[A-Z]|T[A-Z])\d{3,4}[A-Z]?\b/g) ?? [])]; }
export function parseMilestoneDate(year: number, raw: string) {
  const value = clean(raw); const match = value.match(/(\d{1,2})\s*月(?:\s*(\d{1,2})\s*日)?/);
  if (!match) return { month: null, day: null, date: null, datePrecision: 'unknown' as const };
  const month = Number(match[1]), day = match[2] ? Number(match[2]) : null;
  if (month < 1 || month > 12 || (day !== null && (day < 1 || day > new Date(year, month, 0).getDate()))) return { month: null, day: null, date: null, datePrecision: 'unknown' as const };
  return { month, day, date: `${year}-${String(month).padStart(2, '0')}${day === null ? '' : `-${String(day).padStart(2, '0')}`}`, datePrecision: day === null ? 'month' as const : 'day' as const };
}
export function classifyMilestone(value: string) {
  const matches = Object.entries(categoryTerms).flatMap(([category, terms]) => terms.filter((term) => value.includes(term)).map((term) => ({ category: category as MetroMilestoneCategory, term })));
  const priority: MetroMilestoneCategory[] = ['inspection_audit', 'construction_start', 'contract_procurement', 'planning_approval', 'completion_opening', 'land_development', 'award_recognition', 'environmental_safety', 'official_visit', 'construction_progress', 'administrative', 'other'];
  const primary = priority.find((category) => matches.some((match) => match.category === category)) ?? 'other';
  return { category: primary, matchedTerms: matches.map((match) => match.term), secondaryCategories: [...new Set(matches.map((match) => match.category).filter((category) => category !== primary))] };
}
const splitUnits = (value: string) => value.split(/[、，,；;／/]/).map(clean).filter(Boolean);

export async function convertMetroEngineeringMilestones() {
  const records: Array<Record<string, unknown>> = [];
  const reportingUnits = new Set<string>(); const labels = new Set<string>();
  for (const resource of resources) {
    const rows = await readCsv(`${directory}/${resource.year}.csv`);
    rows.forEach((raw, index) => {
      const originalDescriptionHeader = `${resource.year}年之大事紀要內容`;
      const sourceDateRaw = clean(getColumn(raw, ['日期'])); const milestoneDescription = clean(getColumn(raw, [originalDescriptionHeader]));
      const reportingUnitRaw = clean(getColumn(raw, ['提報單位'])); const reportingUnitsForRow = splitUnits(reportingUnitRaw); reportingUnitsForRow.forEach((unit) => reportingUnits.add(unit));
      const date = parseMilestoneDate(resource.year, sourceDateRaw); const classification = classifyMilestone(milestoneDescription);
      const detectedProjectNames = projectTerms.filter((term) => milestoneDescription.includes(term)); detectedProjectNames.forEach((term) => labels.add(term));
      const detectedLines = [...new Set(detectedProjectNames.map((term) => term.includes('萬大線') ? '萬大線' : term.includes('環狀線') ? '環狀線' : term.includes('信義線') ? '信義線' : term))];
      const detectedContractCodes = extractContractCodes(milestoneDescription);
      const detectedStations = [...new Set(milestoneDescription.match(/[\u4e00-\u9fff]{2,8}站/g) ?? [])];
      const sourceSequenceNumber = clean(getColumn(raw, ['項次'])); const cityCode = clean(getColumn(raw, ['縣市代碼'])); const authorityCode = clean(getColumn(raw, ['機關代碼']));
      records.push({ id: `${resource.year}-${sourceSequenceNumber || createHash('sha1').update(JSON.stringify(raw)).digest('hex')}`, sourceYear: resource.year, sourceResourceId: resource.id, sourceSequenceNumber, cityCode, authorityCode, sourceDateRaw, ...date, milestoneDescription, originalDescriptionHeader, reportingUnitRaw, reportingUnits: reportingUnitsForRow, detectedLines, detectedProjectNames, detectedContractCodes, detectedStations, milestoneCategory: classification.category, matchedCategoryTerms: classification.matchedTerms, secondaryCategories: classification.secondaryCategories, hasValidDate: date.date !== null, hasDetectedProject: detectedProjectNames.length > 0, sourceRaw: raw, sourceOrder: index + 1 });
    });
  }
  records.sort((a, b) => String(a.date ?? '9999').localeCompare(String(b.date ?? '9999')) || Number(a.sourceYear) - Number(b.sourceYear) || Number(a.sourceOrder) - Number(b.sourceOrder));
  await writeJson('public/data/metro-engineering-milestones/records.json', records);
  await writeJson('public/data/metro-engineering-milestones/metadata.json', { includedYears: resources.map((resource) => resource.year), resourceIds: Object.fromEntries(resources.map((resource) => [resource.year, resource.id])), sourceRowCountByYear: Object.fromEntries(resources.map((resource) => [resource.year, records.filter((record) => record.sourceYear === resource.year).length])), firstEventDate: records.find((record) => record.date)?.date ?? null, latestEventDate: [...records].reverse().find((record) => record.date)?.date ?? null, reportingUnits: [...reportingUnits].sort(), detectedProjectAndLineLabels: [...labels].sort(), sourceFileUpdateDates: { 2024: 'not provided in CSV', 2025: 'not provided in CSV' }, ingestedAt: new Date().toISOString(), parserVersion: '1.0.0' });
  return records;
}
if (process.argv[1]?.endsWith('convertMetroEngineeringMilestones.ts')) console.log((await convertMetroEngineeringMilestones()).length);

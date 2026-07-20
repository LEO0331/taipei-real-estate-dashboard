import { createHash } from 'node:crypto';
import { getColumn, listCsvFiles, parseNumber, readCsv, writeJson } from './data.ts';

type AwardRecord = {
  id: string;
  yearRaw?: string;
  year?: number;
  awardCategory?: string;
  projectName?: string;
  contractAmountThousandNtdRaw?: string;
  contractAmountThousandNtd?: number;
  contractAmountNtd?: number;
  contractingAgency?: string;
  contractor?: string;
  designUnit?: string;
  supervisionUnit?: string;
  projectManagementUnit?: string;
  sourceRaw: Record<string, string>;
};

const headers = {
  serial: '\u5e8f\u865f', year: '\u5e74\u5ea6', category: '\u985e\u5225', project: '\u5de5\u7a0b\u540d\u7a31',
  amount: '\u5951\u7d04\u91d1\u984d\uff08\u5343\u5143\uff09', agency: '\u4e3b\u8fa6\u6a5f\u95dc', contractor: '\u65bd\u5de5\u55ae\u4f4d',
  design: '\u8a2d\u8a08\u55ae\u4f4d', supervision: '\u76e3\u9020\u55ae\u4f4d', projectManagement: '\u5c08\u6848\u7ba1\u7406\u55ae\u4f4d',
} as const;

const present = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed && !['-', '--'].includes(trimmed) ? trimmed : undefined;
};
const parseYear = (raw: string | undefined) => {
  const value = parseNumber(raw);
  return value === undefined ? undefined : value < 1911 ? value + 1911 : value;
};

export async function convertPublicWorksExcellenceAwardProjects() {
  const file = (await listCsvFiles('data/raw/public-works-excellence-award-projects')).at(-1);
  const rows = file ? await readCsv(file) : [];
  const records: AwardRecord[] = rows.map((sourceRaw) => {
    const yearRaw = present(getColumn(sourceRaw, [headers.year]));
    const contractAmountThousandNtdRaw = present(getColumn(sourceRaw, [headers.amount]));
    const contractAmountThousandNtd = parseNumber(contractAmountThousandNtdRaw);
    return {
      id: present(getColumn(sourceRaw, [headers.serial])) ?? createHash('sha1').update(JSON.stringify(sourceRaw)).digest('hex').slice(0, 16),
      yearRaw, year: parseYear(yearRaw), awardCategory: present(getColumn(sourceRaw, [headers.category])), projectName: present(getColumn(sourceRaw, [headers.project])),
      contractAmountThousandNtdRaw, contractAmountThousandNtd,
      contractAmountNtd: contractAmountThousandNtd === undefined ? undefined : contractAmountThousandNtd * 1_000,
      contractingAgency: present(getColumn(sourceRaw, [headers.agency])), contractor: present(getColumn(sourceRaw, [headers.contractor])),
      designUnit: present(getColumn(sourceRaw, [headers.design])), supervisionUnit: present(getColumn(sourceRaw, [headers.supervision])),
      projectManagementUnit: present(getColumn(sourceRaw, [headers.projectManagement])), sourceRaw,
    };
  });
  await writeJson('public/data/public-works-excellence-award-projects/records.json', records);
  return records;
}

if (process.argv[1]?.endsWith('convertPublicWorksExcellenceAwardProjects.ts')) console.log((await convertPublicWorksExcellenceAwardProjects()).length);

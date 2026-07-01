import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { DISTRICTS, type District, type MovableCollateralTypeCategory, type MovablePropertySecuredTransactionRecord, type MovablePropertySecuredTransactionSummary, type RealEstateSummary, type SecuredTransactionCategory, type SourceYesNoUnknown } from '../src/models.ts';
import { getColumn, listCsvFiles, parseNumber, readCsv, updateConversionReport, writeJson, type CsvRow } from './data.ts';

const directory = 'data/raw/movable-property-secured-transaction-records';
const source = '臺北市動產擔保登記資料';
const sourceAgency = '臺北市政府產業發展局';
const sourceUrl = 'https://data.taipei/dataset/detail?id=cb964837-c602-4238-b6c0-f63ad1094d5e';
const module = 'movable_property_secured_transaction_records' as const;
const today = '2026-07-01';

export function cleanText(raw: unknown): string | undefined {
  const text = String(raw ?? '').replace(/\u3000/g, ' ').trim();
  return !text || ['-', '--', 'nan', 'null', '尚無資料'].includes(text.toLowerCase()) ? undefined : text;
}

export function parseRocDate(raw: unknown): { raw?: string; date?: string; year?: number; month?: number } {
  const text = cleanText(raw);
  if (!text) return {};
  const digits = text.replace(/\D/g, '');
  if (digits.length !== 7 && digits.length !== 8) return { raw: text };
  const year = Number(digits.length === 7 ? digits.slice(0, 3) : digits.slice(0, 4));
  const gregorianYear = year < 1911 ? year + 1911 : year;
  const month = Number(digits.slice(-4, -2));
  const day = Number(digits.slice(-2));
  if (month < 1 || month > 12 || day < 1 || day > 31) return { raw: text };
  return { raw: text, date: `${gregorianYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, year: gregorianYear, month };
}

export function classifySecuredTransactionType(raw: string | undefined): SecuredTransactionCategory {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown';
  if (text.includes('動產抵押')) return 'movable_property_mortgage';
  if (text.includes('附條件買賣')) return 'conditional_sale';
  return 'other';
}

export function classifyMovableCollateralType(raw: string | undefined): MovableCollateralTypeCategory {
  const text = raw?.trim() ?? '';
  if (!text || text === '尚無資料') return 'unknown';
  if (/機器|設備|工具/.test(text)) return 'machinery_equipment_or_tools';
  if (/車|運輸/.test(text)) return 'vehicle_or_transport';
  if (/商品|存貨|原料/.test(text)) return 'inventory_or_goods';
  return 'other';
}

const compact = <T extends object>(value: T): T => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== '')) as T;
const normalizeName = (value: string | undefined) => cleanText(value)?.replace(/\s/g, '');
const isMasked = (value: string | undefined) => !!value && /\*{3,}/.test(value);
const sourceHash = (row: CsvRow) => createHash('sha1').update(JSON.stringify(row)).digest('hex').slice(0, 12);
const parseFlag = (raw: unknown): SourceYesNoUnknown => cleanText(raw)?.toUpperCase() === 'Y' ? 'yes' : cleanText(raw)?.toUpperCase() === 'N' ? 'no' : 'unknown';
const ntdAmount = (amount: number | undefined, currency: string | undefined) => currency === 'NTD' ? amount : undefined;
const daysBetween = (start: string | undefined, end: string | undefined) => start && end ? Math.round((Date.parse(end) - Date.parse(start)) / 86400000) : undefined;
const districtFrom = (text: string | undefined): District | undefined => {
  const normalized = text?.replace(/台北市/g, '臺北市').replace(/\s/g, '') ?? '';
  return DISTRICTS.find((district) => normalized.includes(district) || normalized.includes(district.slice(0, -1)));
};
const roadFrom = (text: string | undefined) => cleanText(text)?.match(/([\u4e00-\u9fff]{1,8}(?:路|街|大道))/)?.[1];

export function makeMovablePropertySecuredTransactionRecord(row: CsvRow, index: number): MovablePropertySecuredTransactionRecord {
  const registration = parseRocDate(getColumn(row, ['登記核准日期']));
  const amendment = parseRocDate(getColumn(row, ['變更核准日期']));
  const cancellation = parseRocDate(getColumn(row, ['註銷日期']));
  const contractStart = parseRocDate(getColumn(row, ['契約啟始日期']));
  const contractEnd = parseRocDate(getColumn(row, ['契約終止日期']));
  const securedTransactionTypeRaw = cleanText(getColumn(row, ['擔保類別']));
  const collateralTypeRaw = cleanText(getColumn(row, ['標的物種類']));
  const debtorAddress = cleanText(getColumn(row, ['債務人住居所或營業所']))?.replace(/台北市/g, '臺北市');
  const securedPartyAddress = cleanText(getColumn(row, ['擔保權人住居所或營業所']))?.replace(/台北市/g, '臺北市');
  const collateralLocation = cleanText(getColumn(row, ['標的物所在地']))?.replace(/台北市/g, '臺北市');
  const collateralTotalAmount = parseNumber(getColumn(row, ['標的物總價格', '標的物總金額']));
  const securedDebtAmount = parseNumber(getColumn(row, ['擔保債權金額']));
  const collateralCurrency = cleanText(getColumn(row, ['標的物價格幣別']));
  const securedDebtCurrency = cleanText(getColumn(row, ['擔保債權金額幣別']));
  const collateralAmountNtd = ntdAmount(collateralTotalAmount, collateralCurrency);
  const securedDebtAmountNtd = ntdAmount(securedDebtAmount, securedDebtCurrency);
  const maximumLimitFlag = parseFlag(getColumn(row, ['最高限額註記']));
  const floatingChargeFlag = parseFlag(getColumn(row, ['浮動擔保註記']));
  const debtorBusinessNumber = cleanText(getColumn(row, ['債務人統編']));
  const securedPartyBusinessNumber = cleanText(getColumn(row, ['擔保權人統編']));
  const collateralOwnerBusinessNumber = cleanText(getColumn(row, ['標的物所有人統編']));
  const registrationNumber = cleanText(getColumn(row, ['登記編號'])) ?? `row-${index}`;
  return compact({
    id: registrationNumber,
    module,
    registrationNumber,
    source,
    sourceAgency,
    sourceRecordHash: sourceHash(row),
    registrationApprovalDateRaw: registration.raw,
    registrationApprovalDate: registration.date,
    registrationYear: registration.year,
    registrationMonth: registration.month,
    registrationMonthKey: registration.date?.slice(0, 7),
    registrationQuarter: registration.year && registration.month ? `${registration.year}-Q${Math.ceil(registration.month / 3)}` : undefined,
    amendmentDocumentNumber: cleanText(getColumn(row, ['變更文號'])),
    amendmentApprovalDateRaw: amendment.raw,
    amendmentApprovalDate: amendment.date,
    amendmentYear: amendment.year,
    hasAmendment: !!amendment.date,
    cancellationDocumentNumber: cleanText(getColumn(row, ['註銷文號'])),
    cancellationDateRaw: cancellation.raw,
    cancellationDate: cancellation.date,
    cancellationYear: cancellation.year,
    hasCancellation: !!cancellation.date,
    securedTransactionTypeRaw,
    securedTransactionType: securedTransactionTypeRaw,
    securedTransactionCategory: classifySecuredTransactionType(securedTransactionTypeRaw),
    contractStartDateRaw: contractStart.raw,
    contractStartDate: contractStart.date,
    contractStartYear: contractStart.year,
    contractEndDateRaw: contractEnd.raw,
    contractEndDate: contractEnd.date,
    contractEndYear: contractEnd.year,
    contractDurationDays: daysBetween(contractStart.date, contractEnd.date),
    isContractCurrentlyWithinPeriod: contractStart.date && contractEnd.date ? contractStart.date <= today && today <= contractEnd.date : undefined,
    isContractExpiredByDate: contractEnd.date ? contractEnd.date < today : undefined,
    debtorName: cleanText(getColumn(row, ['債務人名稱'])),
    debtorNameNormalized: normalizeName(getColumn(row, ['債務人名稱'])),
    debtorBusinessNumber,
    hasMaskedDebtorBusinessNumber: isMasked(debtorBusinessNumber),
    debtorAddress,
    debtorDistrict: districtFrom(debtorAddress),
    debtorRoadName: roadFrom(debtorAddress),
    debtorAgentName: cleanText(getColumn(row, ['債務人代理人名稱'])),
    debtorAgentBusinessNumber: cleanText(getColumn(row, ['債務人代理人統編'])),
    securedPartyName: cleanText(getColumn(row, ['擔保權人名稱'])),
    securedPartyNameNormalized: normalizeName(getColumn(row, ['擔保權人名稱'])),
    securedPartyBusinessNumber,
    hasMaskedSecuredPartyBusinessNumber: isMasked(securedPartyBusinessNumber),
    securedPartyAddress,
    securedPartyDistrict: districtFrom(securedPartyAddress),
    securedPartyRoadName: roadFrom(securedPartyAddress),
    securedPartyAgentName: cleanText(getColumn(row, ['擔保權人代理人名稱'])),
    securedPartyAgentBusinessNumber: cleanText(getColumn(row, ['擔保權人代理人統編'])),
    securedPartyNotes: cleanText(getColumn(row, ['擔保權人備註'])),
    collateralTypeRaw,
    collateralType: collateralTypeRaw,
    collateralTypeCategory: classifyMovableCollateralType(collateralTypeRaw),
    collateralOwnerName: cleanText(getColumn(row, ['標的物所有人名稱'])),
    collateralOwnerNameNormalized: normalizeName(getColumn(row, ['標的物所有人名稱'])),
    collateralOwnerBusinessNumber,
    hasMaskedCollateralOwnerBusinessNumber: isMasked(collateralOwnerBusinessNumber),
    collateralLocation,
    collateralDistrict: districtFrom(collateralLocation),
    collateralRoadName: roadFrom(collateralLocation),
    collateralTotalAmount,
    collateralCurrency,
    collateralAmountNtd,
    securedDebtAmount,
    securedDebtCurrency,
    securedDebtAmountNtd,
    securedDebtToCollateralRatio: collateralAmountNtd && securedDebtAmountNtd !== undefined ? securedDebtAmountNtd / collateralAmountNtd : undefined,
    maximumLimitFlag,
    isMaximumLimit: maximumLimitFlag === 'yes',
    movableItemCount: parseNumber(getColumn(row, ['動產明細項數'])),
    floatingChargeFlag,
    isFloatingCharge: floatingChargeFlag === 'yes',
  } satisfies MovablePropertySecuredTransactionRecord);
}

const sum = <T>(items: T[], pick: (item: T) => number | undefined) => items.reduce((total, item) => total + (pick(item) ?? 0), 0);
const median = (values: Array<number | undefined>) => {
  const nums = values.filter((value): value is number => value !== undefined).sort((a, b) => a - b);
  return nums.length ? nums[Math.floor(nums.length / 2)] : undefined;
};
const countBy = <K extends string>(records: MovablePropertySecuredTransactionRecord[], pick: (record: MovablePropertySecuredTransactionRecord) => K | undefined) =>
  [...new Set(records.map(pick).filter((value): value is K => !!value))].map((key) => {
    const items = records.filter((record) => pick(record) === key);
    return { key, items };
  });

export function buildMovablePropertySecuredTransactionSummary(records: MovablePropertySecuredTransactionRecord[]): MovablePropertySecuredTransactionSummary {
  const dates = records.map((record) => record.registrationApprovalDate).filter((value): value is string => !!value).sort();
  const ratios = records.map((record) => record.securedDebtToCollateralRatio).filter((value): value is number => value !== undefined);
  return {
    totalRecords: records.length,
    minRegistrationApprovalDate: dates[0],
    maxRegistrationApprovalDate: dates.at(-1),
    latestRegistrationMonth: dates.at(-1)?.slice(0, 7),
    uniqueRegistrationNumberCount: new Set(records.map((record) => record.registrationNumber)).size,
    uniqueDebtorNameCount: new Set(records.map((record) => record.debtorNameNormalized).filter(Boolean)).size,
    uniqueSecuredPartyNameCount: new Set(records.map((record) => record.securedPartyNameNormalized).filter(Boolean)).size,
    uniqueCollateralOwnerNameCount: new Set(records.map((record) => record.collateralOwnerNameNormalized).filter(Boolean)).size,
    recordsWithAmendment: records.filter((record) => record.hasAmendment).length,
    recordsWithCancellation: records.filter((record) => record.hasCancellation).length,
    recordsWithContractStartDate: records.filter((record) => record.contractStartDate).length,
    recordsWithContractEndDate: records.filter((record) => record.contractEndDate).length,
    recordsWithCollateralAmount: records.filter((record) => record.collateralAmountNtd !== undefined).length,
    recordsWithSecuredDebtAmount: records.filter((record) => record.securedDebtAmountNtd !== undefined).length,
    recordsWithDebtToCollateralRatio: ratios.length,
    recordsWithMaximumLimitFlag: records.filter((record) => record.maximumLimitFlag !== 'unknown').length,
    recordsWithFloatingChargeFlag: records.filter((record) => record.floatingChargeFlag !== 'unknown').length,
    totalCollateralAmountNtd: sum(records, (record) => record.collateralAmountNtd),
    totalSecuredDebtAmountNtd: sum(records, (record) => record.securedDebtAmountNtd),
    medianCollateralAmountNtd: median(records.map((record) => record.collateralAmountNtd)),
    medianSecuredDebtAmountNtd: median(records.map((record) => record.securedDebtAmountNtd)),
    averageSecuredDebtToCollateralRatio: ratios.length ? sum(ratios, (value) => value) / ratios.length : undefined,
    medianSecuredDebtToCollateralRatio: median(ratios),
    byRegistrationYear: countBy(records, (record) => record.registrationYear ? String(record.registrationYear) : undefined).map(({ key, items }) => ({ year: Number(key), recordCount: items.length, totalCollateralAmountNtd: sum(items, (record) => record.collateralAmountNtd), totalSecuredDebtAmountNtd: sum(items, (record) => record.securedDebtAmountNtd), maximumLimitCount: items.filter((record) => record.isMaximumLimit).length })).sort((a, b) => a.year - b.year),
    byRegistrationMonth: countBy(records, (record) => record.registrationMonthKey).map(({ key, items }) => ({ registrationMonthKey: key, recordCount: items.length, totalCollateralAmountNtd: sum(items, (record) => record.collateralAmountNtd), totalSecuredDebtAmountNtd: sum(items, (record) => record.securedDebtAmountNtd) })).sort((a, b) => a.registrationMonthKey.localeCompare(b.registrationMonthKey)),
    bySecuredTransactionCategory: countBy(records, (record) => record.securedTransactionCategory).map(({ key, items }) => ({ securedTransactionCategory: key, count: items.length, totalCollateralAmountNtd: sum(items, (record) => record.collateralAmountNtd), totalSecuredDebtAmountNtd: sum(items, (record) => record.securedDebtAmountNtd) })),
    byCollateralTypeCategory: countBy(records, (record) => record.collateralTypeCategory).map(({ key, items }) => ({ collateralTypeCategory: key, count: items.length, totalCollateralAmountNtd: sum(items, (record) => record.collateralAmountNtd), totalSecuredDebtAmountNtd: sum(items, (record) => record.securedDebtAmountNtd) })),
    byCollateralDistrict: countBy(records, (record) => record.collateralDistrict).map(({ key, items }) => ({ district: key, recordCount: items.length, totalCollateralAmountNtd: sum(items, (record) => record.collateralAmountNtd), totalSecuredDebtAmountNtd: sum(items, (record) => record.securedDebtAmountNtd) })).sort((a, b) => b.recordCount - a.recordCount),
    byDebtorDistrict: countBy(records, (record) => record.debtorDistrict).map(({ key, items }) => ({ district: key, recordCount: items.length })).sort((a, b) => b.recordCount - a.recordCount),
    bySecuredPartyDistrict: countBy(records, (record) => record.securedPartyDistrict).map(({ key, items }) => ({ district: key, recordCount: items.length })).sort((a, b) => b.recordCount - a.recordCount),
    topSecuredPartiesByRecordCount: countBy(records, (record) => record.securedPartyNameNormalized).map(({ key, items }) => ({ securedPartyName: items[0]?.securedPartyName ?? key, recordCount: items.length, totalSecuredDebtAmountNtd: sum(items, (record) => record.securedDebtAmountNtd) })).sort((a, b) => b.recordCount - a.recordCount).slice(0, 10),
    topDebtorsByRecordCount: countBy(records, (record) => record.debtorNameNormalized).map(({ key, items }) => ({ debtorName: items[0]?.debtorName ?? key, recordCount: items.length, totalSecuredDebtAmountNtd: sum(items, (record) => record.securedDebtAmountNtd) })).sort((a, b) => b.recordCount - a.recordCount).slice(0, 10),
    dataQuality: {
      maskedDebtorBusinessNumberCount: records.filter((record) => record.hasMaskedDebtorBusinessNumber).length,
      maskedSecuredPartyBusinessNumberCount: records.filter((record) => record.hasMaskedSecuredPartyBusinessNumber).length,
      maskedCollateralOwnerBusinessNumberCount: records.filter((record) => record.hasMaskedCollateralOwnerBusinessNumber).length,
      parsedCollateralDistrictCount: records.filter((record) => record.collateralDistrict).length,
      parsedDebtorDistrictCount: records.filter((record) => record.debtorDistrict).length,
      parsedSecuredPartyDistrictCount: records.filter((record) => record.securedPartyDistrict).length,
    },
  };
}

export async function convertMovablePropertySecuredTransactionRecords() {
  const files = await listCsvFiles(directory);
  const warnings: string[] = [];
  const rows = files.length ? await readCsv(files.at(-1)!) : [];
  const records = rows.map((row, index) => makeMovablePropertySecuredTransactionRecord(row, index + 1)).sort((a, b) => (a.registrationApprovalDate ?? '').localeCompare(b.registrationApprovalDate ?? '') || a.registrationNumber.localeCompare(b.registrationNumber));
  const duplicates = records.length - new Set(records.map((record) => record.registrationNumber)).size;
  if (duplicates) warnings.push(`${duplicates} duplicate registration number(s) found`);
  const summary = buildMovablePropertySecuredTransactionSummary(records);
  const latest = records.filter((record) => record.registrationMonthKey === summary.latestRegistrationMonth);
  await writeJson('public/data/movable-property-secured-transaction-records.json', records);
  await writeJson('public/data/movable-property-secured-transaction-summary.json', summary);
  await writeJson('public/data/movable-property-secured-transaction-latest.json', latest);
  try {
    const realEstate = JSON.parse(await readFile('public/data/real-price-summary.json', 'utf8')) as RealEstateSummary;
    realEstate.movablePropertySecuredTransactionRecords = {
      totalRecords: summary.totalRecords,
      latestRegistrationMonth: summary.latestRegistrationMonth,
      totalCollateralAmountNtd: summary.totalCollateralAmountNtd,
      totalSecuredDebtAmountNtd: summary.totalSecuredDebtAmountNtd,
    };
    await writeJson('public/data/real-price-summary.json', realEstate);
  } catch {
    // Optional when run before the main real-estate summary exists.
  }
  await updateConversionReport({
    dataset: source,
    file: files.at(-1) ? basename(files.at(-1)!) : directory,
    status: files.length ? 'converted' : 'missing',
    sourceUrl,
    notes: [`${records.length} normalized records`, 'UTF-8-SIG CSV with Big5/CP950 fallback via readCsv.', 'ROC dates, NTD amounts, source flags, masked identifiers, and districts parsed from source text.', 'No geocoding or exact markers; district summaries only.', 'Financing and collateral context only; not mortgage, credit rating, legal advice, investment advice, or real-time rights status.'],
  }, warnings);
  return { records, summary, latest };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { records } = await convertMovablePropertySecuredTransactionRecords();
  console.log(`movable-property secured transaction records: ${records.length}`);
}

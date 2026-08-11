import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { writeJson } from './data.ts';

const sourceFile = 'data/raw/cadastral-cleanup-land-auction-results.csv';
const outputDirectory = 'public/data/cadastral-cleanup-land-auction-results';
const fields = ['標號', '鄉鎮市區', '段小段', '地號', '面積（平方公尺）', '原登記名義人', '權利範圍', '標售底價金額', '標售總底價金額', '決標金額', '得標人'] as const;
type Field = typeof fields[number];

const clean = (value: string | undefined) => (value ?? '').replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
const parseCsv = (source: string) => source.trimEnd().split(/\r?\n/).slice(1).map((line) => {
  const values = line.split(',');
  return Object.fromEntries(fields.map((field, index) => [field, clean(values[index])])) as Record<Field, string>;
});
const decimal = (value: string, units = '') => {
  const normalized = value.replaceAll(',', '').replace(new RegExp(`[${units}平方公尺㎡m²元NT$\s　]`, 'g'), '');
  return normalized && /^\d+(?:\.\d+)?$/.test(normalized) ? Number(normalized) : null;
};
const money = (value: string) => decimal(value, '新臺幣');
const share = (value: string) => {
  const match = value.match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);
  if (!match || Number(match[2]) === 0) return { numerator: null, denominator: null, ratio: value === '全部' ? 1 : null };
  return { numerator: Number(match[1]), denominator: Number(match[2]), ratio: Number(match[1]) / Number(match[2]) };
};
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);

export async function convertCadastralCleanupLandAuctionResults() {
  const rows = parseCsv(await readFile(sourceFile, 'utf8'));
  let context: Partial<Record<Field, string>> = {};
  const keys = new Map<string, number>();
  const normalized = rows.map((sourceRaw, index) => {
    // The official CSV uses blank cells for visually merged parcel identifiers on continuation rows.
    // Preserve those blank source fields while inheriting only the identifiers needed to group the row.
    const inherited = fields.reduce((result, field) => ({ ...result, [field]: sourceRaw[field] || context[field] || '' }), {} as Record<Field, string>);
    for (const field of ['標號', '鄉鎮市區', '段小段', '地號', '面積（平方公尺）'] as Field[]) if (sourceRaw[field]) context[field] = sourceRaw[field];
    const areaSqm = decimal(sourceRaw['面積（平方公尺）'] || inherited['面積（平方公尺）']);
    const reservePriceTwd = money(sourceRaw['標售底價金額']);
    const totalReservePriceTwd = money(sourceRaw['標售總底價金額']);
    const awardedPriceTwd = money(sourceRaw['決標金額']);
    const rights = share(sourceRaw['權利範圍']);
    const locator = `${inherited['標號']}|${inherited['鄉鎮市區']}|${inherited['段小段']}|${inherited['地號']}`;
    const occurrence = (keys.get(locator) ?? 0) + 1; keys.set(locator, occurrence);
    const id = occurrence === 1 && locator.replaceAll('|', '') ? locator : hash({ sourceRaw, index });
    const priceDifferenceTwd = awardedPriceTwd !== null && totalReservePriceTwd !== null ? awardedPriceTwd - totalReservePriceTwd : null;
    const awardToReserveRatio = awardedPriceTwd !== null && totalReservePriceTwd && totalReservePriceTwd > 0 ? awardedPriceTwd / totalReservePriceTwd : null;
    return {
      id, sourceRowNumber: index + 2, lotNumberRaw: inherited['標號'], districtRaw: inherited['鄉鎮市區'], districtName: inherited['鄉鎮市區'], landSectionRaw: inherited['段小段'], landSection: inherited['段小段'], parcelNumber: inherited['地號'],
      areaSqmRaw: sourceRaw['面積（平方公尺）'], areaSqm, originalRegisteredHolderRaw: sourceRaw['原登記名義人'], rightsShareRaw: sourceRaw['權利範圍'], rightsNumerator: rights.numerator, rightsDenominator: rights.denominator, rightsRatio: rights.ratio,
      reservePriceRaw: sourceRaw['標售底價金額'], reservePriceTwd, totalReservePriceRaw: sourceRaw['標售總底價金額'], totalReservePriceTwd, awardedPriceRaw: sourceRaw['決標金額'], awardedPriceTwd, winningBidderRaw: sourceRaw['得標人'],
      priceDifferenceTwd, awardToReserveRatio, premiumDiscountPct: awardToReserveRatio === null ? null : (awardToReserveRatio - 1) * 100,
      reservePricePerSqm: areaSqm && areaSqm > 0 && totalReservePriceTwd !== null ? totalReservePriceTwd / areaSqm : null,
      awardedPricePerSqm: areaSqm && areaSqm > 0 && awardedPriceTwd !== null ? awardedPriceTwd / areaSqm : null,
      hasValidArea: areaSqm !== null && areaSqm >= 0, hasValidReservePrice: totalReservePriceTwd !== null, hasValidAwardedPrice: awardedPriceTwd !== null,
      sourceRaw, inheritedLocator: Object.fromEntries(['標號', '鄉鎮市區', '段小段', '地號', '面積（平方公尺）'].map((field) => [field, inherited[field as Field]])),
    };
  });
  const unique = <T,>(values: T[]) => [...new Set(values.filter(Boolean))];
  const sum = (values: Array<number | null>) => values.reduce<number>((total, value) => total + (value ?? 0), 0);
  const qualityCounts: Record<string, number> = {};
  const parcelKeys = new Map<string, typeof normalized>();
  normalized.forEach((record) => {
    const issues: Record<string, boolean> = { missingLotNumber: !record.lotNumberRaw, missingDistrict: !record.districtName, missingSection: !record.landSection, missingParcelNumber: !record.parcelNumber, missingOrMalformedArea: !record.hasValidArea, missingRightsShare: !record.rightsShareRaw, malformedFractionalRightsShare: Boolean(record.rightsShareRaw && record.rightsRatio === null), missingReservePrice: !record.reservePriceRaw, missingTotalReservePrice: !record.totalReservePriceRaw, malformedAwardedPrice: Boolean(record.awardedPriceRaw && !record.hasValidAwardedPrice), negativeMoney: [record.reservePriceTwd, record.totalReservePriceTwd, record.awardedPriceTwd].some((value) => value !== null && value < 0), belowReserve: (record.premiumDiscountPct ?? 0) < 0, unusuallyHighAwardRatio: (record.awardToReserveRatio ?? 0) > 3, validPriceZeroArea: Boolean((record.awardedPriceTwd ?? record.totalReservePriceTwd) !== null && record.areaSqm === 0) };
    Object.entries(issues).forEach(([key, value]) => { if (value) qualityCounts[key] = (qualityCounts[key] ?? 0) + 1; });
    const parcelKey = `${record.districtName}|${record.landSection}|${record.parcelNumber}`;
    parcelKeys.set(parcelKey, [...(parcelKeys.get(parcelKey) ?? []), record]);
  });
  qualityCounts.duplicateDistrictSectionParcel = [...parcelKeys.values()].filter((items) => items.length > 1).length;
  await writeJson(`${outputDirectory}/records.json`, normalized);
  await writeJson(`${outputDirectory}/metadata.json`, {
    moduleKey: 'cadastral_cleanup_land_auction_results', dataset: '臺北市地籍清理公告開標結果土地清冊', sourceUrl: 'https://data.taipei/dataset/detail?id=460ff255-8900-40e9-899d-a581115bc421', resourceUpdatedAt: '2026-06-11T15:03:22+08:00', metadataUpdatedAt: '2026-06-11T15:36:06+08:00', ingestionTimestamp: new Date().toISOString(), totalRecords: normalized.length, districtList: unique(normalized.map((record) => record.districtName)), sectionList: unique(normalized.map((record) => record.landSection)), totalParsedAreaSqm: sum(normalized.map((record) => record.areaSqm)), validReservePriceCount: normalized.filter((record) => record.hasValidReservePrice).length, validAwardedPriceCount: normalized.filter((record) => record.hasValidAwardedPrice).length, qualityCounts,
    reservePriceFieldInterpretation: 'The resource lists 「標售底價金額」 for each source row and 「標售總底價金額」 only on the first row for an auction parcel. In this release, the total-reserve field is used as the derived-comparison denominator only when it is present and positive; continuation rows remain separate source records and do not receive an inferred total.',
    privacy: 'Original registered-holder and winning-bidder values are official public source fields. They are displayed only in the detailed source table, are not enriched, profiled, ranked, or used in headline KPIs.',
  });
  return normalized;
}

if (process.argv[1]?.endsWith('convertCadastralCleanupLandAuctionResults.ts')) console.log((await convertCadastralCleanupLandAuctionResults()).length);

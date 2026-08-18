import { createHash } from 'node:crypto';
import { getColumn, listCsvFiles, parseNumber, parsePercentValue, readCsv, updateConversionReport, writeJson, type CsvRow } from './data.ts';

export type MrtAuctionPropertyRecord = {
  id: string; sequenceRaw: string; locationCode: string; address: string; buildingNumber: string; landDistrict: string; landSection: string; landParcel: string;
  houseLandShareRaw: string; parkingLandShareRaw: string; totalLandShareRaw: string; mainBuildingAreaSqm: number | null; balconyAreaSqm: number | null; awningAreaSqm: number | null; sourceTotalAreaSqm: number | null; commonAreaExcludingParkingSqm: number | null;
  propertyAreaSqm: number | null; propertyAreaPing: number | null; publicAreaRatio: number | null; reservePriceNtd: number | null; bidDepositNtd: number | null; reservePricePerPing: number | null; depositRatio: number | null; parkingDescription: string; normalizedParkingType: 'with_parking' | 'without_parking' | 'unknown'; sourceRaw: CsvRow;
};

const value = (row: CsvRow, names: string[]) => getColumn(row, names)?.trim() ?? '';
const numeric = (row: CsvRow, names: string[]) => parseNumber(value(row, names)) ?? null;
const positive = (input: number | null) => input !== null && input > 0 ? input : null;
const median = (values: Array<number | null>) => { const items = values.filter((value): value is number => value !== null).sort((a, b) => a - b); if (!items.length) return null; const center = Math.floor(items.length / 2); return items.length % 2 ? items[center] : (items[center - 1] + items[center]) / 2; };
const average = (values: Array<number | null>) => { const items = values.filter((value): value is number => value !== null); return items.length ? items.reduce((sum, item) => sum + item, 0) / items.length : null; };
export const classifyParking = (raw: string): MrtAuctionPropertyRecord['normalizedParkingType'] => !raw.trim() ? 'unknown' : /無車位|不含車位/.test(raw) ? 'without_parking' : /車位/.test(raw) ? 'with_parking' : 'unknown';

export function convertMrtJointDevelopmentAuctionPropertyRows(rows: CsvRow[]): MrtAuctionPropertyRecord[] {
  const seen = new Map<string, number>();
  return rows.map((sourceRaw, index) => {
    const sequenceRaw = value(sourceRaw, ['序號']); const locationCode = value(sourceRaw, ['區位代號']); const address = value(sourceRaw, ['門牌號碼']);
    const propertyAreaPing = positive(numeric(sourceRaw, ['產權面積坪'])); const reservePriceNtd = positive(numeric(sourceRaw, ['標售底價 核定金額', '標售底價新台幣元'])); const bidDepositNtd = positive(numeric(sourceRaw, ['應繳押標金 核定金額', '應繳押標金新台幣元']));
    const publicAreaRaw = parsePercentValue(value(sourceRaw, ['公設百分比%'])); const publicAreaRatio = publicAreaRaw !== undefined && publicAreaRaw >= 0 && publicAreaRaw <= 100 ? publicAreaRaw : null;
    const key = `${sequenceRaw}|${locationCode}|${address}`; const duplicate = seen.get(key) ?? 0; seen.set(key, duplicate + 1);
    const parkingDescription = value(sourceRaw, ['車位說明']);
    return { id: duplicate ? `mrt-auction-${index + 1}-${duplicate}` : `mrt-auction-${sequenceRaw || createHash('sha1').update(JSON.stringify(sourceRaw)).digest('hex').slice(0, 10)}`,
      sequenceRaw, locationCode, address, buildingNumber: value(sourceRaw, ['建號']), landDistrict: value(sourceRaw, ['土地座落區號']), landSection: value(sourceRaw, ['土地座落段號']), landParcel: value(sourceRaw, ['土地座落地號']), houseLandShareRaw: value(sourceRaw, ['房屋土地持分比']), parkingLandShareRaw: value(sourceRaw, ['車位土地持分比']), totalLandShareRaw: value(sourceRaw, ['土地持分比合計']), mainBuildingAreaSqm: positive(numeric(sourceRaw, ['主建物面積㎡'])), balconyAreaSqm: positive(numeric(sourceRaw, ['陽台'])), awningAreaSqm: positive(numeric(sourceRaw, ['雨遮'])), sourceTotalAreaSqm: positive(numeric(sourceRaw, ['合計'])), commonAreaExcludingParkingSqm: positive(numeric(sourceRaw, ['共用面積不含車公㎡'])), propertyAreaSqm: positive(numeric(sourceRaw, ['產權面積 平方公尺', '產權面積㎡'])), propertyAreaPing, publicAreaRatio, reservePriceNtd, bidDepositNtd, reservePricePerPing: reservePriceNtd && propertyAreaPing ? reservePriceNtd / propertyAreaPing : null, depositRatio: reservePriceNtd && bidDepositNtd ? bidDepositNtd / reservePriceNtd : null, parkingDescription, normalizedParkingType: classifyParking(parkingDescription), sourceRaw };
  });
}

export function buildMrtJointDevelopmentAuctionPropertySummary(records: MrtAuctionPropertyRecord[]) {
  const valid = records.filter((record) => record.reservePriceNtd && record.propertyAreaPing);
  const locations = [...new Set(records.map((record) => record.locationCode).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  const byLocation = locations.map((locationCode) => { const rows = records.filter((record) => record.locationCode === locationCode); return { locationCode, recordCount: rows.length, medianPropertyAreaPing: median(rows.map((r) => r.propertyAreaPing)), medianReservePriceNtd: median(rows.map((r) => r.reservePriceNtd)), medianReservePricePerPing: median(rows.map((r) => r.reservePricePerPing)), medianPublicAreaRatio: median(rows.map((r) => r.publicAreaRatio)) }; }).sort((a, b) => (b.medianReservePricePerPing ?? -1) - (a.medianReservePricePerPing ?? -1));
  return { recordCount: records.length, validPriceAreaCount: valid.length, locationCount: locations.length, averageReservePriceNtd: average(records.map((r) => r.reservePriceNtd)), medianReservePriceNtd: median(records.map((r) => r.reservePriceNtd)), averagePropertyAreaPing: average(records.map((r) => r.propertyAreaPing)), averageReservePricePerPing: average(records.map((r) => r.reservePricePerPing)), medianReservePricePerPing: median(records.map((r) => r.reservePricePerPing)), averagePublicAreaRatio: average(records.map((r) => r.publicAreaRatio)), medianPublicAreaRatio: median(records.map((r) => r.publicAreaRatio)), minPublicAreaRatio: Math.min(...records.map((r) => r.publicAreaRatio ?? Infinity)), maxPublicAreaRatio: Math.max(...records.map((r) => r.publicAreaRatio ?? -Infinity)), averageBidDepositNtd: average(records.map((r) => r.bidDepositNtd)), medianBidDepositNtd: median(records.map((r) => r.bidDepositNtd)), medianDepositRatio: median(records.map((r) => r.depositRatio)), byLocation, dataQuality: { duplicateKeyCount: records.length - new Set(records.map((r) => `${r.sequenceRaw}|${r.locationCode}|${r.address}`)).size, nonPositiveReservePriceCount: records.filter((r) => !r.reservePriceNtd).length, nonPositivePropertyAreaCount: records.filter((r) => !r.propertyAreaPing).length, invalidPublicAreaRatioCount: records.filter((r) => r.sourceRaw['公設百分比%'] && r.publicAreaRatio === null).length, missingAddressCount: records.filter((r) => !r.address).length, missingLocationCodeCount: records.filter((r) => !r.locationCode).length, sqmPingInconsistencyCount: records.filter((r) => r.propertyAreaSqm && r.propertyAreaPing && Math.abs(r.propertyAreaSqm / r.propertyAreaPing - 3.305785) / 3.305785 > 0.05).length } };
}

export async function convertMrtJointDevelopmentAuctionProperties() {
  const file = (await listCsvFiles('data/raw/mrt-joint-development-auction-properties')).at(-1); const records = convertMrtJointDevelopmentAuctionPropertyRows(file ? await readCsv(file) : []); const summary = buildMrtJointDevelopmentAuctionPropertySummary(records);
  await writeJson('public/data/mrt-joint-development-auction-properties/records.json', records); await writeJson('public/data/mrt-joint-development-auction-properties/summary.json', summary); await writeJson('public/data/mrt-joint-development-auction-properties/metadata.json', { sourceUrl: 'https://data.taipei/dataset/detail?id=9527ea34-7c55-4c23-9f0e-80164f888f06', sourceAgency: '臺北市政府捷運工程局', coverageStart: '2016-04-26', coverageEnd: '2023-06-16', sourceUpdatedAt: '2023-07-14T18:27:48+08:00', updateFrequency: 'irregular', dataStatus: 'historical', ...summary });
  await updateConversionReport({ dataset: '臺北捷運聯合開發公有不動產標售物件資料', file: file ?? '', sourceUrl: 'https://data.taipei/dataset/detail?id=9527ea34-7c55-4c23-9f0e-80164f888f06', status: file ? 'converted' : 'missing', notes: ['Reserve price per ping is derived from reserve price and property-area ping; it is not a transaction price.'] }); return records;
}
if (process.argv[1]?.endsWith('convertMrtJointDevelopmentAuctionProperties.ts')) console.log((await convertMrtJointDevelopmentAuctionProperties()).length);

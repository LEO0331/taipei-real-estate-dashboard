import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateRealPriceByDistrict,
  aggregatePopulationRows,
  buildResidentialRentIndexSummary,
  classifyBuildingType,
  classifyRealPriceRecordType,
  classifyResidentialRentIndexCategory,
  convertResidentialRentIndexRows,
  normalizeDistrict,
  parseCsv,
  parseNumber,
  parseRentIndexPeriod,
  parseTaiwanDate,
  sqmToPing,
} from './data.ts';

test('parses quoted CSV fields with commas and escaped quotes', () => {
  assert.deepEqual(parseCsv('a,b\n"x,y","say ""hi"""'), [
    { a: 'x,y', b: 'say "hi"' },
  ]);
});

test('normalizes Taipei district aliases', () => {
  assert.equal(normalizeDistrict('臺北市大安'), '大安區');
  assert.equal(normalizeDistrict('63000040 松山區'), '松山區');
  assert.equal(normalizeDistrict('新北市板橋區'), undefined);
});

test('parses ROC and Gregorian dates', () => {
  assert.deepEqual(parseTaiwanDate('113年05月'), {
    date: '2024-05',
    year: 2024,
    month: 5,
    quarter: '2024-Q2',
  });
  assert.equal(parseTaiwanDate('1150121').date, '2026-01-21');
  assert.equal(parseTaiwanDate('2024/05').quarter, '2024-Q2');
  assert.ok(parseTaiwanDate('n/a').warning);
});

test('parses formatted numbers and converts square metres to ping', () => {
  assert.equal(parseNumber('NT$ 1,234.5'), 1234.5);
  assert.equal(parseNumber('-'), undefined);
  assert.equal(Number(sqmToPing(3.305785).toFixed(6)), 1);
});

test('classifies building and record types', () => {
  assert.equal(classifyBuildingType('住宅大樓(11層含以上有電梯)'), 'elevator_building');
  assert.equal(classifyBuildingType('公寓(5樓含以下無電梯)'), 'apartment');
  assert.equal(classifyRealPriceRecordType('租賃'), 'rent');
  assert.equal(classifyRealPriceRecordType('買賣'), 'sale');
});

test('parses residential rent index periods, numbers, and categories', () => {
  assert.equal(classifyResidentialRentIndexCategory('全市'), 'citywide');
  assert.deepEqual(parseRentIndexPeriod('107Q3'), {
    periodRaw: '107Q3',
    rocYear: 107,
    year: 2018,
    quarter: 3,
    quarterKey: '2018-Q3',
  });
  assert.equal(parseRentIndexPeriod('2025-Q4').quarterKey, '2025-Q4');
  const [record] = convertResidentialRentIndexRows([
    { 住宅租金指數類別: '全市', 期別: '114Q4', 季指數: '108.78', 季變動率: '1.42', '標準租金單價（新台幣元每坪每月）': '1,444' },
  ]);
  assert.equal(record.quarterKey, '2025-Q4');
  assert.equal(record.quarterlyChangeRatePercent, 1.42);
  assert.equal(record.standardRentUnitPriceNtdPerPingMonthly, 1444);
});

test('derives residential rent index year-over-year metrics and skips duplicates', () => {
  const warnings: string[] = [];
  const records = convertResidentialRentIndexRows([
    { 住宅租金指數類別: '全市', 期別: '113Q4', 季指數: '100', 季變動率: '-', '標準租金單價（新台幣元每坪每月）': '1,000' },
    { 住宅租金指數類別: '全市', 期別: '114Q4', 季指數: '110', 季變動率: '1.5', '標準租金單價（新台幣元每坪每月）': '1,100' },
    { 住宅租金指數類別: '全市', 期別: '114Q4', 季指數: '111', 季變動率: '2', '標準租金單價（新台幣元每坪每月）': '1,111' },
  ], warnings);
  assert.equal(records.length, 2);
  assert.match(warnings.join('\n'), /Duplicate/);
  assert.equal(records[1].previousYearSameQuarterKey, '2024-Q4');
  assert.equal(records[1].yearOverYearRentIndexChangePercent, 10);
  assert.equal(records[1].yearOverYearStandardRentUnitPriceChangePercent, 10);
  const summary = buildResidentialRentIndexSummary(records);
  assert.equal(summary.latestQuarterKey, '2025-Q4');
  assert.equal(summary.latestByCategory[0].quarterlyChangeRatePercent, 1.5);
});

test('aggregates district population without double-counting sex rows', () => {
  const rows = [
    { 年份: '112', 月份: '3', 區域別: '大安區', 性別: '計', 總計: '100', '0歲數量': '10', '20歲數量': '50', '65歲數量': '40' },
    { 年份: '112', 月份: '3', 區域別: '大安區', 性別: '男', 總計: '48', '0歲數量': '5', '20歲數量': '23', '65歲數量': '20' },
    { 年份: '112', 月份: '3', 區域別: '大安區', 性別: '女', 總計: '52', '0歲數量': '5', '20歲數量': '27', '65歲數量': '20' },
  ];
  const [summary] = aggregatePopulationRows(rows);
  assert.equal(summary.totalPopulation, 100);
  assert.equal(summary.age0To14, 10);
  assert.equal(summary.age20To34, 50);
  assert.equal(summary.age65Plus, 40);
});

test('district sale-price medians exclude rental prices', () => {
  const [summary] = aggregateRealPriceByDistrict([
    { id: 'sale', district: '中正區', recordType: 'sale', buildingType: 'apartment', totalPriceNtd: 20_000_000, unitPricePerPingNtd: 800_000, source: 'test' },
    { id: 'rent', district: '中正區', recordType: 'rent', buildingType: 'apartment', totalPriceNtd: 30_000, unitPricePerPingNtd: 1_500, source: 'test' },
  ]);
  assert.equal(summary.transactionCount, 2);
  assert.equal(summary.medianTotalPriceNtd, 20_000_000);
  assert.equal(summary.medianUnitPricePerPingNtd, 800_000);
});

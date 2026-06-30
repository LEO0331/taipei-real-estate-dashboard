import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateRealPriceByDistrict,
  aggregatePopulationRows,
  buildCommercialOfficeRentIndexSummary,
  buildResidentialRentIndexSummary,
  buildResidentialPriceMonthlyIndexSummary,
  classifyBuildingType,
  classifyCommercialOfficeRentIndexCategory,
  classifyRealPriceRecordType,
  classifyResidentialRentIndexCategory,
  classifyResidentialPriceIndexCategory,
  classifyResidentialPriceQuarterlyCategory,
  convertResidentialRentIndexRows,
  convertCommercialOfficeRentIndexRows,
  convertResidentialPriceMonthlyIndexRows,
  convertResidentialPriceQuarterlyIndexRows,
  normalizeDistrict,
  parseCsv,
  parseNumber,
  parseRentIndexPeriod,
  parseRocQuarter,
  parseRocYearMonth,
  parseTaiwanDate,
  sqmToPing,
} from './data.ts';
import { classifyMovablePropertyPledgeItemCategory, parseCaseCount, parseNtdAmount, parseYearFromResourceName } from './convertMovablePropertyPledgeBusinessStatistics.ts';
import { normalizeIncomeDistrict, parseNtdValue, parseRocYear as parseIncomeRocYear } from './convertIncomePerEarnerByDistrictYear.ts';

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

test('parses movable-property pledge business helper fields', () => {
  assert.deepEqual(parseYearFromResourceName('臺北市動產質借處營業概況-112年度.csv'), { rocYear: 112, dataYear: 2023 });
  assert.equal(parseCaseCount('57,001件'), 57001);
  assert.equal(parseNtdAmount('3,042,552,100元'), 3042552100);
  assert.equal(parseNtdAmount('--'), undefined);
  assert.equal(classifyMovablePropertyPledgeItemCategory('計'), 'total');
  assert.equal(classifyMovablePropertyPledgeItemCategory('黃金'), 'gold_jewelry');
});

test('parses income per earner helper fields', () => {
  assert.deepEqual(parseIncomeRocYear('113年'), { rocYear: 113, dataYear: 2024 });
  assert.equal(parseNtdValue('892,650'), 892650);
  assert.equal(parseNtdValue('-'), undefined);
  assert.deepEqual(normalizeIncomeDistrict(' 大安區'), { district: '大安區', districtNormalized: '大安區', isCityAverage: false });
  assert.deepEqual(normalizeIncomeDistrict(' 總平均'), { district: undefined, districtNormalized: '總平均', isCityAverage: true });
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

test('parses residential price monthly index rows and derives metrics', () => {
  assert.equal(classifyResidentialPriceIndexCategory('全市小宅'), 'citywide_small_unit');
  assert.equal(parseRocYearMonth('101/08').period, '2012-08');
  assert.equal(parseRocYearMonth('115/02').periodDate, '2026-02-01');
  const warnings: string[] = [];
  const records = convertResidentialPriceMonthlyIndexRows([
    { 住宅價格月指數類別: '全市', 期別: '101/08', 月指數: '100', 季移動平均數: '-', 半年移動平均數: '-', '月指數變動率(%)': '0%', '標準住宅總價（新台幣萬元）': '1,000', '標準住宅單價（新台幣萬元每坪）': '50' },
    { 住宅價格月指數類別: '全市', 期別: '102/08', 月指數: '110', 季移動平均數: '108', 半年移動平均數: '106', '月指數變動率(%)': '1.23%', '標準住宅總價（新台幣萬元）': '1,100', '標準住宅單價（新台幣萬元每坪）': '55' },
    { 住宅價格月指數類別: '全市', 期別: '102/08', 月指數: '111' },
  ], warnings);
  assert.equal(records.length, 2);
  assert.match(warnings.join('\n'), /Duplicate/);
  assert.equal(records[0].period, '2012-08');
  assert.equal(records[0].threeMonthMovingAverageIndex, undefined);
  assert.equal(records[1].monthlyIndexChangePercent, 1.23);
  assert.equal(records[1].standardTotalPriceNtd, 11_000_000);
  assert.equal(records[1].standardUnitPriceNtdPerPing, 550_000);
  assert.equal(Number(records[1].yearOverYearMonthlyIndexChangePercent?.toFixed(2)), 10);
  assert.equal(Number(records[1].indexFromStartChangePercent?.toFixed(2)), 10);
  const summary = buildResidentialPriceMonthlyIndexSummary(records);
  assert.equal(summary.latestPeriod, '2013-08');
  assert.equal(summary.latestByCategory[0].monthlyIndex, 110);
});

test('parses residential price quarterly index rows and ranks districts', () => {
  assert.equal(classifyResidentialPriceQuarterlyCategory('全市小宅').housingType, 'small_unit');
  assert.equal(classifyResidentialPriceQuarterlyCategory('大安區').district, '大安區');
  const records = convertResidentialPriceQuarterlyIndexRows([
    { 宅價格季指數類別: '全市', 期別: '113Q4', 季指數: '130', 季指數變動率: '1%', '標準住宅總價（新台幣萬元）': '2,000', '標準住宅單價（新台幣萬元每坪）': '60' },
    { 宅價格季指數類別: '全市', 期別: '114Q4', 季指數: '126.88', 季指數變動率: '-0.02%', '標準住宅總價（新台幣萬元）': '2,010', '標準住宅單價（新台幣萬元每坪）': '64.84' },
    { 宅價格季指數類別: '大安區', 期別: '114Q4', 季指數: '120', 季指數變動率: '0.1%', '標準住宅總價（新台幣萬元）': '3,000', '標準住宅單價（新台幣萬元每坪）': '94.75' },
    { 宅價格季指數類別: '北投區', 期別: '114Q4', 季指數: '110', 季指數變動率: '-0.1%', '標準住宅總價（新台幣萬元）': '1,500', '標準住宅單價（新台幣萬元每坪）': '51.26' },
  ]);
  const citywide = records.find((record) => record.category === '全市' && record.quarterKey === '2025-Q4');
  assert.equal(citywide?.quarterStartDate, '2025-10-01');
  assert.equal(citywide?.quarterlyChangePercent, -0.02);
  assert.equal(Number(citywide?.quarterlyIndexYoYChangePercent?.toFixed(2)), -2.4);
  assert.equal(records.find((record) => record.district === '大安區')?.districtRankByStandardUnitPrice, 1);
});

test('parses commercial office rent index rows and derives premium metrics', () => {
  assert.equal(classifyCommercialOfficeRentIndexCategory('主要路段'), 'major_roads');
  assert.equal(parseRocQuarter('103Q2').period, '2014Q2');
  assert.equal(parseRocQuarter('114Q4').periodDate, '2025-10-01');
  const warnings: string[] = [];
  const records = convertCommercialOfficeRentIndexRows([
    { 商辦租金指數類別: '全市', 期別: '103Q2', 季指數: '100', '季變動率（%）': '-', '標準租金單價（元/坪/月）': '1,000' },
    { 商辦租金指數類別: '主要路段', 期別: '103Q2', 季指數: '110', '季變動率（%）': '-', '標準租金單價（元/坪/月）': '2,000' },
    { 商辦租金指數類別: '全市', 期別: '104Q2', 季指數: '105', '季變動率（%）': '1.15', '標準租金單價（元/坪/月）': '1,100' },
    { 商辦租金指數類別: '主要路段', 期別: '104Q2', 季指數: '121', '季變動率（%）': '1.2%', '標準租金單價（元/坪/月）': '2,200' },
    { 商辦租金指數類別: '全市', 期別: '104Q2', 季指數: '106' },
  ], warnings);
  assert.equal(records.length, 4);
  assert.match(warnings.join('\n'), /Duplicate/);
  assert.equal(records[0].quarterlyChangePercent, undefined);
  const citywideLatest = records.find((record) => record.category === 'citywide' && record.period === '2015Q2');
  const majorRoadLatest = records.find((record) => record.category === 'major_roads' && record.period === '2015Q2');
  assert.equal(citywideLatest?.quarterlyChangePercent, 1.15);
  assert.equal(citywideLatest?.yearOverYearQuarterlyIndexChangePercent, 5);
  assert.equal(majorRoadLatest?.rentGapNtdPerPingPerMonth, 1100);
  assert.equal(majorRoadLatest?.rentGapPercent, 100);
  const summary = buildCommercialOfficeRentIndexSummary(records);
  assert.equal(summary.latestPeriod, '2015Q2');
  assert.equal(summary.latestMajorRoadPremium?.rentGapNtdPerPingPerMonth, 1100);
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

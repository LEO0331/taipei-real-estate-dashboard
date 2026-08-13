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
import { classifyMovableCollateralType, classifySecuredTransactionType, makeMovablePropertySecuredTransactionRecord, parseRocDate } from './convertMovablePropertySecuredTransactionRecords.ts';
import { classifySubjectType, makeRealEstateBrokerPenaltyRecord, parsePenaltyAmount } from './convertRealEstateBrokerPenalties.ts';
import { makeMunicipalIdlePropertyLeaseTenderRecord } from './convertMunicipalIdlePropertyLeaseTenders.ts';
import { normalizeIncomeDistrict, parseNtdValue, parseRocYear as parseIncomeRocYear } from './convertIncomePerEarnerByDistrictYear.ts';
import { classifyConsumerPriceGroup, classifyConsumerPriceLevel, makeConsumerPriceBasicAnnualIndexRecord, parseAnnualChangePercent, parseRocYear as parseCpiRocYear } from './convertConsumerPriceBasicAnnualIndex.ts';
import { classifyAnnualTrend, convertTaipowerTaipeiElectricitySalesRows, parseIntegerMetric, parseTaipeiElectricityPeriod, safeShare, thousandKwhToKwh } from './convertTaipowerTaipeiElectricitySales.ts';
import { calculatePaymentPeriodDayCount, classifyLandValueTaxPeriod, convertLandValueTaxProgressiveBracketRows, parseFlatLandTaxFormula, parseGeneralLandTaxFormula, parseLandValueTaxPaymentDate, parseLandValueTaxRocYear } from './convertLandValueTaxProgressiveBrackets.ts';
import { classifyDevelopmentIntensity, classifyLandUseZoningCategory, convertLandUseZoningControlRows, parsePercentRatio, parseTaipeiDistrictName } from './convertLandUseZoningControlSummary.ts';
import { buildUrbanRenewalRegulationsSummary, convertUrbanRenewalRegulationRows, parseRocDate as parseUrbanRenewalRocDate, stableRegulationId } from './convertUrbanRenewalRegulations.ts';
import { buildMunicipalPropertyPortfolioSummary, convertMunicipalPropertyPortfolioRows, parsePortfolioAmount, parsePortfolioMonth, parsePortfolioYear } from './convertMunicipalPropertyPortfolio.ts';
import { buildCivilEngineeringPriceSummary, convertCivilEngineeringPriceRows, parseCivilNumber, parseCivilPeriod } from './convertCivilEngineeringPriceIndex.ts';

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

test('parses movable-property secured transaction helper fields', () => {
  assert.deepEqual(parseRocDate('0901102'), { raw: '0901102', date: '2001-11-02', year: 2001, month: 11 });
  assert.deepEqual(parseRocDate('1150601'), { raw: '1150601', date: '2026-06-01', year: 2026, month: 6 });
  assert.equal(classifySecuredTransactionType('動產抵押'), 'movable_property_mortgage');
  assert.equal(classifySecuredTransactionType('附條件買賣'), 'conditional_sale');
  assert.equal(classifyMovableCollateralType('機器設備或工具'), 'machinery_equipment_or_tools');
  const record = makeMovablePropertySecuredTransactionRecord({
    登記編號: '動3336', 登記核准日期: '0901102', 擔保類別: '動產抵押', 契約啟始日期: '0901031', 契約終止日期: '1051031',
    債務人名稱: '勤鑫實業有限公司', 債務人統編: '**********', 債務人住居所或營業所: '台北市中正區金華街十八之六號四樓之一',
    擔保權人名稱: '太平洋電線電纜股份有限公司', 擔保權人統編: '**********', 擔保權人住居所或營業所: '台北市大安區忠孝東路四段二八五號四樓',
    標的物種類: '機器設備或工具', 標的物所在地: '中正區金華街十八之六號四樓之一', 標的物總金額: '49400000.0000', 標的物價格幣別: 'NTD',
    擔保債權金額: '30000000.0000', 擔保債權金額幣別: 'NTD', 最高限額註記: 'N', 動產明細項數: '1', 浮動擔保註記: 'N',
  }, 1);
  assert.equal(record.registrationApprovalDate, '2001-11-02');
  assert.equal(record.collateralAmountNtd, 49400000);
  assert.equal(record.securedDebtAmountNtd, 30000000);
  assert.equal(record.hasMaskedDebtorBusinessNumber, true);
  assert.equal(record.debtorDistrict, '中正區');
});

test('normalizes real-estate brokerage penalty source fields without status inference', () => {
  assert.equal(parsePenaltyAmount('新臺幣 1,200 元'), 1200);
  assert.equal(parsePenaltyAmount('罰鍰 NT$ 50,000'), 50000);
  assert.equal(parsePenaltyAmount('--'), undefined);
  assert.equal(classifySubjectType('示範不動產有限公司'), 'brokerage');
  assert.equal(classifySubjectType('王小明'), 'individual');
  const result = makeRealEstateBrokerPenaltyRecord({
    縣市: '臺北市', 處分日期: '113.05.20', '經紀業/姓名': '示範不動產有限公司', 處罰金額: '新臺幣 50,000 元', 違反規定: '違反不動產經紀業管理條例第21條第2項',
  }, 1);
  assert.equal(result.record?.dispositionDate, '2024-05-20');
  assert.equal(result.record?.penaltyAmount, 50000);
  assert.equal(result.record?.subjectType, 'brokerage');
  assert.equal(result.record?.violationRuleRaw, '違反不動產經紀業管理條例第21條第2項');
});

test('parses income per earner helper fields', () => {
  assert.deepEqual(parseIncomeRocYear('113年'), { rocYear: 113, dataYear: 2024 });
  assert.equal(parseNtdValue('892,650'), 892650);
  assert.equal(parseNtdValue('-'), undefined);
  assert.deepEqual(normalizeIncomeDistrict(' 大安區'), { district: '大安區', districtNormalized: '大安區', isCityAverage: false });
  assert.deepEqual(normalizeIncomeDistrict(' 總平均'), { district: undefined, districtNormalized: '總平均', isCityAverage: true });
});

test('parses annual CPI helper fields without relying on ordinal prefixes', () => {
  assert.deepEqual(parseCpiRocYear('114年'), { yearRaw: '114年', rocYear: 114, year: 2025 });
  assert.equal(parseAnnualChangePercent('1.71%').annualChangePercent, 1.71);
  assert.equal(parseAnnualChangePercent('--').annualChangePercent, undefined);
  assert.equal(classifyConsumerPriceLevel('一.食物類'), 'main_category');
  assert.equal(classifyConsumerPriceLevel('(一)房租'), 'sub_category');
  assert.equal(classifyConsumerPriceGroup('(一)房租'), 'housing');
  const record = makeConsumerPriceBasicAnnualIndexRecord({
    縣市別代碼: '63000',
    年別: '114年',
    基本分類: '(一)房租',
    '原始值[統計數值]': '109.42',
    '年增率[%]': '2.25%',
  }, 'sample.csv', 1, []);
  assert.equal(record?.year, 2025);
  assert.equal(record?.classificationKey, 'rent');
  assert.equal(record?.indexValue, 109.42);
  assert.equal(record?.annualChangePercent, 2.25);
});

test('parses Taipower Taipei electricity helper fields and annual trends', () => {
  assert.deepEqual(parseTaipeiElectricityPeriod('57年'), {
    raw: '57年',
    rocYear: 57,
    gregorianYear: 1968,
    periodLabelZh: '民國57年',
    periodLabelEn: '1968',
  });
  assert.equal(parseTaipeiElectricityPeriod('2025').rocYear, 114);
  assert.equal(parseIntegerMetric('0'), 0);
  assert.equal(parseIntegerMetric('1,242,655'), 1242655);
  assert.equal(thousandKwhToKwh(16105223), 16105223000);
  assert.equal(safeShare(25, 100), 0.25);
  assert.equal(classifyAnnualTrend(-1), 'decrease');
  const records = convertTaipowerTaipeiElectricitySalesRows([
    { 統計期: '113年', '總用戶數[戶]': '1200000', '總用電量[千度]': '1000', '每用戶用電量[度]': '10', '電燈用戶數[戶]': '1100000', '電燈用電量[千度]': '400', '電力用戶數[戶]': '100000', '電力用電量[千度]': '600', '台電自用用電量[千度]': '0' },
    { 統計期: '114年', '總用戶數[戶]': '1242655', '總用電量[千度]': '16105223', '每用戶用電量[度]': '13016', '電燈用戶數[戶]': '1218794', '電燈用電量[千度]': '7782781', '電力用戶數[戶]': '23861', '電力用電量[千度]': '8322442', '台電自用用電量[千度]': '0' },
  ]);
  assert.equal(records[1].gregorianYear, 2025);
  assert.equal(records[1].totalElectricitySalesKwh, 16105223000);
  assert.equal(records[1].totalElectricitySalesYearOverYearChange, 16104223);
  assert.equal(records[1].totalElectricitySalesTrendDirection, 'increase');
  assert.equal(records[1].isLatestRecord, true);
});

test('parses land value tax bracket formulas and annual trends', () => {
  assert.deepEqual(parseLandValueTaxRocYear('114'), { raw: '114', rocYear: 114, gregorianYear: 2025 });
  assert.equal(classifyLandValueTaxPeriod('上期'), 'first_period');
  assert.equal(parseLandValueTaxPaymentDate('20251130').date, '2025-11-30');
  assert.equal(calculatePaymentPeriodDayCount('2025-11-01', '2025-11-30'), 30);
  const formula = `(課稅地價×稅率–累進差額)＝應納稅額
(1)42,165,000以下×10/1000＝應納稅額
(2)42,165,001~252,990,000×15/1000–210,825＝應納稅額
(3)885,465,001以上×55/1000–22,979,925＝應納稅額`;
  const parsed = parseGeneralLandTaxFormula(formula);
  assert.equal(parsed.bracketCount, 3);
  assert.equal(parsed.progressiveStartingPointLandValue, 42165000);
  assert.equal(parsed.highestRatePermille, 55);
  assert.equal(parsed.highestBracketLowerBound, 885465001);
  assert.equal(parseFlatLandTaxFormula('課稅地價×2/1000=應納稅額').ratePermille, 2);
  const records = convertLandValueTaxProgressiveBracketRows([
    { 年度: '113', 年期: '全年', 繳納期間起日: '20241101', 繳納期間迄日: '20241130', 一般土地地價稅計算公式: formula.replaceAll('42,165,000', '40,000,000'), 自用住宅用地地價稅計算公式: '課稅地價×2/1000=應納稅額', 工業用地地價稅計算公式: '課稅地價×10/1000=應納稅額', 公共設施保留地地價稅計算公式: '課稅地價×6/1000=應納稅額' },
    { 年度: '114', 年期: '全年', 繳納期間起日: '20251101', 繳納期間迄日: '20251130', 一般土地地價稅計算公式: formula, 自用住宅用地地價稅計算公式: '課稅地價×2/1000=應納稅額', 工業用地地價稅計算公式: '課稅地價×10/1000=應納稅額', 公共設施保留地地價稅計算公式: '課稅地價×6/1000=應納稅額' },
  ]);
  assert.equal(records[1].gregorianYear, 2025);
  assert.equal(records[1].paymentPeriodDayCount, 30);
  assert.equal(records[1].generalLandTaxBracketCount, 3);
  assert.equal(records[1].industrialLandTaxRatePermille, 10);
  assert.equal(records[1].yearOverYearProgressiveStartingPointChange, 2165000);
  assert.equal(records[1].isLatestRecord, true);
});

test('parses land-use zoning controls and preserves missing ratios', () => {
  assert.deepEqual(parseTaipeiDistrictName('台北市大安區').districtNameNormalized, '大安區');
  assert.equal(parseTaipeiDistrictName('大安區').isTaipeiDistrict, true);
  assert.equal(classifyLandUseZoningCategory('第三種住宅區'), 'residential');
  assert.equal(classifyLandUseZoningCategory('變電所用地'), 'utility_infrastructure');
  assert.deepEqual(parsePercentRatio('', '建蔽率/百分比'), { hasValue: false, warning: undefined });
  assert.equal(parsePercentRatio('0', '容積率上限/百分比').decimal, 0);
  assert.equal(classifyDevelopmentIntensity(800), 'very_high');
  const records = convertLandUseZoningControlRows([
    { 行政區: '中山區', 分區: '第三種住宅區', 筆數: '471', '建蔽率/百分比': '45', '容積率上限/百分比': '225', '面積/平方公尺': '1,579,600.5' },
    { 行政區: '中山區', 分區: '公園用地', 筆數: '10', '建蔽率/百分比': '', '容積率上限/百分比': '', '面積/平方公尺': '10000' },
  ]);
  assert.equal(records[0].buildingCoverageRatioDecimal, 0.45);
  assert.equal(records[0].estimatedMaxFloorAreaSquareMeters, 3554101.125);
  assert.equal(records[1].hasFloorAreaRatioUpperLimit, false);
  assert.equal(records[1].areaShareWithinDistrict, 10000 / 1589600.5);
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

test('converts municipal idle-property tenders without turning blanks into zero', () => {
  const { record } = makeMunicipalIdlePropertyLeaseTenderRecord({ 序號: '1', 案件: '測試案', 年度: '114', '建物門牌/地號': '臺北市中正區仁愛路一段1號', '出租面積_㎡': '100', '標租底價_元': '1,000', '得標價_元': '1,250' }, 1);
  assert.equal(record.year, 2025);
  assert.equal(record.premiumAmount, 250);
  assert.equal(record.premiumRate, 0.25);
  assert.equal(record.awardedRentPerSquareMeter, 12.5);
  assert.equal(record.externalMapQuery, '臺北市中正區仁愛路一段1號');
  const blank = makeMunicipalIdlePropertyLeaseTenderRecord({ 年度: '114', '建物門牌/地號': '臺北市中正區土地段123地號', '出租面積_㎡': '', '標租底價_元': '', '得標價_元': '' }, 2).record;
  assert.equal(blank.leasedAreaSquareMeters, undefined);
  assert.equal(blank.reserveRent, undefined);
  assert.equal(blank.awardedRent, undefined);
  assert.equal(blank.externalMapQuery, undefined);
});

test('converts urban renewal regulation records conservatively', () => {
  assert.deepEqual(parseUrbanRenewalRocDate('1120616'), { rocYear: 112, rocMonth: 6, rocDay: 16, gregorianYear: 2023, gregorianDate: '2023-06-16', hasValidDate: true });
  assert.equal(parseUrbanRenewalRocDate('112/02/30').hasValidDate, false);
  assert.equal(parseUrbanRenewalRocDate('').gregorianDate, null);
  const raw = { SeqNo: '001', ItemName: ' Test regulation ', RocDate: '112/05/01', ArticleType: 'A', CountyCode: '063000', Note: 'preserved' };
  const [record] = convertUrbanRenewalRegulationRows([raw]);
  assert.equal(record.id, 'urban-renewal-regulation-001');
  assert.equal(record.countyCode, '063000');
  assert.equal(record.title, 'Test regulation');
  assert.equal(record.sourceRaw.Note, 'preserved');
  assert.equal(stableRegulationId('', raw).startsWith('urban-renewal-regulation-'), true);
  const summary = buildUrbanRenewalRegulationsSummary([record, { ...record, id: 'second', sourceSequenceNumber: '002' }]);
  assert.equal(summary.dataQuality.duplicateTitleCount, 1);
  assert.equal(summary.byArticleType[0].value, 'A');
});

test('converts municipal property portfolio values without treating missing amounts as zero', () => {
  assert.deepEqual(parsePortfolioYear('114'), { rocYear: 114, gregorianYear: 2025 });
  assert.equal(parsePortfolioMonth('12'), 12);
  assert.equal(parsePortfolioMonth('13'), null);
  assert.equal(parsePortfolioAmount('1,234,567'), 1_234_567);
  assert.equal(parsePortfolioAmount('-'), null);
  const records = convertMunicipalPropertyPortfolioRows([
    { Year: '114', Month: '12', PropertyNature: 'Public', Item: 'Land', Amount: '1,000' },
    { Year: '114', Month: '12', PropertyNature: 'Public', Item: 'Equipment', Amount: '' },
  ]);
  assert.equal(records[0].gregorianYear, 2025);
  assert.equal(records[0].amountTwd, 1000);
  assert.equal(records[1].amountTwd, null);
  const summary = buildMunicipalPropertyPortfolioSummary(records);
  assert.equal(summary.validAmountCount, 1);
  assert.equal(summary.byYear[0].amountTwd, 1000);
  assert.equal(summary.aggregation.officialTotalRowsDetected, false);
});

test('parses civil engineering price index periods and missing year-over-year rates conservatively', () => {
  assert.deepEqual(parseCivilPeriod('115年 7月'), { rocYear: 115, month: 7, gregorianYear: 2026, period: '2026-07' });
  assert.equal(parseCivilPeriod('115年 13月').period, null);
  assert.equal(parseCivilNumber('--', true), null);
  const records = convertCivilEngineeringPriceRows([{ 縣市別代碼: '63000', 統計期: '115年 7月', 基本分類: '總指數', '原始值[統計數值]': '142.08', '年增率[%]': '2.83' }]);
  assert.equal(records[0].category, 'overall');
  assert.equal(records[0].yearOverYearRate, 2.83);
  assert.equal(buildCivilEngineeringPriceSummary(records).latestPeriod, '2026-07');
});

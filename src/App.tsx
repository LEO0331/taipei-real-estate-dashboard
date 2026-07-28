import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from 'recharts';
import { filterCommercialRentIndexRecords, filterPriceIndexRecords, filterRecords, filterRentIndexRecords, sortDistricts } from './dashboard';
import { MrtJointDevelopmentRents } from './MrtJointDevelopmentRents';
import { RealEstateBrokerageBusinessDirectory } from './RealEstateBrokerageBusinessDirectory';
import { RealEstateConsumerDisputes } from './RealEstateConsumerDisputes';
import { RealEstateAppraiserDirectory } from './RealEstateAppraiserDirectory';
import { AnnouncedLandExpropriationRegistry } from './AnnouncedLandExpropriationRegistry';
import { LandReadjustmentSaleResults } from './LandReadjustmentSaleResults';
import { DeclaredLandValueRecords } from './DeclaredLandValueRecords';
import { GeneralExpropriationCompensationCustody } from './GeneralExpropriationCompensationCustody';
import { ConsumerPriceNatureMonthlyIndex } from './ConsumerPriceNatureMonthlyIndex';
import { ActiveRentalHousingServiceProviders } from './ActiveRentalHousingServiceProviders';
import { CadastralClearingSaleProceedsCustody } from './CadastralClearingSaleProceedsCustody';
import { MetroEngineeringMilestones } from './MetroEngineeringMilestones';
import { buildingTypeLabel, commercialOfficeRentCategoryLabel, copy, districtEn, priceIndexCategoryLabel, recordTypeLabel, rentIndexCategoryLabel } from './i18n';
import {
  DISTRICTS,
  type BuildingType,
  type CommercialOfficeRentIndexCategory,
  type CommercialOfficeRentIndexRecord,
  type CommercialOfficeRentIndexSummary,
  type ConsumerPriceBasicAnnualIndexRecord,
  type ConsumerPriceBasicAnnualIndexSummary,
  type ConsumerPriceClassificationGroup,
  type ConsumerPriceClassificationLevel,
  type DevelopmentIntensityCategory,
  type BuildingUsePermitDetailRecord,
  type BuildingUsePermitRecord,
  type BuildingUsePermitSummary,
  type DistrictComparisonSummary,
  type Language,
  type IncomePerEarnerByDistrictYearRecord,
  type IncomePerEarnerByDistrictYearSummary,
  type LandParcelAssessedValueRecord,
  type LandParcelAssessedValueSummary,
  type LandValueTaxPeriodCategory,
  type LandValueTaxProgressiveBracketRecord,
  type LandValueTaxProgressiveBracketSummary,
  type LandUseZoningCategory,
  type LandUseZoningControlRecord,
  type LandUseZoningControlSummary,
  type PopulationDistrictSummary,
  type MovablePropertyPledgeBusinessRecord,
  type MovablePropertyPledgeBusinessSummary,
  type MovablePropertyPledgeItemCategory,
  type MovablePropertySecuredTransactionRecord,
  type MovablePropertySecuredTransactionSummary,
  type RealEstateBrokerPenaltyRecord,
  type RealEstateBrokerPenaltySummary,
  type SocialHousingConstructionProgressRecord,
  type SocialHousingConstructionProgressSummary,
  type MunicipalIdlePropertyLeaseTenderRecord,
  type MunicipalIdlePropertyLeaseTenderSummary,
  type QuarterlyMarketRecord,
  type ResidentialPriceIndexCategory,
  type ResidentialPriceMonthlyIndexRecord,
  type ResidentialPriceMonthlyIndexSummary,
  type ResidentialPriceQuarterlyIndexRecord,
  type ResidentialPriceQuarterlyIndexSummary,
  type ResidentialRentIndexCategory,
  type ResidentialRentIndexRecord,
  type ResidentialRentIndexSummary,
  type RealEstateSummary,
  type RealPriceRecord,
  type RealPriceRecordType,
  type TaipowerTaipeiElectricitySalesRecord,
  type TaipowerTaipeiElectricitySalesSummary,
} from './models';

type QuarterlySummary = {
  latestQuarter?: string;
  totalSaleCaseCount: number;
  residentialZoneCaseCount: number;
  commercialZoneCaseCount: number;
  industrialZoneCaseCount: number;
  topDistrict?: string;
};

type DataBundle = {
  rentalBusinessRecords: Array<{id:string;cityName?:string;authorityCode?:string;registrationNumber?:string;businessName?:string;practiceStatusRaw?:string;practiceStatusNormalized?:string;hasRegistrationNumber?:boolean}>;
  publicLandRecords: Array<{id:string;managingAgency?:string;landIdentifier?:string;parcelAreaSquareMeters?:number;ownershipShareAreaSquareMeters?:number;recordedValue?:number;recordedValuePerOwnedSquareMeter?:number;ownershipShareRatio?:number;districtName?:string}>;
  pppRecords: Array<{id:string;pppType:string;projectName?:string;privateInvestmentAmount?:number;accumulatedRoyaltyAmount?:number;annualLandRentAmount?:number;contractingAgency:string;contractPeriodRaw:string;contractDurationYears?:number;signingDate?:string;signingYear?:number;commissionedCompany:string;note:string}>;
  records: RealPriceRecord[];
  realEstate: RealEstateSummary;
  quarterly: QuarterlyMarketRecord[];
  quarterlySummary: QuarterlySummary;
  population: PopulationDistrictSummary[];
  comparison: DistrictComparisonSummary[];
  priceIndexRecords: ResidentialPriceMonthlyIndexRecord[];
  priceIndexSummary: ResidentialPriceMonthlyIndexSummary;
  quarterlyPriceIndexRecords: ResidentialPriceQuarterlyIndexRecord[];
  quarterlyPriceIndexSummary: ResidentialPriceQuarterlyIndexSummary;
  quarterlyPriceIndexLatest: ResidentialPriceQuarterlyIndexRecord[];
  commercialRentRecords: CommercialOfficeRentIndexRecord[];
  commercialRentSummary: CommercialOfficeRentIndexSummary;
  rentIndexRecords: ResidentialRentIndexRecord[];
  rentIndexSummary: ResidentialRentIndexSummary;
  landValueRecords: LandParcelAssessedValueRecord[];
  landValueSummary: LandParcelAssessedValueSummary;
  landUseZoningRecords: LandUseZoningControlRecord[];
  landUseZoningSummary: LandUseZoningControlSummary;
  incomeRecords: IncomePerEarnerByDistrictYearRecord[];
  incomeSummary: IncomePerEarnerByDistrictYearSummary;
  incomeLatest: IncomePerEarnerByDistrictYearRecord[];
  cpiRecords: ConsumerPriceBasicAnnualIndexRecord[];
  cpiSummary: ConsumerPriceBasicAnnualIndexSummary;
  cpiLatest: ConsumerPriceBasicAnnualIndexRecord[];
  electricityRecords: TaipowerTaipeiElectricitySalesRecord[];
  electricitySummary: TaipowerTaipeiElectricitySalesSummary;
  landValueTaxRecords: LandValueTaxProgressiveBracketRecord[];
  landValueTaxSummary: LandValueTaxProgressiveBracketSummary;
  pledgeRecords: MovablePropertyPledgeBusinessRecord[];
  pledgeSummary: MovablePropertyPledgeBusinessSummary;
  securedTransactionRecords: MovablePropertySecuredTransactionRecord[];
  securedTransactionSummary: MovablePropertySecuredTransactionSummary;
  brokerPenaltyRecords: RealEstateBrokerPenaltyRecord[];
  brokerPenaltySummary: RealEstateBrokerPenaltySummary;
  socialHousingRecords: SocialHousingConstructionProgressRecord[];
  socialHousingSummary: SocialHousingConstructionProgressSummary;
  municipalIdlePropertyLeaseTenderRecords: MunicipalIdlePropertyLeaseTenderRecord[];
  municipalIdlePropertyLeaseTenderSummary: MunicipalIdlePropertyLeaseTenderSummary;
};

const colors = ['#b24738', '#356f9d', '#737d68', '#c58a43', '#775f86', '#408579'];
const base = import.meta.env.BASE_URL;
const loadJson = <T,>(name: string) => fetch(`${base}data/${name}`).then((response) => {
  if (!response.ok) throw new Error(`${response.status} ${name}`);
  return response.json() as Promise<T>;
});

const formatNtd = (value: number | undefined, language: Language) => {
  if (value === undefined) return '—';
  if (language === 'zh') return value >= 10_000 ? `${(value / 10_000).toLocaleString('zh-TW', { maximumFractionDigits: 0 })} 萬` : `NT$${value.toLocaleString('zh-TW')}`;
  return `NT$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};
const formatUnitPrice = (value: number | undefined, language: Language) =>
  value === undefined ? '—' : language === 'zh'
    ? `${(value / 10_000).toLocaleString('zh-TW', { maximumFractionDigits: 1 })} 萬元/坪`
    : `${formatNtd(value, language)} / ping`;
const formatPercent = (value: number | undefined) => value === undefined ? '—' : `${(value * 100).toFixed(1)}%`;
const formatSourcePercent = (value: number | undefined) => value === undefined ? '—' : `${value.toFixed(2)}%`;
const formatRentUnit = (value: number | undefined, language: Language) =>
  value === undefined ? '—' : `${value.toLocaleString(language === 'zh' ? 'zh-TW' : 'en-US', { maximumFractionDigits: 0 })} ${copy[language].standardRentUnitPriceUnit}`;
const formatWan = (value: number | undefined, language: Language, unit: string) =>
  value === undefined ? '—' : `${value.toLocaleString(language === 'zh' ? 'zh-TW' : 'en-US', { maximumFractionDigits: 2 })} ${unit}`;
const formatThousandKwh = (value: number | undefined, language: Language) =>
  value === undefined ? '—' : `${value.toLocaleString(language === 'zh' ? 'zh-TW' : 'en-US', { maximumFractionDigits: 0 })} ${language === 'zh' ? '千度' : 'thousand kWh'}`;
const formatKwh = (value: number | undefined, language: Language) =>
  value === undefined ? '—' : `${value.toLocaleString(language === 'zh' ? 'zh-TW' : 'en-US', { maximumFractionDigits: 0 })} kWh`;
const formatPermille = (value: number | undefined) => value === undefined ? '—' : `${value.toLocaleString()}‰`;
const formatArea = (valueSqm: number | undefined, language: Language) =>
  valueSqm === undefined ? '—' : `${(valueSqm / 10_000).toLocaleString(language === 'zh' ? 'zh-TW' : 'en-US', { maximumFractionDigits: 1 })} ha`;
const formatPriceAxis = (value: number, language: Language) =>
  language === 'zh' ? `${Math.round(value / 10_000)}萬` : `${Math.round(value / 1_000)}k`;
const districtLabel = (district: string | undefined, language: Language) =>
  !district ? '—' : language === 'zh' ? district : districtEn[district] ?? district;
const rentCategoryLabel = (category: ResidentialRentIndexCategory, language: Language) =>
  rentIndexCategoryLabel[category]?.[language] ?? category;
const priceCategoryLabel = (category: ResidentialPriceIndexCategory, language: Language) =>
  priceIndexCategoryLabel[category]?.[language] ?? category;
const commercialRentCategoryLabel = (category: CommercialOfficeRentIndexCategory, language: Language) =>
  commercialOfficeRentCategoryLabel[category]?.[language] ?? category;
const cpiGroupLabel = (group: ConsumerPriceClassificationGroup, language: Language) => ({
  total: { zh: '總指數', en: 'Total' },
  food: { zh: '食物', en: 'Food' },
  clothing: { zh: '衣著', en: 'Clothing' },
  housing: { zh: '居住', en: 'Housing' },
  transport_communication: { zh: '交通及通訊', en: 'Transport & communication' },
  healthcare: { zh: '醫藥保健', en: 'Healthcare' },
  education_recreation: { zh: '教養娛樂', en: 'Education & recreation' },
  miscellaneous: { zh: '雜項', en: 'Miscellaneous' },
  other: { zh: '其他', en: 'Other' },
  unknown: { zh: '未分類', en: 'Unknown' },
}[group][language]);
const cpiLevelLabel = (level: ConsumerPriceClassificationLevel, language: Language) => ({
  total: { zh: '總指數', en: 'Total' },
  main_category: { zh: '大類', en: 'Main category' },
  sub_category: { zh: '細項', en: 'Subcategory' },
  unknown: { zh: '未分類', en: 'Unknown' },
}[level][language]);

function MetricStrip({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return <dl className="metric-strip">{items.map((item) =>
    <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>,
  )}</dl>;
}

function ChartSection({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return <section className="chart-section">
    <h2>{title}</h2>
    <div className="chart-frame">{children}</div>
    {note && <p className="notice">{note}</p>}
  </section>;
}

function ChartTooltip({ active, payload, label, language }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  language: Language;
}) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip">
    <strong>{label}</strong>
    {payload.map((item) => <span key={item.name} style={{ color: item.color }}>{item.name}: {Number(item.value).toLocaleString(language === 'zh' ? 'zh-TW' : 'en-US')}</span>)}
  </div>;
}

function Filters({ language, district, setDistrict, recordType, setRecordType, buildingType, setBuildingType, search, setSearch }: {
  language: Language;
  district: string;
  setDistrict: (value: string) => void;
  recordType: string;
  setRecordType: (value: string) => void;
  buildingType: string;
  setBuildingType: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
}) {
  const t = copy[language];
  return <details className="filters" open>
    <summary>{t.filters}</summary>
    <div className="filter-grid">
      <label><span>{t.district}</span><select value={district} onChange={(event) => setDistrict(event.target.value)}>
        <option value="">{t.allDistricts}</option>
        {DISTRICTS.map((item) => <option key={item} value={item}>{districtLabel(item, language)}</option>)}
      </select></label>
      <label><span>{t.recordType}</span><select value={recordType} onChange={(event) => setRecordType(event.target.value)}>
        <option value="">{t.allTypes}</option>
        {(['sale', 'pre_sale', 'rent', 'unknown'] as RealPriceRecordType[]).map((item) =>
          <option key={item} value={item}>{recordTypeLabel[item][language]}</option>)}
      </select></label>
      <label><span>{t.buildingType}</span><select value={buildingType} onChange={(event) => setBuildingType(event.target.value)}>
        <option value="">{t.allTypes}</option>
        {(Object.keys(buildingTypeLabel) as BuildingType[]).map((item) =>
          <option key={item} value={item}>{buildingTypeLabel[item][language]}</option>)}
      </select></label>
      <label className="search-field"><span>{language === 'zh' ? '搜尋' : 'Search'}</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.search} type="search" />
      </label>
    </div>
  </details>;
}

function RentIndexFilters({ language, records, category, setCategory, year, setYear, quarter, setQuarter, hasChange, setHasChange, search, setSearch }: {
  language: Language;
  records: ResidentialRentIndexRecord[];
  category: string;
  setCategory: (value: string) => void;
  year: string;
  setYear: (value: string) => void;
  quarter: string;
  setQuarter: (value: string) => void;
  hasChange: boolean;
  setHasChange: (value: boolean) => void;
  search: string;
  setSearch: (value: string) => void;
}) {
  const t = copy[language];
  const years = [...new Set(records.map((record) => record.year).filter((value): value is number => !!value))].sort();
  const categories = [...new Set(records.map((record) => record.rentIndexCategory))];
  return <details className="filters" open>
    <summary>{t.filters}</summary>
    <div className="filter-grid rent-filter-grid">
      <label><span>{t.rentIndexCategory}</span><select value={category} onChange={(event) => setCategory(event.target.value)}>
        <option value="">{t.allTypes}</option>
        {categories.map((item) => <option key={item} value={item}>{rentCategoryLabel(item, language)}</option>)}
      </select></label>
      <label><span>{t.year}</span><select value={year} onChange={(event) => setYear(event.target.value)}>
        <option value="">{language === 'zh' ? '全部年份' : 'All years'}</option>
        {years.map((item) => <option key={item} value={item}>{item}</option>)}
      </select></label>
      <label><span>{t.quarter}</span><select value={quarter} onChange={(event) => setQuarter(event.target.value)}>
        <option value="">{language === 'zh' ? '全部季度' : 'All quarters'}</option>
        {[1, 2, 3, 4].map((item) => <option key={item} value={item}>Q{item}</option>)}
      </select></label>
      <label className="checkbox-field"><input type="checkbox" checked={hasChange} onChange={(event) => setHasChange(event.target.checked)} /> <span>{t.hasQuarterlyChangeRate}</span></label>
      <label className="search-field"><span>{language === 'zh' ? '搜尋' : 'Search'}</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.rentIndexSearchPlaceholder} type="search" />
      </label>
    </div>
  </details>;
}

function MarketOverview({ data, language }: { data: DataBundle; language: Language }) {
  const t = copy[language];
  const summary = data.realEstate;
  const rent = summary.residentialRentIndex;
  const quarterlyPrice = summary.residentialPriceQuarterlyIndex;
  const commercialRent = summary.commercialOfficeRentIndex;
  const income = summary.incomePerEarnerByDistrictYear;
  const cpi = summary.consumerPriceBasicAnnualIndex;
  const electricity = summary.taipowerTaipeiElectricitySales;
  const landUse = summary.landUseZoningControlSummary;
  const landTax = summary.landValueTaxProgressiveBrackets;
  const pledge = summary.movablePropertyPledgeBusinessStatistics;
  const secured = summary.movablePropertySecuredTransactionRecords;
  return <>
    <MetricStrip items={[
      { label: t.latestDataPeriod, value: summary.latestDataPeriod ?? '—' },
      { label: t.totalRecords, value: summary.totalRecords.toLocaleString() },
      { label: t.saleRecordCount, value: summary.saleRecordCount.toLocaleString() },
      { label: t.rentalRecordCount, value: summary.rentalRecordCount.toLocaleString() },
      { label: t.medianUnitPrice, value: formatUnitPrice(summary.medianUnitPricePerPingNtd, language) },
      { label: t.medianTotalPrice, value: formatNtd(summary.medianTotalPriceNtd, language) },
      { label: t.mostActiveDistrict, value: districtLabel(summary.mostActiveDistrict, language) },
      { label: t.highestPriceDistrict, value: districtLabel(summary.highestMedianUnitPriceDistrict, language) },
    ]} />
    {rent && <section className="overview-panel">
      <h2>{t.residentialRentIndex}</h2>
      <MetricStrip items={[
        { label: t.latestQuarterRent, value: rent.latestQuarterKey ?? '—' },
        { label: t.citywideRentIndex, value: rent.citywideRentIndex?.toFixed(2) ?? '—' },
        { label: t.citywideQuarterlyChange, value: formatSourcePercent(rent.citywideQuarterlyChangeRatePercent) },
        { label: t.citywideStandardRentUnitPrice, value: formatRentUnit(rent.citywideStandardRentUnitPriceNtdPerPingMonthly, language) },
      ]} />
      <button className="link-button" onClick={() => window.dispatchEvent(new CustomEvent('set-dashboard-tab', { detail: 3 }))}>{language === 'zh' ? '查看住宅租金' : 'View residential rent'}</button>
    </section>}
    {summary.residentialPriceMonthlyIndex && <section className="overview-panel">
      <h2>{t.residentialPriceMonthlyIndex}</h2>
      <MetricStrip items={[
        { label: t.latestPeriod, value: summary.residentialPriceMonthlyIndex.latestPeriod ?? '—' },
        { label: t.citywideLatestMonthlyIndex, value: summary.residentialPriceMonthlyIndex.citywideMonthlyIndex?.toFixed(2) ?? '—' },
        { label: t.citywideMonthlyIndexChange, value: formatSourcePercent(summary.residentialPriceMonthlyIndex.citywideMonthlyIndexChangePercent) },
        { label: t.citywideStandardUnitPrice, value: formatWan(summary.residentialPriceMonthlyIndex.citywideStandardUnitPriceTenThousandNtdPerPing, language, language === 'zh' ? '萬元/坪' : 'NTD 10k / ping') },
      ]} />
      <button className="link-button" onClick={() => window.dispatchEvent(new CustomEvent('set-dashboard-tab', { detail: 1 }))}>{language === 'zh' ? '查看房價指數' : 'View price index'}</button>
    </section>}
    {quarterlyPrice && <section className="overview-panel">
      <h2>{language === 'zh' ? '住宅價格季指數' : 'Residential Price Quarterly Index'}</h2>
      <MetricStrip items={[
        { label: language === 'zh' ? '最新季別' : 'Latest quarter', value: quarterlyPrice.latestQuarterKey ?? '—' },
        { label: language === 'zh' ? '全市季指數' : 'Citywide quarterly index', value: quarterlyPrice.citywideQuarterlyIndex?.toFixed(2) ?? '—' },
        { label: language === 'zh' ? '全市季變動率' : 'Citywide quarterly change', value: formatSourcePercent(quarterlyPrice.citywideQuarterlyChangePercent) },
        { label: language === 'zh' ? '全市標準單價' : 'Citywide standard unit price', value: formatWan(quarterlyPrice.citywideStandardUnitPriceTenThousandNtdPerPing, language, language === 'zh' ? '萬元/坪' : 'NTD 10k / ping') },
      ]} />
      <p className="notice">{language === 'zh' ? '以實價登錄資料庫為基礎之趨勢指標；不代表個別住宅估價、實際成交價格、交易建議或價格預測。' : 'A real-price-registration-based trend indicator; not individual appraisal, actual transaction price, transaction advice, or price forecast.'}</p>
      <button className="link-button" onClick={() => window.dispatchEvent(new CustomEvent('set-dashboard-tab', { detail: 2 }))}>{language === 'zh' ? '查看住宅季指數' : 'View quarterly price index'}</button>
    </section>}
    {commercialRent && <section className="overview-panel">
      <h2>{t.commercialOfficeRentIndex}</h2>
      <MetricStrip items={[
        { label: t.latestPeriod, value: commercialRent.latestPeriod ?? '—' },
        { label: t.citywideLatestQuarterlyIndex, value: commercialRent.citywideQuarterlyIndex?.toFixed(2) ?? '—' },
        { label: t.citywideStandardRentUnitPrice, value: formatRentUnit(commercialRent.citywideStandardRentNtdPerPingPerMonth, language) },
        { label: t.majorRoadLatestQuarterlyIndex, value: commercialRent.majorRoadQuarterlyIndex?.toFixed(2) ?? '—' },
        { label: t.majorRoadStandardRentUnitPrice, value: formatRentUnit(commercialRent.majorRoadStandardRentNtdPerPingPerMonth, language) },
        { label: t.majorRoadRentPremium, value: `${formatRentUnit(commercialRent.majorRoadRentGapNtdPerPingPerMonth, language)} / ${formatSourcePercent(commercialRent.majorRoadRentGapPercent)}` },
      ]} />
      <button className="link-button" onClick={() => window.dispatchEvent(new CustomEvent('set-dashboard-tab', { detail: 4 }))}>{language === 'zh' ? '查看商辦租金' : 'View office rent'}</button>
    </section>}
    {income && <section className="overview-panel">
      <h2>{language === 'zh' ? '社會經濟背景：所得收入' : 'Socioeconomic Context: Income'}</h2>
      <MetricStrip items={[
        { label: language === 'zh' ? '最新年度' : 'Latest year', value: income.latestYear ?? '—' },
        { label: language === 'zh' ? '總平均所得收入' : 'City average total income', value: formatNtd(income.cityAverageTotalIncomeNtd, language) },
        { label: language === 'zh' ? '總平均可支配所得' : 'City average disposable income', value: formatNtd(income.cityAverageDisposableIncomeNtd, language) },
        { label: language === 'zh' ? '可支配所得最高行政區' : 'Top disposable-income district', value: districtLabel(income.topDistrictByDisposableIncome, language) },
      ]} />
      <p className="notice">{language === 'zh' ? '所得資料僅作為負擔能力與社會經濟背景，不代表估價、稅務、投資、貸款、財務建議或市場預測。' : 'Income data is affordability and socioeconomic context only, not appraisal, tax, investment, lending, financial advice, or market prediction.'}</p>
      <button className="link-button" onClick={() => window.dispatchEvent(new CustomEvent('set-dashboard-tab', { detail: 11 }))}>{language === 'zh' ? '查看所得收入' : 'View income context'}</button>
    </section>}
    {cpi && <section className="overview-panel">
      <h2>{language === 'zh' ? '物價背景：年度CPI' : 'Price Context: Annual CPI'}</h2>
      <MetricStrip items={[
        { label: language === 'zh' ? '最新年度' : 'Latest year', value: cpi.latestYear ?? '—' },
        { label: language === 'zh' ? '總指數' : 'Total index', value: cpi.latestTotalIndex?.toFixed(2) ?? '—' },
        { label: language === 'zh' ? '總指數年增率' : 'Total YoY change', value: formatSourcePercent(cpi.latestTotalAnnualChangePercent) },
        { label: language === 'zh' ? '居住類指數' : 'Housing index', value: cpi.latestHousingIndex?.toFixed(2) ?? '—' },
      ]} />
      <p className="notice">{language === 'zh' ? '年度CPI僅作為物價、所得、租金與居住負擔背景，不代表個人通膨、即時價格、房價或租金預測。' : 'Annual CPI is price, income, rent, and housing-affordability context only; not personal inflation, realtime prices, or housing/rent forecasts.'}</p>
      <button className="link-button" onClick={() => window.dispatchEvent(new CustomEvent('set-dashboard-tab', { detail: 12 }))}>{language === 'zh' ? '查看物價年指數' : 'View annual CPI'}</button>
    </section>}
    {electricity && <section className="overview-panel">
      <h2>{language === 'zh' ? '城市用電：臺北市售電量' : 'City Electricity: Taipei Sales'}</h2>
      <MetricStrip items={[
        { label: language === 'zh' ? '最新年度' : 'Latest year', value: electricity.latestYear ?? '—' },
        { label: language === 'zh' ? '總用戶數' : 'Total customers', value: electricity.latestTotalCustomerCount?.toLocaleString() ?? '—' },
        { label: language === 'zh' ? '總用電量' : 'Total sales', value: formatThousandKwh(electricity.latestTotalElectricitySalesThousandKwh, language) },
        { label: language === 'zh' ? '每用戶用電量' : 'Per-customer use', value: formatKwh(electricity.latestTotalElectricityUsePerCustomerKwh, language) },
      ]} />
      <p className="notice">{language === 'zh' ? '年度售電量僅供城市用電、公共設施需求與經濟活動背景，不代表即時用電、個別建物用電、電價、停電風險或碳排放。' : 'Annual electricity sales are city electricity, infrastructure demand, and economic-activity context only; not realtime demand, building-level use, prices, outage risk, or emissions.'}</p>
      <button className="link-button" onClick={() => window.dispatchEvent(new CustomEvent('set-dashboard-tab', { detail: 13 }))}>{language === 'zh' ? '查看臺北市售電量' : 'View electricity sales'}</button>
    </section>}
    {landUse && <section className="overview-panel">
      <h2>{language === 'zh' ? '土地使用、分區管制與開發強度' : 'Land Use, Zoning Control & Development Intensity'}</h2>
      <MetricStrip items={[
        { label: language === 'zh' ? '資料列數' : 'Data rows', value: landUse.totalRecords?.toLocaleString() ?? '—' },
        { label: language === 'zh' ? '涵蓋行政區數' : 'Districts covered', value: landUse.districtCount ?? '—' },
        { label: language === 'zh' ? '不重複分區數' : 'Unique zoning names', value: landUse.uniqueZoningNameCount ?? '—' },
        { label: language === 'zh' ? '總面積' : 'Total area', value: formatArea(landUse.totalAreaSquareMeters, language) },
      ]} />
      <p className="notice">{language === 'zh' ? '土地使用管制資料為行政區與分區層級彙整，不代表個別土地、地號、建物或基地之正式管制證明、建築許可、開發權利或估價結果。' : 'Land-use control data is district- and zoning-level summary data, not an official control certificate, building permit, development right, or appraisal for a specific parcel, cadastral number, building, or site.'}</p>
      <button className="link-button" onClick={() => window.dispatchEvent(new CustomEvent('set-dashboard-tab', { detail: 9 }))}>{language === 'zh' ? '查看土地使用管制' : 'View land-use control'}</button>
    </section>}
    {landTax && <section className="overview-panel">
      <h2>{language === 'zh' ? '地價、稅負與持有成本：地價稅級距' : 'Land Value, Tax Burden & Holding Cost: Land Value Tax Brackets'}</h2>
      <MetricStrip items={[
        { label: language === 'zh' ? '最新年度' : 'Latest year', value: landTax.latestYear ?? '—' },
        { label: language === 'zh' ? '最新累進起點地價' : 'Latest progressive starting point', value: formatNtd(landTax.latestProgressiveStartingPointLandValue, language) },
        { label: language === 'zh' ? '一般土地最高稅率' : 'General land highest tax rate', value: formatPermille(landTax.latestGeneralLandHighestRatePermille) },
        { label: language === 'zh' ? '一般土地級距數' : 'General land bracket count', value: landTax.latestGeneralLandTaxBracketCount ?? '—' },
      ]} />
      <p className="notice">{language === 'zh' ? '地價稅級距資料僅整理年度稅制公式與級距，不代表個別土地、所有權人或案件之正式應納稅額，也不構成稅務、法律、投資或申報建議。' : 'Land value tax bracket data only organizes annual tax schedules and formulas; it is not an official payable tax amount for a specific parcel, owner, or case, and is not tax, legal, investment, or filing advice.'}</p>
      <button className="link-button" onClick={() => window.dispatchEvent(new CustomEvent('set-dashboard-tab', { detail: 10 }))}>{language === 'zh' ? '查看地價稅級距' : 'View land value tax brackets'}</button>
    </section>}
    {pledge && <section className="overview-panel">
      <h2>{language === 'zh' ? '社會經濟背景：動產質借' : 'Socioeconomic Context: Pledge Loans'}</h2>
      <MetricStrip items={[
        { label: language === 'zh' ? '最新年度' : 'Latest year', value: pledge.latestYear ?? '—' },
        { label: language === 'zh' ? '質借件數' : 'Pledge cases', value: pledge.latestYearPledgeCaseCount?.toLocaleString() ?? '—' },
        { label: language === 'zh' ? '質借本金' : 'Pledge principal', value: formatNtd(pledge.latestYearPledgePrincipalNtd, language) },
        { label: language === 'zh' ? '現金利息收入' : 'Cash interest income', value: formatNtd(pledge.latestYearCashInterestIncomeNtd, language) },
      ]} />
      <p className="notice">{language === 'zh' ? '僅供社會經濟背景觀察，不代表房價、租金、房貸壓力或財務建議。' : 'Socioeconomic context only; not prices, rents, mortgage stress, or financial advice.'}</p>
      <button className="link-button" onClick={() => window.dispatchEvent(new CustomEvent('set-dashboard-tab', { detail: 14 }))}>{language === 'zh' ? '查看動產質借' : 'View pledge loans'}</button>
    </section>}
    {secured && <section className="overview-panel">
      <h2>{language === 'zh' ? '融資背景：動產擔保' : 'Financing Context: Movable Collateral'}</h2>
      <MetricStrip items={[
        { label: language === 'zh' ? '登記筆數' : 'Records', value: secured.totalRecords?.toLocaleString() ?? '—' },
        { label: language === 'zh' ? '最新登記月份' : 'Latest registration month', value: secured.latestRegistrationMonth ?? '—' },
        { label: language === 'zh' ? '標的物總金額' : 'Collateral amount', value: formatNtd(secured.totalCollateralAmountNtd, language) },
        { label: language === 'zh' ? '擔保債權金額' : 'Secured debt amount', value: formatNtd(secured.totalSecuredDebtAmountNtd, language) },
      ]} />
      <p className="notice">{language === 'zh' ? '動產擔保登記僅供融資與擔保背景觀察，不代表不動產抵押、房貸、信用評等、法律意見或即時權利狀態。' : 'Movable collateral records are financing and collateral context only, not real-estate mortgages, housing loans, credit ratings, legal advice, or real-time rights status.'}</p>
      <button className="link-button" onClick={() => window.dispatchEvent(new CustomEvent('set-dashboard-tab', { detail: 15 }))}>{language === 'zh' ? '查看動產擔保' : 'View movable collateral'}</button>
    </section>}
    <div className="chart-grid">
      <ChartSection title={t.transactionCountByMonth}><ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={summary.byMonth}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="period" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="transactionCount" name={t.transactionCount} fill="#b24738" radius={[4, 4, 0, 0]} /></ComposedChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={t.medianUnitPriceByMonth}><ResponsiveContainer width="100%" height={280}>
        <LineChart data={summary.byMonth}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="period" /><YAxis tickFormatter={(value) => formatPriceAxis(value, language)} /><Tooltip content={<ChartTooltip language={language} />} /><Line type="monotone" dataKey="medianUnitPricePerPingNtd" name={t.medianUnitPrice} stroke="#b24738" strokeWidth={3} dot={false} /></LineChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={t.medianUnitPriceByDistrict}><ResponsiveContainer width="100%" height={320}>
        <BarChart data={summary.byDistrict} layout="vertical" margin={{ left: 12 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tickFormatter={(value) => formatPriceAxis(value, language)} /><YAxis type="category" dataKey="district" width={58} tickFormatter={(value) => districtLabel(value, language)} /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="medianUnitPricePerPingNtd" name={t.medianUnitPrice} fill="#b24738" radius={[0, 4, 4, 0]} /></BarChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={t.buildingTypeDistribution}><ResponsiveContainer width="100%" height={320}>
        <PieChart><Pie data={summary.byBuildingType} dataKey="count" nameKey="buildingType" innerRadius={60} outerRadius={105} paddingAngle={2} label={({ name }) => buildingTypeLabel[name as BuildingType]?.[language] ?? name}>
          {summary.byBuildingType.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
        </Pie><Tooltip /></PieChart>
      </ResponsiveContainer></ChartSection>
    </div>
  </>;
}

function CommercialOfficeRentIndex({ data, language }: { data: DataBundle; language: Language }) {
  const t = copy[language];
  const [category, setCategory] = useState('');
  const [year, setYear] = useState('');
  const [quarter, setQuarter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const records = data.commercialRentRecords;
  const filtered = useMemo(() => filterCommercialRentIndexRecords(records, { category, year, quarter, search }), [records, category, year, quarter, search]);
  useEffect(() => setPage(1), [filtered]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const latest = data.commercialRentSummary.latestByCategory;
  const citywide = latest.find((item) => item.category === 'citywide');
  const majorRoad = latest.find((item) => item.category === 'major_roads');
  const highestIndex = [...latest].sort((a, b) => (b.quarterlyIndex ?? 0) - (a.quarterlyIndex ?? 0))[0];
  const years = [...new Set(records.map((record) => record.year))].sort();
  const categories = [...new Set(records.map((record) => record.category))];
  const lineData = data.commercialRentSummary.byPeriod;
  const latestChart = latest.map((item) => ({ ...item, categoryLabel: commercialRentCategoryLabel(item.category, language) }));
  const changeData = [...new Set(records.map((record) => record.period))].sort().map((period) => {
    const byType = new Map(records.filter((record) => record.period === period).map((record) => [record.category, record]));
    return {
      period,
      citywideChange: byType.get('citywide')?.quarterlyChangePercent,
      majorRoadChange: byType.get('major_roads')?.quarterlyChangePercent,
    };
  });

  return <>
    <section className="section-intro">
      <h2>{t.commercialOfficeRentIndex}</h2>
      <p>{t.commercialOfficeRentSubtitle}</p>
      <p className="notice">{t.commercialOfficeRentDisclaimer}</p>
      <p className="notice">{t.commercialOfficeRentLocationNotice}</p>
    </section>
    <MetricStrip items={[
      { label: t.latestPeriod, value: data.commercialRentSummary.latestPeriod ?? '—' },
      { label: t.indexCategoryCount, value: data.commercialRentSummary.categoryCount },
      { label: t.citywideLatestQuarterlyIndex, value: citywide?.quarterlyIndex?.toFixed(2) ?? '—' },
      { label: t.citywideQuarterlyChange, value: formatSourcePercent(citywide?.quarterlyChangePercent) },
      { label: t.citywideStandardRentUnitPrice, value: formatRentUnit(citywide?.standardRentNtdPerPingPerMonth, language) },
      { label: t.majorRoadLatestQuarterlyIndex, value: majorRoad?.quarterlyIndex?.toFixed(2) ?? '—' },
      { label: t.majorRoadQuarterlyChange, value: formatSourcePercent(majorRoad?.quarterlyChangePercent) },
      { label: t.majorRoadStandardRentUnitPrice, value: formatRentUnit(majorRoad?.standardRentNtdPerPingPerMonth, language) },
      { label: t.majorRoadRentPremium, value: `${formatRentUnit(data.commercialRentSummary.latestMajorRoadPremium?.rentGapNtdPerPingPerMonth, language)} / ${formatSourcePercent(data.commercialRentSummary.latestMajorRoadPremium?.rentGapPercent)}` },
      { label: t.highestQuarterlyIndexCategory, value: highestIndex ? commercialRentCategoryLabel(highestIndex.category, language) : '—' },
    ]} />
    <div className="chart-grid">
      <ChartSection title={t.quarterlyRentIndexByCategory} note={t.commercialOfficeRentIndexChartNotice}><ResponsiveContainer width="100%" height={320}>
        <LineChart data={lineData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="period" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Legend /><Line dataKey="citywideQuarterlyIndex" name={commercialRentCategoryLabel('citywide', language)} stroke="#b24738" strokeWidth={3} dot={false} /><Line dataKey="majorRoadQuarterlyIndex" name={commercialRentCategoryLabel('major_roads', language)} stroke="#356f9d" strokeWidth={3} dot={false} /></LineChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={t.quarterlyChangeRateByCategory} note={t.commercialOfficeRentIndexChartNotice}><ResponsiveContainer width="100%" height={300}>
        <LineChart data={changeData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="period" /><YAxis unit="%" /><Tooltip content={<ChartTooltip language={language} />} /><Legend /><Line dataKey="citywideChange" name={commercialRentCategoryLabel('citywide', language)} stroke="#b24738" strokeWidth={3} dot={false} /><Line dataKey="majorRoadChange" name={commercialRentCategoryLabel('major_roads', language)} stroke="#356f9d" strokeWidth={3} dot={false} /></LineChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={t.standardRentUnitPriceByCategory} note={t.commercialOfficeRentIndexChartNotice}><ResponsiveContainer width="100%" height={320}>
        <LineChart data={lineData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="period" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Legend /><Line dataKey="citywideStandardRentNtdPerPingPerMonth" name={commercialRentCategoryLabel('citywide', language)} stroke="#b24738" strokeWidth={3} dot={false} /><Line dataKey="majorRoadStandardRentNtdPerPingPerMonth" name={commercialRentCategoryLabel('major_roads', language)} stroke="#356f9d" strokeWidth={3} dot={false} /></LineChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={t.majorRoadPremiumOverCitywideRent} note={t.commercialOfficeRentIndexChartNotice}><ResponsiveContainer width="100%" height={300}>
        <LineChart data={lineData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="period" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Line dataKey="rentGapNtdPerPingPerMonth" name={t.majorRoadRentPremium} stroke="#775f86" strokeWidth={3} dot={false} /></LineChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={t.latestCategoryComparison} note={t.commercialOfficeRentIndexChartNotice}><ResponsiveContainer width="100%" height={300}>
        <BarChart data={latestChart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="categoryLabel" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="quarterlyIndex" name={t.quarterlyIndex} fill="#b24738" /></BarChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={t.standardRentUnitPriceByCategory} note={t.commercialOfficeRentIndexChartNotice}><ResponsiveContainer width="100%" height={300}>
        <BarChart data={latestChart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="categoryLabel" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="standardRentNtdPerPingPerMonth" name={t.standardRentNtdPerPingPerMonth} fill="#356f9d" /></BarChart>
      </ResponsiveContainer></ChartSection>
    </div>
    <section className="analysis-list">
      <h2>{t.officeRentTable}</h2>
      <details className="filters" open><summary>{t.filters}</summary><div className="filter-grid">
        <label><span>{t.category}</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">{t.allTypes}</option>{categories.map((item) => <option key={item} value={item}>{commercialRentCategoryLabel(item, language)}</option>)}</select></label>
        <label><span>{t.year}</span><select value={year} onChange={(event) => setYear(event.target.value)}><option value="">{language === 'zh' ? '全部年份' : 'All years'}</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span>{t.quarter}</span><select value={quarter} onChange={(event) => setQuarter(event.target.value)}><option value="">{language === 'zh' ? '全部季度' : 'All quarters'}</option>{[1, 2, 3, 4].map((item) => <option key={item} value={item}>Q{item}</option>)}</select></label>
        <label className="search-field"><span>{language === 'zh' ? '搜尋' : 'Search'}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.commercialOfficeRentSearchPlaceholder} type="search" /></label>
      </div></details>
      <p className="table-count">{filtered.length.toLocaleString()} {language === 'zh' ? '筆紀錄' : 'records'}</p>
      <div className="table-wrap"><table><thead><tr>{[t.period, t.category, t.quarterlyIndex, t.quarterlyChangePercent, t.standardRentNtdPerPingPerMonth, t.yearOverYearRentIndexChangePercent, t.majorRoadRentPremium].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{visible.map((record) => <tr key={record.id}>
        <td>{record.period}</td><td>{commercialRentCategoryLabel(record.category, language)}</td><td>{record.quarterlyIndex?.toFixed(2) ?? '—'}</td><td>{formatSourcePercent(record.quarterlyChangePercent)}</td><td>{formatRentUnit(record.standardRentNtdPerPingPerMonth, language)}</td><td>{formatSourcePercent(record.yearOverYearQuarterlyIndexChangePercent)}</td><td>{formatRentUnit(record.rentGapNtdPerPingPerMonth, language)}</td>
      </tr>)}</tbody></table></div>
      <nav className="pagination" aria-label="Pagination"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>{t.previous}</button><span>{t.page} {page} / {pages}</span><button disabled={page === pages} onClick={() => setPage((value) => value + 1)}>{t.next}</button></nav>
    </section>
  </>;
}

function ResidentialPriceMonthlyIndex({ data, language }: { data: DataBundle; language: Language }) {
  const t = copy[language];
  const [category, setCategory] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const records = data.priceIndexRecords;
  const filtered = useMemo(() => filterPriceIndexRecords(records, { category, year, month, search }), [records, category, year, month, search]);
  useEffect(() => setPage(1), [filtered]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const latest = data.priceIndexSummary.latestByCategory;
  const citywide = latest.find((item) => item.category === 'citywide');
  const highestIndex = [...latest].sort((a, b) => (b.monthlyIndex ?? 0) - (a.monthlyIndex ?? 0))[0];
  const highestUnitPrice = [...latest].sort((a, b) => (b.standardUnitPriceTenThousandNtdPerPing ?? 0) - (a.standardUnitPriceTenThousandNtdPerPing ?? 0))[0];
  const years = [...new Set(records.map((record) => record.year))].sort();
  const categories = [...new Set(records.map((record) => record.category))];
  const lineData = data.priceIndexSummary.byPeriod;
  const citywideTrend = records.filter((record) => record.category === 'citywide');
  const latestChart = latest.map((item) => ({ ...item, categoryLabel: priceCategoryLabel(item.category, language) }));

  return <>
    <section className="section-intro">
      <h2>{t.residentialPriceMonthlyIndex}</h2>
      <p>{t.priceIndexSubtitle}</p>
      <p className="notice">{t.priceIndexDisclaimer}</p>
    </section>
    <MetricStrip items={[
      { label: t.latestPeriod, value: data.priceIndexSummary.latestPeriod ?? '—' },
      { label: t.indexCategoryCount, value: data.priceIndexSummary.categoryCount },
      { label: t.citywideLatestMonthlyIndex, value: citywide?.monthlyIndex?.toFixed(2) ?? '—' },
      { label: t.citywideMonthlyIndexChange, value: formatSourcePercent(citywide?.monthlyIndexChangePercent) },
      { label: t.citywideYoyIndexChange, value: formatSourcePercent(citywide?.yearOverYearMonthlyIndexChangePercent) },
      { label: t.citywideStandardTotalPrice, value: formatWan(citywide?.standardTotalPriceTenThousandNtd, language, language === 'zh' ? '萬元' : 'NTD 10k') },
      { label: t.citywideStandardUnitPrice, value: formatWan(citywide?.standardUnitPriceTenThousandNtdPerPing, language, language === 'zh' ? '萬元/坪' : 'NTD 10k / ping') },
      { label: t.highestMonthlyIndexCategory, value: highestIndex ? priceCategoryLabel(highestIndex.category, language) : '—' },
      { label: t.highestStandardUnitPriceCategory, value: highestUnitPrice ? priceCategoryLabel(highestUnitPrice.category, language) : '—' },
    ]} />
    <div className="chart-grid">
      <ChartSection title={t.monthlyIndexByCategory} note={t.residentialPriceIndexChartNotice}><ResponsiveContainer width="100%" height={320}>
        <LineChart data={lineData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="period" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Legend /><Line dataKey="citywideMonthlyIndex" name={priceCategoryLabel('citywide', language)} stroke="#b24738" strokeWidth={3} dot={false} /><Line dataKey="citywideApartmentMonthlyIndex" name={priceCategoryLabel('citywide_apartment', language)} stroke="#737d68" strokeWidth={2} dot={false} /><Line dataKey="citywideBuildingMonthlyIndex" name={priceCategoryLabel('citywide_building', language)} stroke="#356f9d" strokeWidth={2} dot={false} /><Line dataKey="citywideSmallUnitMonthlyIndex" name={priceCategoryLabel('citywide_small_unit', language)} stroke="#c58a43" strokeWidth={2} dot={false} /></LineChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={t.monthlyIndexMovingAverages} note={t.residentialPriceIndexChartNotice}><ResponsiveContainer width="100%" height={320}>
        <LineChart data={citywideTrend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="period" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Legend /><Line dataKey="monthlyIndex" name={t.monthlyIndex} stroke="#b24738" strokeWidth={3} dot={false} /><Line dataKey="threeMonthMovingAverageIndex" name={t.threeMonthMovingAverageIndex} stroke="#356f9d" strokeWidth={2} dot={false} /><Line dataKey="sixMonthMovingAverageIndex" name={t.sixMonthMovingAverageIndex} stroke="#737d68" strokeWidth={2} dot={false} /></LineChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={t.citywideMonthlyIndexChangeRate} note={t.residentialPriceIndexChartNotice}><ResponsiveContainer width="100%" height={300}>
        <LineChart data={citywideTrend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="period" /><YAxis unit="%" /><Tooltip content={<ChartTooltip language={language} />} /><Line dataKey="monthlyIndexChangePercent" name={t.monthlyIndexChangePercent} stroke="#775f86" strokeWidth={3} dot={false} /></LineChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={t.latestCategoryComparison} note={t.residentialPriceIndexChartNotice}><ResponsiveContainer width="100%" height={300}>
        <BarChart data={latestChart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="categoryLabel" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="monthlyIndex" name={t.monthlyIndex} fill="#b24738" /></BarChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={t.standardTotalPriceByCategory} note={t.residentialPriceIndexChartNotice}><ResponsiveContainer width="100%" height={300}>
        <BarChart data={latestChart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="categoryLabel" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="standardTotalPriceTenThousandNtd" name={t.standardTotalPriceTenThousandNtd} fill="#356f9d" /></BarChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={t.standardUnitPriceByCategory} note={t.residentialPriceIndexChartNotice}><ResponsiveContainer width="100%" height={300}>
        <BarChart data={latestChart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="categoryLabel" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="standardUnitPriceTenThousandNtdPerPing" name={t.standardUnitPriceTenThousandNtdPerPing} fill="#737d68" /></BarChart>
      </ResponsiveContainer></ChartSection>
    </div>
    <section className="analysis-list">
      <h2>{t.priceIndexTable}</h2>
      <details className="filters" open><summary>{t.filters}</summary><div className="filter-grid">
        <label><span>{t.category}</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">{t.allTypes}</option>{categories.map((item) => <option key={item} value={item}>{priceCategoryLabel(item, language)}</option>)}</select></label>
        <label><span>{t.year}</span><select value={year} onChange={(event) => setYear(event.target.value)}><option value="">{language === 'zh' ? '全部年份' : 'All years'}</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span>{language === 'zh' ? '月份' : 'Month'}</span><select value={month} onChange={(event) => setMonth(event.target.value)}><option value="">{language === 'zh' ? '全部月份' : 'All months'}</option>{Array.from({ length: 12 }, (_, index) => index + 1).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="search-field"><span>{language === 'zh' ? '搜尋' : 'Search'}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.residentialPriceIndexSearchPlaceholder} type="search" /></label>
      </div></details>
      <p className="table-count">{filtered.length.toLocaleString()} {language === 'zh' ? '筆紀錄' : 'records'}</p>
      <div className="table-wrap"><table><thead><tr>{[t.period, t.category, t.monthlyIndex, t.threeMonthMovingAverageIndex, t.sixMonthMovingAverageIndex, t.monthlyIndexChangePercent, t.standardTotalPriceTenThousandNtd, t.standardUnitPriceTenThousandNtdPerPing].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{visible.map((record) => <tr key={record.id}>
        <td>{record.period}</td><td>{priceCategoryLabel(record.category, language)}</td><td>{record.monthlyIndex?.toFixed(2) ?? '—'}</td><td>{record.threeMonthMovingAverageIndex?.toFixed(2) ?? '—'}</td><td>{record.sixMonthMovingAverageIndex?.toFixed(2) ?? '—'}</td><td>{formatSourcePercent(record.monthlyIndexChangePercent)}</td><td>{formatWan(record.standardTotalPriceTenThousandNtd, language, language === 'zh' ? '萬元' : 'NTD 10k')}</td><td>{formatWan(record.standardUnitPriceTenThousandNtdPerPing, language, language === 'zh' ? '萬元/坪' : 'NTD 10k / ping')}</td>
      </tr>)}</tbody></table></div>
      <nav className="pagination" aria-label="Pagination"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>{t.previous}</button><span>{t.page} {page} / {pages}</span><button disabled={page === pages} onClick={() => setPage((value) => value + 1)}>{t.next}</button></nav>
    </section>
  </>;
}

function ResidentialPriceQuarterlyIndex({ data, language }: { data: DataBundle; language: Language }) {
  const label = (zh: string, en: string) => language === 'zh' ? zh : en;
  const [categoryType, setCategoryType] = useState('');
  const [category, setCategory] = useState('');
  const [year, setYear] = useState('');
  const [quarter, setQuarter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const records = data.quarterlyPriceIndexRecords;
  const summary = data.quarterlyPriceIndexSummary;
  const filtered = records.filter((record) =>
    (!categoryType || record.categoryType === categoryType)
    && (!category || record.category === category)
    && (!year || record.year === Number(year))
    && (!quarter || record.quarter === Number(quarter))
    && (!search || `${record.category} ${record.quarterKey} ${record.district ?? ''} ${record.housingType ?? ''}`.toLowerCase().includes(search.toLowerCase())));
  useEffect(() => setPage(1), [categoryType, category, year, quarter, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((Math.min(page, pages) - 1) * pageSize, Math.min(page, pages) * pageSize);
  const years = [...new Set(records.map((record) => record.year))].sort();
  const categories = [...new Set(records.map((record) => record.category))];
  const cityTrend = records.filter((record) => record.isCitywide);
  const latestDistricts = data.quarterlyPriceIndexLatest.filter((record) => record.isDistrict).sort((a, b) => (b.standardHousingUnitPriceTenThousandNtdPerPing ?? 0) - (a.standardHousingUnitPriceTenThousandNtdPerPing ?? 0));
  const topIndex = data.quarterlyPriceIndexLatest.find((record) => record.districtRankByQuarterlyIndex === 1);
  const lowIndex = [...data.quarterlyPriceIndexLatest].filter((record) => record.isDistrict).sort((a, b) => (a.quarterlyIndex ?? Infinity) - (b.quarterlyIndex ?? Infinity))[0];
  const topUnit = data.quarterlyPriceIndexLatest.find((record) => record.districtRankByStandardUnitPrice === 1);
  const lowUnit = [...data.quarterlyPriceIndexLatest].filter((record) => record.isDistrict).sort((a, b) => (a.standardHousingUnitPriceTenThousandNtdPerPing ?? Infinity) - (b.standardHousingUnitPriceTenThousandNtdPerPing ?? Infinity))[0];
  return <>
    <section className="section-intro">
      <h2>{label('住宅價格季指數', 'Residential Price Quarterly Index')}</h2>
      <p>{label('觀察全市、住宅類型與12行政區住宅價格季指數、季變動率、標準住宅總價與標準住宅單價。', 'Explore quarterly residential price index, quarter-over-quarter change, standard total price, and standard unit price across citywide, housing-type, and 12-district categories.')}</p>
      <p className="notice">{label('住宅價格季指數為以實價登錄資料庫為基礎編製之住宅價格趨勢指標，僅供觀察趨勢，不代表個別住宅估價、即時市場報價、實際成交價格、購屋建議、售屋建議、投資建議、房貸建議或價格預測。', 'The residential price quarterly index is compiled from the real-price registration database for trend observation only. It is not individual-home appraisal, real-time market quote, actual transaction price, home-buying advice, home-selling advice, investment advice, mortgage advice, or price forecast.')}</p>
      <p className="notice">{label('本資料未提供個別地址或經緯度；本模組僅呈現行政區層級圖表與排名，不建立精確地圖點位。', 'The source has no individual addresses or coordinates; this module shows district-level charts and rankings only, with no exact map points.')}</p>
    </section>
    <MetricStrip items={[
      { label: label('最新季別', 'Latest quarter'), value: summary.latestQuarterKey ?? '—' },
      { label: label('類別數', 'Categories'), value: summary.categoryCount },
      { label: label('行政區數', 'Districts'), value: summary.districtCount },
      { label: label('全市季指數', 'Citywide quarterly index'), value: summary.latestCitywide?.quarterlyIndex?.toFixed(2) ?? '—' },
      { label: label('全市季變動率', 'Citywide quarterly change'), value: formatSourcePercent(summary.latestCitywide?.quarterlyChangePercent) },
      { label: label('全市標準單價', 'Citywide standard unit price'), value: formatWan(summary.latestCitywide?.standardHousingUnitPriceTenThousandNtdPerPing, language, language === 'zh' ? '萬元/坪' : 'NTD 10k / ping') },
      { label: label('季指數最高行政區', 'Highest district index'), value: districtLabel(topIndex?.district, language) },
      { label: label('標準單價最高行政區', 'Highest district unit price'), value: districtLabel(topUnit?.district, language) },
    ]} />
    <div className="chart-grid">
      <ChartSection title={label('全市季指數趨勢', 'Citywide Quarterly Index Trend')} note={label('此圖僅整理季指數公開資料，不代表個別住宅估價、實際成交價格或價格預測。', 'This chart only organizes quarterly index public data and does not represent individual appraisal, actual transaction price, or price forecast.')}><ResponsiveContainer width="100%" height={320}><LineChart data={cityTrend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="quarterKey" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Legend /><Line dataKey="quarterlyIndex" name={label('季指數', 'Quarterly index')} stroke="#b24738" strokeWidth={3} dot={false} /><Line dataKey="standardHousingUnitPriceTenThousandNtdPerPing" name={label('標準單價', 'Standard unit price')} stroke="#356f9d" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('住宅類型季指數趨勢', 'Housing-Type Quarterly Index Trend')}><ResponsiveContainer width="100%" height={320}><LineChart data={summary.byQuarter}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="quarterKey" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Legend /><Line dataKey="citywideQuarterlyIndex" name={label('全市', 'Citywide')} stroke="#b24738" strokeWidth={3} dot={false} /><Line dataKey="apartmentQuarterlyIndex" name={label('公寓', 'Apartment')} stroke="#737d68" strokeWidth={2} dot={false} /><Line dataKey="buildingQuarterlyIndex" name={label('大樓', 'Building')} stroke="#356f9d" strokeWidth={2} dot={false} /><Line dataKey="smallUnitQuarterlyIndex" name={label('小宅', 'Small unit')} stroke="#c58a43" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('最新季各行政區季指數', 'Latest District Quarterly Index')}><ResponsiveContainer width="100%" height={300}><BarChart data={latestDistricts}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="district" angle={-35} textAnchor="end" height={72} tickFormatter={(value) => districtLabel(value, language)} /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="quarterlyIndex" name={label('季指數', 'Quarterly index')} fill="#737d68" /></BarChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('最新季各行政區標準單價', 'Latest District Standard Unit Price')}><ResponsiveContainer width="100%" height={300}><BarChart data={latestDistricts}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="district" angle={-35} textAnchor="end" height={72} tickFormatter={(value) => districtLabel(value, language)} /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="standardHousingUnitPriceTenThousandNtdPerPing" name={label('標準單價', 'Standard unit price')} fill="#c58a43" /></BarChart></ResponsiveContainer></ChartSection>
    </div>
    <MetricStrip items={[
      { label: label('季指數最低行政區', 'Lowest district index'), value: districtLabel(lowIndex?.district, language) },
      { label: label('標準單價最低行政區', 'Lowest district unit price'), value: districtLabel(lowUnit?.district, language) },
      { label: label('標準單價最高', 'Highest unit price'), value: formatWan(topUnit?.standardHousingUnitPriceTenThousandNtdPerPing, language, language === 'zh' ? '萬元/坪' : 'NTD 10k / ping') },
      { label: label('標準單價最低', 'Lowest unit price'), value: formatWan(lowUnit?.standardHousingUnitPriceTenThousandNtdPerPing, language, language === 'zh' ? '萬元/坪' : 'NTD 10k / ping') },
    ]} />
    <section className="analysis-list">
      <h2>{label('住宅季指數資料表', 'Quarterly Price Index Table')}</h2>
      <details className="filters" open><summary>{copy[language].filters}</summary><div className="filter-grid">
        <label><span>{label('類別型態', 'Category type')}</span><select value={categoryType} onChange={(event) => setCategoryType(event.target.value)}><option value="">{label('全部', 'All')}</option><option value="citywide">{label('全市', 'Citywide')}</option><option value="housing_type">{label('住宅類型', 'Housing type')}</option><option value="district">{label('行政區', 'District')}</option></select></label>
        <label><span>{label('類別', 'Category')}</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">{label('全部類別', 'All categories')}</option>{categories.map((item) => <option key={item} value={item}>{districtLabel(item, language)}</option>)}</select></label>
        <label><span>{copy[language].year}</span><select value={year} onChange={(event) => setYear(event.target.value)}><option value="">{label('全部年份', 'All years')}</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span>{copy[language].quarter}</span><select value={quarter} onChange={(event) => setQuarter(event.target.value)}><option value="">{label('全部季度', 'All quarters')}</option>{[1, 2, 3, 4].map((item) => <option key={item} value={item}>Q{item}</option>)}</select></label>
        <label className="search-field"><span>{label('搜尋', 'Search')}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={label('搜尋類別、季別、行政區或住宅類型', 'Search category, quarter, district, or housing type')} type="search" /></label>
      </div></details>
      <p className="table-count">{filtered.length.toLocaleString()} {label('筆紀錄', 'records')}</p>
      <div className="table-wrap"><table><thead><tr>{[label('季別', 'Quarter'), label('類別', 'Category'), label('型態', 'Type'), label('季指數', 'Quarterly index'), label('季變動率', 'Quarterly change'), label('標準總價', 'Standard total price'), label('標準單價', 'Standard unit price'), label('年變動率', 'YoY change')].map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{visible.map((record) => <tr key={record.id}><td>{record.quarterKey}</td><th>{districtLabel(record.category, language)}</th><td>{record.categoryType}</td><td>{record.quarterlyIndex?.toFixed(2) ?? '—'}</td><td>{formatSourcePercent(record.quarterlyChangePercent)}</td><td>{formatWan(record.standardHousingTotalPriceTenThousandNtd, language, language === 'zh' ? '萬元' : 'NTD 10k')}</td><td>{formatWan(record.standardHousingUnitPriceTenThousandNtdPerPing, language, language === 'zh' ? '萬元/坪' : 'NTD 10k / ping')}</td><td>{formatSourcePercent(record.quarterlyIndexYoYChangePercent)}</td></tr>)}</tbody></table></div>
      <nav className="pagination" aria-label="Pagination"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>{copy[language].previous}</button><span>{copy[language].page} {Math.min(page, pages)} / {pages}</span><button disabled={page === pages} onClick={() => setPage((value) => value + 1)}>{copy[language].next}</button></nav>
    </section>
  </>;
}

function ResidentialRentIndex({ data, language }: { data: DataBundle; language: Language }) {
  const t = copy[language];
  const [category, setCategory] = useState('');
  const [year, setYear] = useState('');
  const [quarter, setQuarter] = useState('');
  const [hasChange, setHasChange] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const records = data.rentIndexRecords;
  const filtered = useMemo(() => filterRentIndexRecords(records, { category, year, quarter, hasQuarterlyChangeRate: hasChange, search }), [records, category, year, quarter, hasChange, search]);
  useEffect(() => setPage(1), [filtered]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const latest = data.rentIndexSummary.latestByCategory;
  const citywide = latest.find((item) => item.rentIndexCategory === 'citywide');
  const elevator = latest.find((item) => item.rentIndexCategory === 'elevator_building');
  const apartment = latest.find((item) => item.rentIndexCategory === 'apartment');
  const latestByPrice = [...latest].filter((item) => item.standardRentUnitPriceNtdPerPingMonthly !== undefined)
    .sort((a, b) => (b.standardRentUnitPriceNtdPerPingMonthly ?? 0) - (a.standardRentUnitPriceNtdPerPingMonthly ?? 0));
  const lineData = data.rentIndexSummary.byQuarter.map((row) => ({
    ...row,
    elevatorBuildingSpread: row.elevatorBuildingStandardRentUnitPrice !== undefined && row.apartmentStandardRentUnitPrice !== undefined
      ? row.elevatorBuildingStandardRentUnitPrice - row.apartmentStandardRentUnitPrice
      : undefined,
    rentIndexSpread: row.elevatorBuildingRentIndex !== undefined && row.apartmentRentIndex !== undefined
      ? row.elevatorBuildingRentIndex - row.apartmentRentIndex
      : undefined,
  }));
  const changeData = [...new Set(records.map((record) => record.quarterKey).filter((value): value is string => !!value))].sort().map((quarterKey) => {
    const items = records.filter((record) => record.quarterKey === quarterKey);
    const byType = new Map(items.map((record) => [record.rentIndexCategory, record]));
    return {
      quarterKey,
      citywideChange: byType.get('citywide')?.quarterlyChangeRatePercent,
      elevatorBuildingChange: byType.get('elevator_building')?.quarterlyChangeRatePercent,
      apartmentChange: byType.get('apartment')?.quarterlyChangeRatePercent,
    };
  });
  const latestChart = latest.map((item) => ({ ...item, categoryLabel: rentCategoryLabel(item.rentIndexCategory, language) }));
  return <>
    <section className="section-intro">
      <h2>{t.residentialRentIndex}</h2>
      <p>{t.rentIndexSubtitle}</p>
      <p className="notice">{t.rentIndexDisclaimer}</p>
    </section>
    <MetricStrip items={[
      { label: t.latestQuarterRent, value: data.rentIndexSummary.latestQuarterKey ?? '—' },
      { label: t.citywideRentIndex, value: citywide?.quarterlyRentIndex?.toFixed(2) ?? '—' },
      { label: t.citywideQuarterlyChange, value: formatSourcePercent(citywide?.quarterlyChangeRatePercent) },
      { label: t.citywideStandardRentUnitPrice, value: formatRentUnit(citywide?.standardRentUnitPriceNtdPerPingMonthly, language) },
      { label: t.elevatorBuildingStandardRentUnitPrice, value: formatRentUnit(elevator?.standardRentUnitPriceNtdPerPingMonthly, language) },
      { label: t.apartmentStandardRentUnitPrice, value: formatRentUnit(apartment?.standardRentUnitPriceNtdPerPingMonthly, language) },
      { label: t.highestStandardRentCategory, value: latestByPrice[0] ? rentCategoryLabel(latestByPrice[0].rentIndexCategory, language) : '—' },
      { label: t.lowestStandardRentCategory, value: latestByPrice.at(-1) ? rentCategoryLabel(latestByPrice.at(-1)!.rentIndexCategory, language) : '—' },
    ]} />
    <div className="chart-grid">
      <ChartSection title={t.rentIndexOverTimeByCategory}><ResponsiveContainer width="100%" height={320}>
        <LineChart data={lineData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="quarterKey" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Legend /><Line dataKey="citywideRentIndex" name={rentCategoryLabel('citywide', language)} stroke="#b24738" strokeWidth={3} dot={false} /><Line dataKey="elevatorBuildingRentIndex" name={rentCategoryLabel('elevator_building', language)} stroke="#356f9d" strokeWidth={3} dot={false} /><Line dataKey="apartmentRentIndex" name={rentCategoryLabel('apartment', language)} stroke="#737d68" strokeWidth={3} dot={false} /></LineChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={t.standardRentUnitPriceOverTimeByCategory}><ResponsiveContainer width="100%" height={320}>
        <LineChart data={lineData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="quarterKey" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Legend /><Line dataKey="citywideStandardRentUnitPrice" name={rentCategoryLabel('citywide', language)} stroke="#b24738" strokeWidth={3} dot={false} /><Line dataKey="elevatorBuildingStandardRentUnitPrice" name={rentCategoryLabel('elevator_building', language)} stroke="#356f9d" strokeWidth={3} dot={false} /><Line dataKey="apartmentStandardRentUnitPrice" name={rentCategoryLabel('apartment', language)} stroke="#737d68" strokeWidth={3} dot={false} /></LineChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={t.quarterlyChangeRateOverTimeByCategory}><ResponsiveContainer width="100%" height={320}>
        <LineChart data={changeData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="quarterKey" /><YAxis unit="%" /><Tooltip content={<ChartTooltip language={language} />} /><Legend /><Line dataKey="citywideChange" name={rentCategoryLabel('citywide', language)} stroke="#b24738" strokeWidth={3} dot={false} /><Line dataKey="elevatorBuildingChange" name={rentCategoryLabel('elevator_building', language)} stroke="#356f9d" strokeWidth={3} dot={false} /><Line dataKey="apartmentChange" name={rentCategoryLabel('apartment', language)} stroke="#737d68" strokeWidth={3} dot={false} /></LineChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={t.latestRentIndexByCategory}><ResponsiveContainer width="100%" height={320}>
        <BarChart data={latestChart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="categoryLabel" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="quarterlyRentIndex" name={t.quarterlyRentIndex} fill="#b24738" /></BarChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={t.latestStandardRentUnitPriceByCategory}><ResponsiveContainer width="100%" height={320}>
        <BarChart data={latestChart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="categoryLabel" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="standardRentUnitPriceNtdPerPingMonthly" name={t.standardRentUnitPriceNtdPerPingMonthly} fill="#356f9d" /></BarChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={t.yoyRentIndexChangeByCategory}><ResponsiveContainer width="100%" height={320}>
        <BarChart data={latestChart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="categoryLabel" /><YAxis unit="%" /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="yearOverYearRentIndexChangePercent" name={t.yearOverYearRentIndexChangePercent} fill="#737d68" /></BarChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={t.yoyStandardRentUnitPriceChangeByCategory}><ResponsiveContainer width="100%" height={320}>
        <BarChart data={latestChart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="categoryLabel" /><YAxis unit="%" /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="yearOverYearStandardRentUnitPriceChangePercent" name={t.yearOverYearStandardRentUnitPriceChangePercent} fill="#775f86" /></BarChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={t.categorySpreadOverTime} note={language === 'zh' ? '左右軸分別顯示標準租金單價差與租金指數差。' : 'Left and right axes separate standard rent unit-price spread and rent-index spread.'}><ResponsiveContainer width="100%" height={320}>
        <LineChart data={lineData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="quarterKey" /><YAxis yAxisId="left" /><YAxis yAxisId="right" orientation="right" /><Tooltip content={<ChartTooltip language={language} />} /><Legend /><Line yAxisId="left" dataKey="elevatorBuildingSpread" name={`${rentCategoryLabel('elevator_building', language)} - ${rentCategoryLabel('apartment', language)} ${t.standardRentUnitPriceUnit}`} stroke="#356f9d" strokeWidth={3} dot={false} /><Line yAxisId="right" dataKey="rentIndexSpread" name={`${rentCategoryLabel('elevator_building', language)} - ${rentCategoryLabel('apartment', language)} ${t.quarterlyRentIndex}`} stroke="#b24738" strokeWidth={3} dot={false} /></LineChart>
      </ResponsiveContainer></ChartSection>
    </div>
    <section className="analysis-list">
      <h2>{t.rentIndexTable}</h2>
      <RentIndexFilters language={language} records={records} category={category} setCategory={setCategory} year={year} setYear={setYear} quarter={quarter} setQuarter={setQuarter} hasChange={hasChange} setHasChange={setHasChange} search={search} setSearch={setSearch} />
      <p className="table-count">{filtered.length.toLocaleString()} {language === 'zh' ? '筆紀錄' : 'records'}</p>
      <div className="table-wrap"><table><thead><tr>
        {[t.rentIndexCategory, t.periodRaw, t.year, t.quarter, t.quarterlyRentIndex, t.quarterlyChangeRatePercent, t.standardRentUnitPriceNtdPerPingMonthly, t.yearOverYearRentIndexChangePercent].map((label) => <th key={label}>{label}</th>)}
      </tr></thead><tbody>{visible.map((record) => <tr key={record.id}>
        <td>{rentCategoryLabel(record.rentIndexCategory, language)}</td>
        <td>{record.periodRaw}</td>
        <td>{record.year ?? '—'}</td>
        <td>{record.quarter ? `Q${record.quarter}` : '—'}</td>
        <td>{record.quarterlyRentIndex?.toFixed(2) ?? '—'}</td>
        <td>{formatSourcePercent(record.quarterlyChangeRatePercent)}</td>
        <td>{formatRentUnit(record.standardRentUnitPriceNtdPerPingMonthly, language)}</td>
        <td>{formatSourcePercent(record.yearOverYearRentIndexChangePercent)}</td>
      </tr>)}</tbody></table></div>
      <nav className="pagination" aria-label="Pagination">
        <button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>{t.previous}</button>
        <span>{t.page} {page} / {pages}</span>
        <button disabled={page === pages} onClick={() => setPage((value) => value + 1)}>{t.next}</button>
      </nav>
    </section>
  </>;
}

function DistrictComparison({ rows, language }: { rows: DistrictComparisonSummary[]; language: Language }) {
  const t = copy[language];
  const [sortKey, setSortKey] = useState<keyof DistrictComparisonSummary>('transactionsPer1000Residents');
  const sorted = sortDistricts(rows, sortKey, 'desc');
  const chartData = rows.map((row) => ({
    district: districtLabel(row.district, language),
    transactions: row.realEstate?.transactionCount,
    price: row.medianUnitPricePerPingNtd,
    perThousand: row.transactionsPer1000Residents,
    senior: row.seniorShare ? row.seniorShare * 100 : undefined,
  }));
  return <>
    <p className="notice">{t.rentIndexDistrictComparisonUnavailableNotice}</p>
    <div className="chart-grid">
      <ChartSection title={t.medianUnitPriceByDistrict}><ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tickFormatter={(value) => formatPriceAxis(value, language)} /><YAxis dataKey="district" type="category" width={74} /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="price" name={t.medianUnitPrice} fill="#b24738" /></BarChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={t.perThousand}><ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="district" angle={-35} textAnchor="end" height={72} /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="perThousand" name={t.perThousand} fill="#356f9d" /></BarChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={`${t.medianUnitPrice} × ${t.seniorShare}`} note={t.noCausation}><ResponsiveContainer width="100%" height={320}>
        <ScatterChart><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" dataKey="senior" name={t.seniorShare} unit="%" /><YAxis type="number" dataKey="price" name={t.medianUnitPrice} tickFormatter={(value) => formatPriceAxis(value, language)} /><Tooltip cursor={{ strokeDasharray: '3 3' }} /><Scatter data={chartData} fill="#356f9d" /></ScatterChart>
      </ResponsiveContainer></ChartSection>
    </div>
    <div className="table-wrap">
      <table><thead><tr>
        <th>{t.district}</th>
        {([
          ['realEstate', t.transactionCount],
          ['medianUnitPricePerPingNtd', t.medianUnitPrice],
          ['transactionsPer1000Residents', t.perThousand],
          ['seniorShare', t.seniorShare],
          ['workingAgeShare', t.workingAgeShare],
        ] as Array<[keyof DistrictComparisonSummary, string]>).map(([key, label]) =>
          <th key={String(key)}><button className="sort-button" onClick={() => setSortKey(key)}>{label}{sortKey === key ? ' ↓' : ''}</button></th>)}
      </tr></thead><tbody>{sorted.map((row) => <tr key={row.district}>
        <th>{districtLabel(row.district, language)}</th>
        <td>{row.realEstate?.transactionCount ?? '—'}</td>
        <td>{formatUnitPrice(row.medianUnitPricePerPingNtd, language)}</td>
        <td>{row.transactionsPer1000Residents?.toFixed(2) ?? '—'}</td>
        <td>{formatPercent(row.seniorShare)}</td>
        <td>{formatPercent(row.workingAgeShare)}</td>
      </tr>)}</tbody></table>
    </div>
  </>;
}

function QuarterlyAnalysis({ data, language }: { data: DataBundle; language: Language }) {
  const t = copy[language];
  const q = data.quarterlySummary;
  const chartData = data.quarterly.map((row) => ({ ...row, district: districtLabel(row.district, language) }));
  return <>
    <MetricStrip items={[
      { label: t.latestQuarter, value: q.latestQuarter ?? '—' },
      { label: t.totalSaleCases, value: q.totalSaleCaseCount.toLocaleString() },
      { label: t.residentialCases, value: q.residentialZoneCaseCount.toLocaleString() },
      { label: t.commercialCases, value: q.commercialZoneCaseCount.toLocaleString() },
      { label: t.industrialCases, value: q.industrialZoneCaseCount.toLocaleString() },
      { label: t.mostActiveDistrict, value: districtLabel(q.topDistrict, language) },
    ]} />
    <div className="chart-grid">
      <ChartSection title={t.totalSaleCases}><ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="district" angle={-35} textAnchor="end" height={72} /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="totalSaleCaseCount" name={t.totalSaleCases} fill="#b24738" /></BarChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={t.zoneComposition}><ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="district" angle={-35} textAnchor="end" height={72} /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Legend /><Bar dataKey="residentialZoneCaseCount" stackId="zone" name={t.residentialCases} fill="#356f9d" /><Bar dataKey="commercialZoneCaseCount" stackId="zone" name={t.commercialCases} fill="#b24738" /><Bar dataKey="industrialZoneCaseCount" stackId="zone" name={t.industrialCases} fill="#737d68" /></BarChart>
      </ResponsiveContainer></ChartSection>
    </div>
    <section className="analysis-list"><h2>{t.officialText}</h2>{data.quarterly.map((row) =>
      <details key={row.id}><summary>{districtLabel(row.district, language)} · {row.quarterLabel}</summary>
        <p lang="zh-Hant">{row.analysisText}</p>{language === 'en' && <small>Official Chinese text; no unofficial translation is presented.</small>}
      </details>)}</section>
  </>;
}

function DemographicContext({ data, language }: { data: DataBundle; language: Language }) {
  const t = copy[language];
  const latestPeriod = Math.max(...data.population.map((item) => item.year * 100 + item.month));
  const latest = data.population.filter((item) => item.year * 100 + item.month === latestPeriod);
  const chartData = latest.map((item) => ({ ...item, district: districtLabel(item.district, language), senior: item.seniorShare * 100 }));
  const trend = [...new Map(data.population.map((item) => {
    const period = `${item.year}-${String(item.month).padStart(2, '0')}`;
    const total = data.population.filter((row) => row.year === item.year && row.month === item.month).reduce((sum, row) => sum + row.totalPopulation, 0);
    return [period, { period, total }];
  })).values()];
  return <>
    <p className="notice notice-blue">{t.demographicNotice}</p>
    <p className="notice">{t.rentPopulationContextNotice}</p>
    <MetricStrip items={[
      { label: language === 'zh' ? '最新人口月份' : 'Latest population month', value: `${Math.floor(latestPeriod / 100)}-${String(latestPeriod % 100).padStart(2, '0')}` },
      { label: t.population, value: latest.reduce((sum, item) => sum + item.totalPopulation, 0).toLocaleString() },
      { label: language === 'zh' ? '人口最多行政區' : 'Largest district', value: districtLabel([...latest].sort((a, b) => b.totalPopulation - a.totalPopulation)[0]?.district, language) },
      { label: language === 'zh' ? '高齡占比最高' : 'Highest senior share', value: districtLabel([...latest].sort((a, b) => b.seniorShare - a.seniorShare)[0]?.district, language) },
    ]} />
    <div className="chart-grid">
      <ChartSection title={t.populationByDistrict}><ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="district" angle={-35} textAnchor="end" height={72} /><YAxis tickFormatter={(value) => `${Math.round(value / 10_000)}萬`} /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="totalPopulation" name={t.population} fill="#356f9d" /></BarChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={t.ageComposition}><ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="district" angle={-35} textAnchor="end" height={72} /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Legend /><Bar dataKey="age0To14" stackId="age" name="0–14" fill="#c58a43" /><Bar dataKey="age15To19" stackId="age" name="15–19" fill="#737d68" /><Bar dataKey="age20To34" stackId="age" name="20–34" fill="#408579" /><Bar dataKey="age35To44" stackId="age" name="35–44" fill="#356f9d" /><Bar dataKey="age45To64" stackId="age" name="45–64" fill="#775f86" /><Bar dataKey="age65Plus" stackId="age" name="65+" fill="#b24738" /></BarChart>
      </ResponsiveContainer></ChartSection>
      <ChartSection title={t.populationTrend}><ResponsiveContainer width="100%" height={320}>
        <LineChart data={trend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="period" /><YAxis domain={['dataMin - 20000', 'dataMax + 20000']} tickFormatter={(value) => `${(value / 1_000_000).toFixed(1)}m`} /><Tooltip content={<ChartTooltip language={language} />} /><Line dataKey="total" name={t.population} stroke="#356f9d" strokeWidth={3} dot={false} /></LineChart>
      </ResponsiveContainer></ChartSection>
    </div>
  </>;
}

function DataTable({ records, language }: { records: RealPriceRecord[]; language: Language }) {
  const t = copy[language];
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const pages = Math.max(1, Math.ceil(records.length / pageSize));
  useEffect(() => setPage(1), [records]);
  const visible = records.slice((page - 1) * pageSize, page * pageSize);
  return <>
    <p className="table-count">{records.length.toLocaleString()} {language === 'zh' ? '筆紀錄' : 'records'}</p>
    <div className="table-wrap"><table><thead><tr>
      {[t.district, t.date, t.recordType, t.target, t.buildingType, t.location, t.totalPrice, t.unitPrice, t.area, t.age, t.remarks].map((label) => <th key={label}>{label}</th>)}
    </tr></thead><tbody>{visible.map((record) => <tr key={record.id}>
      <td>{districtLabel(record.district, language)}</td>
      <td>{record.transactionDateRaw ?? '—'}</td>
      <td>{recordTypeLabel[record.recordType][language]}</td>
      <td>{record.transactionTargetRaw ?? '—'}</td>
      <td>{record.buildingTypeRaw || buildingTypeLabel[record.buildingType][language]}</td>
      <td>{record.locationText ?? '—'}</td>
      <td>{formatNtd(record.recordType === 'rent' ? record.rentPriceNtd : record.totalPriceNtd, language)}</td>
      <td>{record.recordType === 'rent'
        ? `${record.unitPricePerPingNtd?.toLocaleString() ?? '—'} ${language === 'zh' ? '元/坪/月' : 'NTD/ping/month'}`
        : formatUnitPrice(record.unitPricePerPingNtd, language)}</td>
      <td>{record.buildingAreaPing ? `${record.buildingAreaPing.toFixed(1)} 坪` : '—'}</td>
      <td>{record.buildingAgeYears === undefined ? '—' : `${record.buildingAgeYears} ${language === 'zh' ? '年' : 'yr'}`}</td>
      <td>{record.remarks ?? '—'}</td>
    </tr>)}</tbody></table></div>
    <nav className="pagination" aria-label="Pagination">
      <button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>{t.previous}</button>
      <span>{t.page} {page} / {pages}</span>
      <button disabled={page === pages} onClick={() => setPage((value) => value + 1)}>{t.next}</button>
    </nav>
  </>;
}

function DataNotes({ language }: { language: Language }) {
  const t = copy[language];
  return <article className="notes">
    <h2>{t.dataNotes}</h2>
    {language === 'zh' ? <>
      <p>本網站整理臺北市公開資料中的實價登錄、每季動態分析、住宅價格指數、住宅租金指數、土地使用管制、消費者物價指數、城市用電、地價稅級距、使用執照摘要、所得收入與人口年齡資料，僅供資料探索與區域或市場趨勢觀察使用，並非不動產估價、租金估價、建物安全判定、產權查證、合法使用認定、稅務判斷、土地使用管制證明、建築許可、開發權利判定、投資建議或價格預測。</p>
      <ul><li>週報總價以萬元轉為新臺幣；買賣單價由萬元/坪轉為新臺幣/坪。租賃單價保留元/坪/月。</li><li>民國年加 1911 轉為西元年；無法辨識的日期保留原值並寫入轉換報告。</li><li>{t.residentialPriceIndexDataNote}</li><li>{t.residentialPriceIndexInterpretationNote}</li><li>住宅價格季指數以實價登錄資料庫為基礎，整理全市、公寓、大樓、小宅與12行政區季資料；欄位包含季指數、季變動率、標準住宅總價與標準住宅單價。季指數不代表個別住宅估價、實際成交價格、購屋建議、售屋建議、投資建議、房貸建議或價格預測。</li><li>住宅價格季指數未提供個別地址或經緯度；本網站不建立精確地圖點位，行政區排名排除全市與住宅類型列。</li><li>土地使用內容與使用管制彙整表提供行政區、分區、筆數、建蔽率、容積率上限與面積；本網站只做行政區與分區層級整理，不建立精確地圖點位、地號查詢、分區邊界或個別基地推論，衍生估算不代表可建面積、建築許可、土地使用管制證明、法律意見或開發權利保證。</li><li>{t.rentIndexDataNote}</li><li>{t.commercialOfficeRentIndexDataNote}</li><li>{t.commercialOfficeRentIndexInterpretationNote}</li><li>商辦租金指數不含行政區、地址或經緯度，本網站不建立地圖點位。</li><li>所得收入資料以 Big5/CP950 解碼，行政區排名排除「總平均」列；僅供所得與負擔能力背景觀察，不代表個別所得、稅務、貸款、投資、財務建議或市場預測，也不建立精確地圖點位。</li><li>消費者物價指數基本分類年指數以 Big5/CP950 解碼，民國年轉為西元年，並以語意分類鍵整理變動過的序號前綴；僅供物價、所得、租金與居住負擔背景使用，不代表個人或家庭實際通膨率、即時價格、房價預測、租金預測、購屋能力判斷、投資建議、房貸建議、政策成效判定、財務建議或官方背書，也不建立地圖點位。</li><li>台灣電力公司臺北市售電量資料以 UTF-8-SIG 解碼並支援 Big5/CP950 fallback，民國年轉為西元年，[千度] 欄位保留為千度並衍生 kWh；僅供城市用電、公共設施需求與經濟活動背景，不代表即時用電、個別用戶或建物用電、行政區用電、電價、停電風險、電網可靠度、碳排放或能源效率評估，也不建立地圖點位。</li><li>地價稅累進起點地價及課稅級距資料以 UTF-8-SIG 解碼並支援 Big5/CP950 fallback，保留來源公式原文並解析一般土地級距、稅率、累進差額與不同用地稅率；解析結果僅供視覺化與來源欄位整理，不代表正式稅額計算、稅務建議、法律意見、節稅規劃、申報指引或官方計算結果。資料未提供地址、行政區、地段、地號或經緯度，因此不建立地圖點位、行政區分布或個別土地分析。</li><li>動產擔保登記資料提供登記編號、核准日期、擔保類別、契約期間、債務人、擔保權人、標的物種類、所在地、標的物總金額與擔保債權金額等來源欄位；僅供融資與擔保背景觀察，不代表不動產抵押、房貸、即時權利狀態、信用評等、違約風險、法律意見、投資建議或完整債務資料庫。</li><li>動產擔保登記資料未提供官方座標；本網站只解析地址文字中的行政區，不進行地理編碼或建立精確地圖點位。遮罩統編會原樣保留，不推測缺漏識別資訊。</li><li>使用執照大型 XML 在建置階段串流解析成摘要、分年統計與分塊 JSON；前端不載入原始 XML，也不進行地址地理編碼。</li><li>使用執照摘要僅供建物供給、建築年代與區域趨勢觀察，不等同正式使用執照謄本、最新建管資料、建物安全判定、產權查證、合法使用認定、不動產估價、租金估價或投資建議。</li><li>動產質借處營業概況提供年度營運統計，欄位包含分處別、項目、本年質借件數、本金、現金利息收入與變賣金額；僅供社會經濟背景觀察，不代表房價、租金、房貸壓力、個人信用、貧窮程度、投資訊號、借貸建議或財務決策依據。</li><li>人口資料使用行政區總計列，避免同時加總行政區、里別與男女列。</li></ul>
    </> : <>
      <p>This site organizes Taipei public-data records for real-price registration, quarterly market analysis, residential price indexes, residential rent index, land-use control, consumer price indexes, city electricity demand, land value tax brackets, building use-permit summaries, income, and population-by-age data for data exploration and regional or market trend observation only. It is not real-estate appraisal, rent appraisal, building-safety assessment, title verification, legal-use determination, tax judgment, zoning certificate, building permit, development-right determination, investment advice, or price prediction.</p>
      <ul><li>Weekly total prices are converted from NT$10,000; sale unit prices are converted from NT$10,000/ping. Rental unit prices remain NTD/ping/month.</li><li>ROC years are converted by adding 1911. Unparsed values remain in the report.</li><li>{t.residentialPriceIndexDataNote}</li><li>{t.residentialPriceIndexInterpretationNote}</li><li>The residential price quarterly index is compiled from real-price registration data and organizes citywide, apartment, building, small-unit, and 12-district quarterly records. It includes quarterly index, quarterly change, standard total price, and standard unit price. It is not individual-home appraisal, actual transaction price, home-buying advice, home-selling advice, investment advice, mortgage advice, or price forecast.</li><li>The residential price quarterly index has no individual address or coordinate fields. No exact map points are generated, and district rankings exclude citywide and housing-type rows.</li><li>The land-use and development-control summary provides district, zoning name, count, BCR, FAR upper limit, and area. This site only summarizes district and zoning-name rows; it does not create exact map points, parcel lookup, zoning boundaries, or parcel-level rights inference. Derived estimates are not buildable area, building permission, zoning certification, legal advice, or development-right guarantees.</li><li>{t.rentIndexDataNote}</li><li>{t.commercialOfficeRentIndexDataNote}</li><li>{t.commercialOfficeRentIndexInterpretationNote}</li><li>Commercial office rent index data has no district, address, or coordinate fields; no map markers are generated.</li><li>Income data is decoded as Big5/CP950, district rankings exclude the city-average row, and the data is income and affordability context only. It is not individual income, tax, lending, investment, financial advice, or market prediction, and no exact map points are generated.</li><li>Annual CPI by basic classification is decoded as Big5/CP950, ROC years are converted to Gregorian years, and semantic keys normalize source labels whose ordinal prefixes changed. It is price, income, rent, and housing-affordability context only, not individual or household inflation, realtime prices, housing/rent forecasts, home-purchasing ability determination, investment advice, mortgage advice, policy-effectiveness determination, financial advice, or official endorsement. No map points are generated.</li><li>Taipower Taipei electricity sales data is decoded as UTF-8-SIG with Big5/CP950 fallback, ROC years are converted to Gregorian years, and [thousand kWh] fields are preserved while derived kWh fields are generated. It is city electricity, infrastructure demand, and economic-activity context only, not realtime demand, individual or building-level use, district-level electricity distribution, prices, outage risk, grid reliability, carbon emissions, or energy-efficiency assessment. No map points are generated.</li><li>Land value tax progressive starting point and bracket data is decoded as UTF-8-SIG with Big5/CP950 fallback. This site preserves source formulas and parses general land brackets, tax rates, progressive difference amounts, and land-use-specific tax rates. Parsed values are for visualization and source-field organization only, not official tax calculation, tax advice, legal advice, tax planning, filing guidance, or official calculation result. The data has no address, district, land section, parcel number, or coordinates, so no map points, district distributions, or individual land-parcel analysis are generated.</li><li>Movable property secured transaction records provide source fields such as registration number, approval date, secured transaction type, contract period, debtor, secured party, collateral type, collateral location, collateral value, and secured debt amount. They are financing and collateral context only, not real-estate mortgages, housing loans, real-time rights status, credit ratings, default risk, legal advice, investment advice, or a complete debt registry.</li><li>Movable property secured transaction records have no official coordinates. This site only parses districts from source text and does not geocode or create exact map points. Masked business numbers are preserved as source text and not inferred.</li><li>Large use-permit XML is parsed through a build-time stream into summaries, yearly statistics, and chunked JSON. The frontend never loads raw XML or geocodes addresses.</li><li>Use-permit summaries are building-stock context only; they are not official transcripts, current building-management records, safety assessments, title verification, legal-use determination, appraisal, or investment advice.</li><li>Movable-property pledge business statistics are annual operating statistics for socioeconomic context only. They do not represent real-estate prices, rents, mortgage stress, individual credit status, poverty level, investment signals, lending advice, or financial decisions.</li><li>District total population rows avoid double-counting district, village, male, and female levels.</li></ul>
    </>}
    <div className="source-links">
      <a href="https://data.taipei/dataset/detail?id=a9a97996-3a55-46c8-9076-e5ebdefad6dc">臺北市實價周報</a>
      <a href="https://data.taipei/dataset/detail?id=ce4ea2c6-6334-44f8-945a-5705492b187d">臺北市住宅價格月指數</a>
      <a href="https://data.taipei/dataset/detail?id=954911b5-896d-4ae1-9ebe-87c4ba8a191e">臺北市住宅價格季指數</a>
      <a href="https://data.taipei/dataset/detail?id=53e5ee8d-9a90-42bc-9874-3a8747ae6afa">每季動態分析</a>
      <a href="https://data.taipei/dataset/detail?id=029c6d0d-c880-4de7-b2fb-9e56669a6f20">住宅租金指數</a>
      <a href="https://data.taipei/dataset/detail?id=8a3d1df7-9169-4dd0-ae0a-949d970e9bb3">商辦租金指數</a>
      <a href="https://data.taipei/dataset/detail?id=7ee57050-4d27-482c-bae5-ebd15ca86702">臺北市消費者物價指數基本分類年指數</a>
      <a href="https://data.taipei/dataset/detail?id=9bfb5424-1996-461a-b19b-f75101e2f459">台灣電力公司臺北市售電量</a>
      <a href="https://data.taipei/dataset/detail?id=d61ca24b-7b2b-4e75-8004-c568902e6300">臺北市土地使用內容與使用管制彙整表</a>
      <a href="https://data.taipei/dataset/detail?id=60e5f439-0cc0-4163-a91e-98241b6846c3">地價稅累進起點地價及課稅級距</a>
      <a href="https://data.taipei/dataset/detail?id=c876ff02-af2e-4eb8-bd33-d444f5052733">臺北市歷年使用執照摘要</a>
      <a href="https://data.taipei/dataset/detail?id=33da4ba0-c366-45eb-a71f-1991e6455ed6">臺北市所得收入者每人所得</a>
      <a href="https://data.taipei/dataset/detail?id=a6394e3f-3514-4542-87bd-de4310a40db3">人口年齡資料</a>
      <a href="https://data.taipei/dataset/detail?id=da9ed005-8f06-446a-b61a-d46e7d8d6ac9">臺北市動產質借處營業概況</a>
      <a href="https://data.taipei/dataset/detail?id=cb964837-c602-4238-b6c0-f63ad1094d5e">臺北市動產擔保登記資料</a>
      <a href={`${base}data/conversion-report.json`}>{language === 'zh' ? '轉換報告' : 'Conversion report'}</a>
    </div>
  </article>;
}

type PermitYearSummary = { year: number; recordCount: number; totalHouseholdCount: number; totalBuildingAreaSqm: number; totalCarParkingSpaces: number; totalMotorcycleParkingSpaces: number; medianAboveGroundFloors?: number; medianBuildingHeightM?: number };
type PermitDistrictSummary = { district: string; recordCount: number; totalHouseholdCount: number; totalBuildingAreaSqm: number; medianAboveGroundFloors?: number; medianBuildingHeightM?: number };
type PermitManifest = { chunks: Array<{ chunkType: 'by_year_district' | 'detail'; key: string; path: string }> };

function BuildingUsePermits({ language }: { language: Language }) {
  const t = copy[language]; const [summary, setSummary] = useState<BuildingUsePermitSummary>(); const [years, setYears] = useState<PermitYearSummary[]>([]); const [districts, setDistricts] = useState<PermitDistrictSummary[]>([]); const [manifest, setManifest] = useState<PermitManifest>(); const [detailIndex, setDetailIndex] = useState<Record<string, string>>({}); const [year, setYear] = useState(''); const [records, setRecords] = useState<BuildingUsePermitRecord[]>([]); const [district, setDistrict] = useState(''); const [search, setSearch] = useState(''); const [construction, setConstruction] = useState(''); const [page, setPage] = useState(1); const [detail, setDetail] = useState<BuildingUsePermitDetailRecord>();
  useEffect(() => { Promise.all([loadJson<BuildingUsePermitSummary>('building-use-permits/summary.json'), loadJson<PermitYearSummary[]>('building-use-permits/yearly-summary.json'), loadJson<PermitDistrictSummary[]>('building-use-permits/district-summary.json'), loadJson<PermitManifest>('building-use-permits/manifest.json'), loadJson<Record<string, string>>('building-use-permits/detail-index.json')]).then(([nextSummary, nextYears, nextDistricts, nextManifest, nextDetailIndex]) => { setSummary(nextSummary); setYears(nextYears); setDistricts(nextDistricts); setManifest(nextManifest); setDetailIndex(nextDetailIndex); setYear(String(nextYears.at(-1)?.year ?? '')); }).catch(() => undefined); }, []);
  useEffect(() => { if (!year || !manifest) return; const paths = manifest.chunks.filter((chunk) => chunk.chunkType === 'by_year_district' && chunk.key.startsWith(`${year}-`)).map((chunk) => `building-use-permits/${chunk.path}`); Promise.all(paths.map((path) => loadJson<BuildingUsePermitRecord[]>(path))).then((chunks) => setRecords(chunks.flat())).catch(() => setRecords([])); setPage(1); }, [year, manifest]);
  const filtered = useMemo(() => records.filter((record) => (!district || record.district === district) && (!construction || record.constructionType === construction) && (!search || [record.permitNumber, record.primaryAddress, record.district, record.constructionTypeRaw, record.structureTypePrimary].some((value) => value?.toLocaleLowerCase().includes(search.toLocaleLowerCase())))), [records, district, construction, search]); const pages = Math.max(1, Math.ceil(filtered.length / 25)); const visible = filtered.slice((page - 1) * 25, page * 25);
  const openDetail = async (record: BuildingUsePermitRecord) => { const path = detailIndex[record.id]; if (!path) return; const details = await loadJson<BuildingUsePermitDetailRecord[]>(`building-use-permits/${path}`); setDetail(details.find((item) => item.id === record.id)); };
  if (!summary) return <p className="status">{t.loading}</p>;
  return <>
    <section className="section-intro"><h2>{t.buildingUsePermits}</h2><p>{t.buildingUsePermitSubtitle}</p><p className="notice">{t.buildingUsePermitDisclaimer}</p></section>
    <MetricStrip items={[{ label: t.usePermitRecordCount, value: summary.totalRecords.toLocaleString() }, { label: t.dataYearRange, value: `${summary.minPermitYearGregorian}–${summary.maxPermitYearGregorian}` }, { label: t.latestIssueDate, value: summary.maxIssueDate ?? '—' }, { label: t.permitDistrictsCovered, value: summary.districtCount }, { label: t.totalHouseholdCount, value: summary.totalHouseholdCount.toLocaleString() }, { label: t.totalBuildingArea, value: `${Math.round(summary.totalBuildingAreaSqm).toLocaleString()} sqm` }, { label: t.medianAboveGroundFloors, value: summary.medianAboveGroundFloors ?? '—' }, { label: t.medianBuildingHeight, value: summary.medianBuildingHeightM ? `${summary.medianBuildingHeightM} m` : '—' }]} />
    <div className="chart-grid"><ChartSection title={t.usePermitRecordsByYear} note={t.buildingUsePermitChartNotice}><ResponsiveContainer width="100%" height={300}><BarChart data={years}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="year" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="recordCount" name={t.recordCount} fill="#b24738" /></BarChart></ResponsiveContainer></ChartSection><ChartSection title={t.householdCountByPermitYear} note={t.buildingUsePermitChartNotice}><ResponsiveContainer width="100%" height={300}><LineChart data={years}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="year" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Line dataKey="totalHouseholdCount" name={t.totalHouseholdCount} stroke="#356f9d" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></ChartSection><ChartSection title={t.usePermitRecordsByDistrict} note={t.buildingUsePermitChartNotice}><ResponsiveContainer width="100%" height={300}><BarChart data={districts}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="district" angle={-35} textAnchor="end" height={72} /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="recordCount" name={t.recordCount} fill="#737d68" /></BarChart></ResponsiveContainer></ChartSection><ChartSection title={t.householdCountByDistrict} note={t.buildingUsePermitChartNotice}><ResponsiveContainer width="100%" height={300}><BarChart data={districts}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="district" angle={-35} textAnchor="end" height={72} /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="totalHouseholdCount" name={t.totalHouseholdCount} fill="#c58a43" /></BarChart></ResponsiveContainer></ChartSection></div>
    <section className="analysis-list"><h2>{t.permitTable}</h2><details className="filters" open><summary>{t.filters}</summary><div className="filter-grid"><label><span>{t.permitYear}</span><select value={year} onChange={(event) => setYear(event.target.value)}>{years.map((item) => <option key={item.year} value={item.year}>{item.year}</option>)}</select></label><label><span>{t.district}</span><select value={district} onChange={(event) => setDistrict(event.target.value)}><option value="">{t.allDistricts}</option>{DISTRICTS.map((item) => <option key={item} value={item}>{districtLabel(item, language)}</option>)}</select></label><label><span>{t.constructionType}</span><select value={construction} onChange={(event) => setConstruction(event.target.value)}><option value="">{t.allTypes}</option><option value="new_construction">{t.newConstruction}</option><option value="addition">{t.addition}</option><option value="repair">{t.repair}</option><option value="reconstruction">{t.reconstruction}</option></select></label><label className="search-field"><span>{language === 'zh' ? '搜尋' : 'Search'}</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.buildingUsePermitSearchPlaceholder} /></label></div></details><p className="table-count">{filtered.length.toLocaleString()} {t.recordCount}</p><div className="table-wrap"><table><thead><tr>{[t.permitYear, t.permitNumber, t.issueDate, t.district, t.primaryAddress, t.constructionType, t.structureType, t.aboveGroundFloors, t.householdCount].map((label) => <th key={label}>{label}</th>)}<th /></tr></thead><tbody>{visible.map((record) => <tr key={record.id}><td>{record.permitYearGregorian}</td><td>{record.permitNumber}</td><td>{record.issueDate}</td><td>{districtLabel(record.district, language)}</td><td>{record.primaryAddress}</td><td>{record.constructionTypeRaw}</td><td>{record.structureTypePrimary}</td><td>{record.buildingInfo?.aboveGroundFloors}</td><td>{record.buildingInfo?.householdCount}</td><td><button className="link-button" onClick={() => void openDetail(record)}>{language === 'zh' ? '明細' : 'Details'}</button></td></tr>)}</tbody></table></div><nav className="pagination"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>{t.previous}</button><span>{t.page} {page} / {pages}</span><button disabled={page === pages} onClick={() => setPage((value) => value + 1)}>{t.next}</button></nav></section>
    {detail && <section className="analysis-list"><h2>{detail.permitNumber}</h2><p className="notice">{t.buildingUsePermitDetailNotice}</p><dl className="detail-list"><div><dt>{t.primaryAddress}</dt><dd>{detail.allAddresses.join('；')}</dd></div><div><dt>{t.structureType}</dt><dd>{detail.structureTypeRaw}</dd></div><div><dt>{t.projectCostNtd}</dt><dd>{formatNtd(detail.projectCostNtd, language)}</dd></div><div><dt>{t.remarksCount}</dt><dd>{detail.remarksCount}</dd></div></dl></section>}
  </>;
}

function LandValue({ records, summary, language }: { records: LandParcelAssessedValueRecord[]; summary: LandParcelAssessedValueSummary; language: Language }) {
  const zh = language === 'zh'; const latest = summary.latestByDistrict; const totals = summary.latestCitywideTotals; const [year, setYear] = useState(String(summary.latestYear ?? '')); const [district, setDistrict] = useState(''); const selected = records.filter((record) => record.year === Number(year) && (!district || record.district === district)); const label = (zhText: string, enText: string) => zh ? zhText : enText; const formatValue = (value: number | undefined) => value === undefined ? '—' : formatNtd(value, language);
  return <><section className="section-intro"><h2>{label('土地筆數面積與公告土地現值', 'Land Parcel, Area & Announced Land Current Value Statistics')}</h2><p>{label('探索臺北市各行政區土地筆數、土地面積、公告土地現值總額與都市土地公有、私有、公私共有結構，作為土地存量與行政公告土地價值背景。', 'Explore district-level land-stock and announced land-value context by ownership structure.')}</p><p className="notice">{label('土地筆數面積及公告土地現值統計為地政公開資料中的行政區彙總資料，公告土地現值為官方公告之行政參考指標，並非市場成交價格、個別土地估價、不動產投資建議或價格預測。', 'Announced land current value is an official administrative reference indicator, not market transaction price, individual appraisal, investment advice, or price prediction.')}</p></section><MetricStrip items={[{ label: label('最新年度', 'Latest year'), value: summary.latestYear ?? '—' }, { label: label('涵蓋行政區數', 'Districts covered'), value: summary.districtCount }, { label: label('土地筆數總計', 'Total parcel count'), value: totals?.totalParcelCount?.toLocaleString() ?? '—' }, { label: label('土地面積總計', 'Total land area'), value: totals?.totalAreaHectares ? `${totals.totalAreaHectares.toLocaleString()} ha` : '—' }, { label: label('公告土地現值總額', 'Total announced land current value'), value: formatValue(totals?.totalAnnouncedLandCurrentValueNtd) }, { label: label('每公頃公告土地現值', 'Value per hectare'), value: formatValue(totals?.announcedLandCurrentValueNtdPerHectare) }]} /><div className="chart-grid"><ChartSection title={label('各行政區公告土地現值總額', 'Total announced land current value by district')}><ResponsiveContainer width="100%" height={300}><BarChart data={latest}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="district" angle={-35} textAnchor="end" height={72} /><YAxis tickFormatter={(value) => `${Math.round(value / 1e9)}B`} /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="totalAnnouncedLandCurrentValueNtd" fill="#b24738" /></BarChart></ResponsiveContainer></ChartSection><ChartSection title={label('全市公告土地現值年度趨勢', 'Citywide announced land current value by year')}><ResponsiveContainer width="100%" height={300}><LineChart data={summary.byYear}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="year" /><YAxis tickFormatter={(value) => `${Math.round(value / 1e9)}B`} /><Tooltip content={<ChartTooltip language={language} />} /><Line dataKey="totalAnnouncedLandCurrentValueNtd" stroke="#356f9d" strokeWidth={3} dot /></LineChart></ResponsiveContainer></ChartSection></div><section className="analysis-list"><h2>{label('土地現值資料表', 'Land Value Table')}</h2><details className="filters" open><summary>{label('篩選條件', 'Filters')}</summary><div className="filter-grid"><label><span>{label('年度', 'Year')}</span><select value={year} onChange={(event) => setYear(event.target.value)}>{summary.byYear.map((item) => <option key={item.year}>{item.year}</option>)}</select></label><label><span>{label('行政區', 'District')}</span><select value={district} onChange={(event) => setDistrict(event.target.value)}><option value="">{label('全部行政區', 'All districts')}</option>{DISTRICTS.map((item) => <option key={item}>{districtLabel(item, language)}</option>)}</select></label></div></details><div className="table-wrap"><table><thead><tr>{[label('行政區', 'District'), label('筆數總計', 'Parcels'), label('面積（公頃）', 'Area (ha)'), label('公告土地現值總額', 'Announced value'), label('每公頃公告土地現值', 'Value / ha')].map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{selected.map((record) => <tr key={record.id}><th>{districtLabel(record.district, language)}</th><td>{record.totalParcelCount?.toLocaleString()}</td><td>{record.totalAreaHectares?.toLocaleString()}</td><td>{formatValue(record.totalAnnouncedLandCurrentValueNtd)}</td><td>{formatValue(record.announcedLandCurrentValueNtdPerHectare)}</td></tr>)}</tbody></table></div></section></>;
}

function IncomePerEarnerByDistrictYear({ records, summary, latest, language }: { records: IncomePerEarnerByDistrictYearRecord[]; summary: IncomePerEarnerByDistrictYearSummary; latest: IncomePerEarnerByDistrictYearRecord[]; language: Language }) {
  const label = (zh: string, en: string) => language === 'zh' ? zh : en;
  const [year, setYear] = useState(String(summary.latestYear ?? ''));
  const [district, setDistrict] = useState('');
  const [includeAverage, setIncludeAverage] = useState(true);
  const [minTotal, setMinTotal] = useState('');
  const [maxTotal, setMaxTotal] = useState('');
  const [minDisposable, setMinDisposable] = useState('');
  const [maxDisposable, setMaxDisposable] = useState('');
  const [minEarners, setMinEarners] = useState('');
  const [maxEarners, setMaxEarners] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const years = [...new Set(records.map((record) => record.dataYear))].sort((a, b) => b - a);
  const inRange = (value: number | undefined, min: string, max: string) =>
    (min === '' || (value ?? -Infinity) >= Number(min)) && (max === '' || (value ?? Infinity) <= Number(max));
  const filtered = records.filter((record) => (!year || record.dataYear === Number(year))
    && (includeAverage || !record.isCityAverage)
    && (!district || record.district === district)
    && inRange(record.totalIncomeNtd, minTotal, maxTotal)
    && inRange(record.disposableIncomeNtd, minDisposable, maxDisposable)
    && inRange(record.incomeEarnerCount, minEarners, maxEarners)
    && (!search || `${record.dataYear} ${record.districtRaw} ${record.districtNormalized}`.toLowerCase().includes(search.toLowerCase())));
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
  const visible = filtered.slice((Math.min(page, pages) - 1) * 25, Math.min(page, pages) * 25);
  const latestDistricts = latest.filter((record) => !record.isCityAverage).sort((a, b) => (b.disposableIncomeNtd ?? 0) - (a.disposableIncomeNtd ?? 0));
  const cityTrend = summary.byYear.map((item) => ({ ...item, year: item.dataYear }));
  const top = summary.latestYearDistrictRanking[0];
  const low = summary.byYear.at(-1)?.lowestDistrictByDisposableIncome;
  useEffect(() => setPage(1), [year, district, includeAverage, minTotal, maxTotal, minDisposable, maxDisposable, minEarners, maxEarners, search]);
  return <>
    <section className="section-intro">
      <h2>{label('所得收入者每人所得', 'Income per Earner by District and Year')}</h2>
      <p>{label('整理臺北市主計處行政區別年度所得資料，觀察每位所得收入者所得收入總計、可支配所得、非消費支出與所得組成，作為負擔能力與社會經濟背景。', 'Explore annual district-level income per earner, disposable income, non-consumption expenditure, and income composition as affordability and socioeconomic context.')}</p>
      <p className="notice">{label('本資料僅供社會經濟與負擔能力背景觀察，不代表個別所得、稅務判斷、購屋能力認定、房價估值、投資建議、貸款建議、財務建議或市場預測。資料未提供地址或經緯度，本模組不建立精確地圖點位。', 'This data is socioeconomic and affordability context only. It does not represent individual income, tax judgment, purchase capacity, price appraisal, investment advice, lending advice, financial advice, or market prediction. The source has no addresses or coordinates, so this module does not create exact map points.')}</p>
    </section>
    <MetricStrip items={[
      { label: label('最新年度', 'Latest year'), value: summary.latestYear ?? '—' },
      { label: label('涵蓋行政區', 'Districts covered'), value: summary.districtCount },
      { label: label('總平均所得收入', 'City average total income'), value: formatNtd(summary.latestCityAverage?.totalIncomeNtd, language) },
      { label: label('總平均可支配所得', 'City average disposable income'), value: formatNtd(summary.latestCityAverage?.disposableIncomeNtd, language) },
      { label: label('可支配所得最高', 'Top disposable income'), value: districtLabel(top?.district, language) },
      { label: label('可支配所得最低', 'Lowest disposable income'), value: districtLabel(low, language) },
    ]} />
    <div className="chart-grid">
      <ChartSection title={label('總平均所得與可支配所得趨勢', 'City Average Total and Disposable Income Trend')}><ResponsiveContainer width="100%" height={300}><LineChart data={cityTrend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="year" /><YAxis tickFormatter={(value) => `${Math.round(value / 10000)}萬`} /><Tooltip content={<ChartTooltip language={language} />} /><Legend /><Line dataKey="cityAverageTotalIncomeNtd" name={label('所得收入總計', 'Total income')} stroke="#356f9d" strokeWidth={3} dot={false} /><Line dataKey="cityAverageDisposableIncomeNtd" name={label('可支配所得', 'Disposable income')} stroke="#b24738" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('最新年度行政區可支配所得', 'Latest Disposable Income by District')}><ResponsiveContainer width="100%" height={300}><BarChart data={latestDistricts}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="district" angle={-35} textAnchor="end" height={72} tickFormatter={(value) => districtLabel(value, language)} /><YAxis tickFormatter={(value) => `${Math.round(value / 10000)}萬`} /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="disposableIncomeNtd" name={label('可支配所得', 'Disposable income')} fill="#737d68" /></BarChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('最新年度所得收入總計', 'Latest Total Income by District')}><ResponsiveContainer width="100%" height={300}><BarChart data={latestDistricts}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="district" angle={-35} textAnchor="end" height={72} tickFormatter={(value) => districtLabel(value, language)} /><YAxis tickFormatter={(value) => `${Math.round(value / 10000)}萬`} /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="totalIncomeNtd" name={label('所得收入總計', 'Total income')} fill="#c58a43" /></BarChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('總平均所得組成', 'City Average Income Composition')}><ResponsiveContainer width="100%" height={300}><PieChart><Tooltip content={<ChartTooltip language={language} />} /><Pie data={summary.latestIncomeComposition.map((item) => ({ ...item, name: label(item.labelZh, item.labelEn) }))} dataKey="valueNtd" nameKey="name" innerRadius={62} outerRadius={104}>{summary.latestIncomeComposition.map((item, index) => <Cell key={item.key} fill={colors[index % colors.length]} />)}</Pie><Legend /></PieChart></ResponsiveContainer></ChartSection>
    </div>
    <section className="analysis-list">
      <h2>{label('所得收入資料表', 'Income Table')}</h2>
      <details className="filters" open><summary>{label('篩選條件', 'Filters')}</summary><div className="filter-grid">
        <label><span>{label('年度', 'Year')}</span><select value={year} onChange={(event) => setYear(event.target.value)}><option value="">{label('全部年度', 'All years')}</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span>{label('行政區', 'District')}</span><select value={district} onChange={(event) => setDistrict(event.target.value)}><option value="">{label('全部行政區', 'All districts')}</option>{DISTRICTS.map((item) => <option key={item} value={item}>{districtLabel(item, language)}</option>)}</select></label>
        <label className="checkbox-field"><input type="checkbox" checked={includeAverage} onChange={(event) => setIncludeAverage(event.target.checked)} /> <span>{label('包含總平均', 'Include city average')}</span></label>
        <label><span>{label('所得收入範圍', 'Total income range')}</span><input type="number" value={minTotal} onChange={(event) => setMinTotal(event.target.value)} placeholder={label('最小', 'Min')} /></label>
        <label><span>&nbsp;</span><input type="number" value={maxTotal} onChange={(event) => setMaxTotal(event.target.value)} placeholder={label('最大', 'Max')} /></label>
        <label><span>{label('可支配所得範圍', 'Disposable income range')}</span><input type="number" value={minDisposable} onChange={(event) => setMinDisposable(event.target.value)} placeholder={label('最小', 'Min')} /></label>
        <label><span>&nbsp;</span><input type="number" value={maxDisposable} onChange={(event) => setMaxDisposable(event.target.value)} placeholder={label('最大', 'Max')} /></label>
        <label><span>{label('所得收入者人數', 'Income earner count')}</span><input type="number" value={minEarners} onChange={(event) => setMinEarners(event.target.value)} placeholder={label('最小', 'Min')} /></label>
        <label><span>&nbsp;</span><input type="number" value={maxEarners} onChange={(event) => setMaxEarners(event.target.value)} placeholder={label('最大', 'Max')} /></label>
        <label className="search-field"><span>{label('搜尋', 'Search')}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={label('搜尋年度或行政區', 'Search year or district')} type="search" /></label>
      </div></details>
      <p className="table-count">{filtered.length.toLocaleString()} {label('筆紀錄', 'records')}</p>
      <div className="table-wrap"><table><thead><tr>{[label('年度', 'Year'), label('行政區', 'District'), label('所得收入者人數', 'Income earners'), label('所得收入總計', 'Total income'), label('可支配所得', 'Disposable income'), label('非消費支出', 'Non-consumption expenditure'), label('受僱報酬占比', 'Employee compensation share'), label('可支配所得排名', 'Disposable rank'), label('年變動率', 'YoY change')].map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{visible.map((record) => <tr key={record.id}><td>{record.dataYear}</td><th>{record.isCityAverage ? label('總平均', 'City average') : districtLabel(record.district, language)}</th><td>{record.incomeEarnerCount?.toLocaleString() ?? '—'}</td><td>{formatNtd(record.totalIncomeNtd, language)}</td><td>{formatNtd(record.disposableIncomeNtd, language)}</td><td>{formatNtd(record.nonConsumptionExpenditureNtd, language)}</td><td>{formatSourcePercent(record.employeeCompensationSharePercent)}</td><td>{record.disposableIncomeRank ?? '—'}</td><td>{formatSourcePercent(record.yearOverYearDisposableIncomeChangePercent)}</td></tr>)}</tbody></table></div>
      <nav className="pagination"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>{label('上一頁', 'Previous')}</button><span>{label('頁', 'Page')} {Math.min(page, pages)} / {pages}</span><button disabled={page === pages} onClick={() => setPage((value) => value + 1)}>{label('下一頁', 'Next')}</button></nav>
    </section>
  </>;
}

function ConsumerPriceBasicAnnualIndex({ records, summary, language }: { records: ConsumerPriceBasicAnnualIndexRecord[]; summary: ConsumerPriceBasicAnnualIndexSummary; language: Language }) {
  const label = (zh: string, en: string) => language === 'zh' ? zh : en;
  const [year, setYear] = useState(String(summary.latestYear ?? ''));
  const [group, setGroup] = useState('');
  const [level, setLevel] = useState('');
  const [classification, setClassification] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const years = [...new Set(records.map((record) => record.year))].sort((a, b) => b - a);
  const groups = [...new Set(records.map((record) => record.classificationGroup))].sort();
  const levels = [...new Set(records.map((record) => record.classificationLevel))].sort();
  const classifications = [...new Map(records.map((record) => [record.classificationKey, record.semanticClassificationLabel])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'zh-Hant'));
  const filtered = records.filter((record) => (!year || record.year === Number(year))
    && (!group || record.classificationGroup === group)
    && (!level || record.classificationLevel === level)
    && (!classification || record.classificationKey === classification)
    && (!search || `${record.year} ${record.basicClassificationLabel} ${record.semanticClassificationLabel} ${record.classificationKey}`.toLowerCase().includes(search.toLowerCase())));
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
  const visible = filtered.slice((Math.min(page, pages) - 1) * 25, Math.min(page, pages) * 25);
  const housingTrend = records.filter((record) => ['housing', 'rent', 'utilities_energy'].includes(record.classificationKey)).sort((a, b) => a.year - b.year).reduce<Array<{ year: number; housing?: number; rent?: number; utilitiesEnergy?: number }>>((items, record) => {
    let item = items.find((entry) => entry.year === record.year);
    if (!item) { item = { year: record.year }; items.push(item); }
    if (record.classificationKey === 'housing') item.housing = record.indexValue;
    if (record.classificationKey === 'rent') item.rent = record.indexValue;
    if (record.classificationKey === 'utilities_energy') item.utilitiesEnergy = record.indexValue;
    return items;
  }, []);
  useEffect(() => setPage(1), [year, group, level, classification, search]);
  return <>
    <section className="section-intro">
      <h2>{label('消費者物價指數基本分類年指數', 'Consumer Price Basic Classification Annual Index')}</h2>
      <p>{label('整理臺北市年度消費者物價指數，按基本分類觀察食物、衣著、居住、交通通訊、醫藥保健、教養娛樂與雜項等物價背景。', 'Explore Taipei annual CPI by basic classification for food, clothing, housing, transport and communication, healthcare, education and recreation, and miscellaneous price context.')}</p>
      <p className="notice">{label('本資料僅供查詢縣市別代碼、年別、基本分類、指數原始值與年增率等來源欄位，並作為物價、所得、租金與居住負擔背景分析使用。不代表個人或家庭實際通膨率、即時價格、房價預測、租金預測、購屋能力判斷、投資建議、房貸建議、政策成效判定、財務建議或官方背書。資料未提供行政區、地址或經緯度，本模組不顯示地圖點位。', 'This data is for source fields such as city code, year, classification, index value, and year-over-year change, and for price, income, rent, and housing-affordability context. It is not individual or household inflation, realtime prices, housing/rent forecasts, home-purchasing ability determination, investment advice, mortgage advice, policy-effectiveness determination, financial advice, or official endorsement. The source has no district, address, or coordinate fields, so this module does not show map points.')}</p>
    </section>
    <MetricStrip items={[
      { label: label('資料年度', 'Year range'), value: `${summary.minYear}–${summary.maxYear}` },
      { label: label('來源分類標籤', 'Source labels'), value: summary.classificationCount },
      { label: label('語意分類鍵', 'Semantic keys'), value: summary.semanticClassificationKeyCount },
      { label: label('最新總指數', 'Latest total index'), value: summary.latestTotalIndex?.toFixed(2) ?? '—' },
      { label: label('總指數年增率', 'Total YoY change'), value: formatSourcePercent(summary.latestTotalAnnualChangePercent) },
      { label: label('居住類指數', 'Housing index'), value: summary.latestHousingIndex?.toFixed(2) ?? '—' },
      { label: label('居住類年增率', 'Housing YoY change'), value: formatSourcePercent(summary.latestHousingAnnualChangePercent) },
      { label: label('基期線索', 'Base-year clue'), value: summary.baseYearCandidate ?? '—' },
    ]} />
    <div className="chart-grid">
      <ChartSection title={label('總指數與居住類趨勢', 'Total and Housing CPI Trend')}><ResponsiveContainer width="100%" height={300}><LineChart data={summary.byYear}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="year" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Legend /><Line dataKey="totalIndex" name={label('總指數', 'Total index')} stroke="#b24738" strokeWidth={3} dot={false} /><Line dataKey="housingIndex" name={label('居住類', 'Housing')} stroke="#356f9d" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('總指數年增率', 'Total CPI Year-over-Year Change')}><ResponsiveContainer width="100%" height={300}><BarChart data={summary.byYear}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="year" /><YAxis tickFormatter={(value) => `${value}%`} /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="totalAnnualChangePercent" name={label('年增率', 'YoY change')} fill="#737d68" /></BarChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('最新年度大類指數', 'Latest Main Category Indexes')}><ResponsiveContainer width="100%" height={300}><BarChart data={summary.latestMainCategories.map((item) => ({ ...item, label: cpiGroupLabel(item.classificationGroup, language) }))}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" angle={-25} textAnchor="end" height={72} /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="indexValue" name={label('指數', 'Index')} fill="#c58a43" /></BarChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('居住相關細項趨勢', 'Housing-Related CPI Trend')} note={label('房租、水電燃氣等為CPI分類中的物價指標，不是租金報價或住宅租金指數。', 'Rent and utilities are CPI classification indicators, not rent quotes or the residential rent index.')}><ResponsiveContainer width="100%" height={300}><LineChart data={housingTrend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="year" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Legend /><Line dataKey="housing" name={label('居住類', 'Housing')} stroke="#356f9d" strokeWidth={3} dot={false} /><Line dataKey="rent" name={label('房租', 'Rent')} stroke="#b24738" strokeWidth={3} dot={false} /><Line dataKey="utilitiesEnergy" name={label('水電燃氣', 'Utilities/energy')} stroke="#775f86" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></ChartSection>
    </div>
    <section className="analysis-list">
      <h2>{label('物價年指數資料表', 'Annual CPI Table')}</h2>
      <details className="filters" open><summary>{label('篩選條件', 'Filters')}</summary><div className="filter-grid">
        <label><span>{label('年度', 'Year')}</span><select value={year} onChange={(event) => setYear(event.target.value)}><option value="">{label('全部年度', 'All years')}</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span>{label('分類群組', 'Group')}</span><select value={group} onChange={(event) => setGroup(event.target.value)}><option value="">{label('全部', 'All')}</option>{groups.map((item) => <option key={item} value={item}>{cpiGroupLabel(item, language)}</option>)}</select></label>
        <label><span>{label('分類層級', 'Level')}</span><select value={level} onChange={(event) => setLevel(event.target.value)}><option value="">{label('全部', 'All')}</option>{levels.map((item) => <option key={item} value={item}>{cpiLevelLabel(item, language)}</option>)}</select></label>
        <label><span>{label('基本分類', 'Classification')}</span><select value={classification} onChange={(event) => setClassification(event.target.value)}><option value="">{label('全部分類', 'All classifications')}</option>{classifications.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>
        <label className="search-field"><span>{label('搜尋', 'Search')}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={label('搜尋年度、分類或語意鍵', 'Search year, classification, or semantic key')} type="search" /></label>
      </div></details>
      <p className="table-count">{filtered.length.toLocaleString()} {label('筆紀錄', 'records')}</p>
      <div className="table-wrap"><table><thead><tr>{[label('年度', 'Year'), label('基本分類', 'Classification'), label('群組', 'Group'), label('層級', 'Level'), label('指數原始值', 'Index value'), label('年增率', 'YoY change'), label('指數年差', 'Index delta'), label('語意鍵', 'Semantic key')].map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{visible.map((record) => <tr key={record.id}><td>{record.year}</td><th>{record.basicClassificationLabel}</th><td>{cpiGroupLabel(record.classificationGroup, language)}</td><td>{cpiLevelLabel(record.classificationLevel, language)}</td><td>{record.indexValue?.toFixed(2) ?? '—'}</td><td>{formatSourcePercent(record.annualChangePercent)}</td><td>{record.yearOverYearIndexDelta?.toFixed(2) ?? '—'}</td><td>{record.classificationKey}</td></tr>)}</tbody></table></div>
      <nav className="pagination"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>{label('上一頁', 'Previous')}</button><span>{label('頁', 'Page')} {Math.min(page, pages)} / {pages}</span><button disabled={page === pages} onClick={() => setPage((value) => value + 1)}>{label('下一頁', 'Next')}</button></nav>
    </section>
  </>;
}

function TaipowerTaipeiElectricitySales({ records, summary, language }: { records: TaipowerTaipeiElectricitySalesRecord[]; summary: TaipowerTaipeiElectricitySalesSummary; language: Language }) {
  const label = (zh: string, en: string) => language === 'zh' ? zh : en;
  const [year, setYear] = useState('');
  const [trend, setTrend] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const filtered = records.filter((record) => (!year || record.gregorianYear === Number(year) || record.rocYear === Number(year))
    && (!trend || record.totalElectricitySalesTrendDirection === trend)
    && (!search || `${record.periodRaw} ${record.rocYear} ${record.gregorianYear}`.toLowerCase().includes(search.toLowerCase())));
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
  const visible = filtered.slice((Math.min(page, pages) - 1) * 25, Math.min(page, pages) * 25);
  const latest = summary.latestRecord;
  const categoryBreakdown = latest ? [
    { name: label('電燈用電量', 'Lighting sales'), value: latest.lightingElectricitySalesThousandKwh },
    { name: label('電力用電量', 'Power sales'), value: latest.powerElectricitySalesThousandKwh },
  ] : [];
  useEffect(() => setPage(1), [year, trend, search]);
  return <>
    <section className="section-intro">
      <h2>{label('台灣電力公司臺北市售電量', 'Taipower Taipei Electricity Sales')}</h2>
      <p>{label('查詢臺北市年度售電量、用戶數與每用戶用電量，作為城市用電、住宅人口、公共設施需求與經濟活動長期趨勢參考。', 'Explore annual Taipei electricity sales, customer counts, and per-user electricity use as long-term context for city electricity demand, housing and population, public infrastructure demand, and economic activity.')}</p>
      <p className="notice">{label('台灣電力公司臺北市售電量資料為臺北市年度統計資料，未提供地址、行政區或經緯度。本模組以時間序列、類別拆解、年度變化與資料表呈現，不建立地圖點位或行政區分布。資料不代表即時用電、個別用戶或建物用電、電價、停電風險、電網可靠度、碳排放量或能源效率評估。', 'Taipower Taipei electricity sales data is annual citywide Taipei statistics and does not provide address, district, or coordinates. This module uses time series, category breakdowns, year-over-year changes, and tables without map points or district distributions. It does not represent realtime demand, individual or building-level use, prices, outage risk, grid reliability, emissions, or energy-efficiency assessment.')}</p>
    </section>
    <MetricStrip items={[
      { label: label('最新年度', 'Latest year'), value: latest?.gregorianYear ?? '—' },
      { label: label('年度範圍', 'Year range'), value: `${summary.minGregorianYear}–${summary.maxGregorianYear}` },
      { label: label('紀錄數', 'Record count'), value: summary.totalRecords },
      { label: label('最新總用戶數', 'Latest total customers'), value: latest?.totalCustomerCount?.toLocaleString() ?? '—' },
      { label: label('最新總用電量', 'Latest total electricity sales'), value: formatThousandKwh(latest?.totalElectricitySalesThousandKwh, language) },
      { label: label('最新每用戶用電量', 'Latest per-customer use'), value: formatKwh(latest?.totalElectricityUsePerCustomerKwh, language) },
      { label: label('電燈用電占比', 'Lighting share'), value: formatPercent(summary.latestLightingShareOfTotalSales) },
      { label: label('電力用電占比', 'Power share'), value: formatPercent(summary.latestPowerShareOfTotalSales) },
      { label: label('平均總用電量', 'Average total sales'), value: formatThousandKwh(summary.averageTotalElectricitySalesThousandKwh, language) },
      { label: label('最新年度總用電量變化率', 'Latest YoY total sales change'), value: formatPercent(latest?.totalElectricitySalesYearOverYearPercentChange) },
    ]} />
    <div className="chart-grid">
      <ChartSection title={label('各西元年總用電量', 'Total Electricity Sales by Year')} note={label('此圖僅整理年度售電量，不代表即時用電、電價、停電風險或碳排放。', 'This chart organizes annual electricity sales only; it is not realtime demand, prices, outage risk, or emissions.')}><ResponsiveContainer width="100%" height={300}><LineChart data={summary.annualSeries}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="gregorianYear" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Line dataKey="totalElectricitySalesThousandKwh" name={label('總用電量[千度]', 'Total sales [thousand kWh]')} stroke="#b24738" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('各年度總用戶數', 'Total Customer Count by Year')}><ResponsiveContainer width="100%" height={300}><LineChart data={summary.annualSeries}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="gregorianYear" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Line dataKey="totalCustomerCount" name={label('總用戶數', 'Total customers')} stroke="#356f9d" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('電燈與電力用電量', 'Lighting vs Power Sales')}><ResponsiveContainer width="100%" height={300}><LineChart data={summary.annualSeries}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="gregorianYear" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Legend /><Line dataKey="lightingElectricitySalesThousandKwh" name={label('電燈用電量', 'Lighting sales')} stroke="#737d68" strokeWidth={3} dot={false} /><Line dataKey="powerElectricitySalesThousandKwh" name={label('電力用電量', 'Power sales')} stroke="#c58a43" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('最新年度分類拆解', 'Latest Year Category Breakdown')}><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius={60} outerRadius={105} label={({ name }) => name}>{categoryBreakdown.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('每用戶用電量', 'Per-Customer Use')}><ResponsiveContainer width="100%" height={300}><LineChart data={summary.annualSeries}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="gregorianYear" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Line dataKey="totalElectricityUsePerCustomerKwh" name={label('每用戶用電量[度]', 'Per-customer use [kWh]')} stroke="#775f86" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('總用電量年度變化', 'Electricity Sales YoY Change')}><ResponsiveContainer width="100%" height={300}><BarChart data={summary.annualSeries}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="gregorianYear" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="totalElectricitySalesYearOverYearChange" name={label('年度變化[千度]', 'YoY change [thousand kWh]')} fill="#408579" /></BarChart></ResponsiveContainer></ChartSection>
    </div>
    <section className="analysis-list">
      <h2>{label('臺北市售電量資料表', 'Taipei Electricity Sales Data Table')}</h2>
      <details className="filters" open><summary>{copy[language].filters}</summary><div className="filter-grid">
        <label><span>{label('年度', 'Year')}</span><select value={year} onChange={(event) => setYear(event.target.value)}><option value="">{label('全部年度', 'All years')}</option>{records.map((record) => <option key={record.id} value={record.gregorianYear}>{record.gregorianYear}</option>)}</select></label>
        <label><span>{label('年度趨勢方向', 'YoY trend direction')}</span><select value={trend} onChange={(event) => setTrend(event.target.value)}><option value="">{label('全部', 'All')}</option><option value="increase">{label('上升', 'Increase')}</option><option value="decrease">{label('下降', 'Decrease')}</option><option value="no_change">{label('持平', 'No change')}</option><option value="first_record">{label('第一筆資料', 'First record')}</option></select></label>
        <label className="search-field"><span>{label('搜尋', 'Search')}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={label('搜尋年度或統計期', 'Search year or period')} type="search" /></label>
      </div></details>
      <p className="table-count">{filtered.length.toLocaleString()} {label('筆紀錄', 'records')}</p>
      <div className="table-wrap"><table><thead><tr>{[label('民國年', 'ROC year'), label('西元年', 'Gregorian year'), label('總用戶數', 'Total customers'), label('總用電量', 'Total electricity sales'), label('每用戶用電量', 'Per-customer use'), label('電燈用電量', 'Lighting sales'), label('電力用電量', 'Power sales'), label('電燈占比', 'Lighting share'), label('電力占比', 'Power share'), label('年度用電量變化', 'YoY sales change')].map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{visible.map((record) => <tr key={record.id}><td>{record.rocYear}</td><td>{record.gregorianYear}</td><td>{record.totalCustomerCount?.toLocaleString() ?? '—'}</td><td>{formatThousandKwh(record.totalElectricitySalesThousandKwh, language)}</td><td>{formatKwh(record.totalElectricityUsePerCustomerKwh, language)}</td><td>{formatThousandKwh(record.lightingElectricitySalesThousandKwh, language)}</td><td>{formatThousandKwh(record.powerElectricitySalesThousandKwh, language)}</td><td>{formatPercent(record.lightingShareOfTotalSales)}</td><td>{formatPercent(record.powerShareOfTotalSales)}</td><td>{formatThousandKwh(record.totalElectricitySalesYearOverYearChange, language)}</td></tr>)}</tbody></table></div>
      <nav className="pagination"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>{label('上一頁', 'Previous')}</button><span>{label('頁', 'Page')} {Math.min(page, pages)} / {pages}</span><button disabled={page === pages} onClick={() => setPage((value) => value + 1)}>{label('下一頁', 'Next')}</button></nav>
    </section>
  </>;
}

const zoningCategoryLabel = (category: LandUseZoningCategory, language: Language) => ({
  residential: { zh: '住宅', en: 'Residential' },
  commercial: { zh: '商業', en: 'Commercial' },
  industrial: { zh: '工業', en: 'Industrial' },
  administrative_public_institution: { zh: '機關', en: 'Public institution' },
  school_education: { zh: '文教', en: 'Education' },
  park_green_open_space: { zh: '公園綠地', en: 'Park / open space' },
  transportation: { zh: '交通', en: 'Transportation' },
  market: { zh: '市場', en: 'Market' },
  parking: { zh: '停車', en: 'Parking' },
  utility_infrastructure: { zh: '公用設備', en: 'Utility infrastructure' },
  river_water: { zh: '河川水域', en: 'River / water' },
  cultural_religious_social_welfare: { zh: '文化宗教社福', en: 'Culture / welfare' },
  medical: { zh: '醫療', en: 'Medical' },
  agriculture: { zh: '農業', en: 'Agriculture' },
  special_district: { zh: '特定專用', en: 'Special district' },
  public_facility: { zh: '公共設施', en: 'Public facility' },
  other: { zh: '其他', en: 'Other' },
  unknown: { zh: '未分類', en: 'Unknown' },
}[category][language]);

const developmentIntensityLabel = (category: DevelopmentIntensityCategory, language: Language) => ({
  no_ratio_or_not_applicable: { zh: '未提供或不適用', en: 'No ratio / N.A.' },
  very_low: { zh: '極低', en: 'Very low' },
  low: { zh: '低', en: 'Low' },
  medium: { zh: '中', en: 'Medium' },
  high: { zh: '高', en: 'High' },
  very_high: { zh: '極高', en: 'Very high' },
  unknown: { zh: '未知', en: 'Unknown' },
}[category][language]);

function LandUseZoningControlSummaryView({ records, summary, language }: { records: LandUseZoningControlRecord[]; summary: LandUseZoningControlSummary; language: Language }) {
  const label = (zh: string, en: string) => language === 'zh' ? zh : en;
  const [district, setDistrict] = useState('');
  const [category, setCategory] = useState('');
  const [intensity, setIntensity] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const categories = [...new Set(records.map((record) => record.zoningCategory))].sort();
  const intensities = [...new Set(records.map((record) => record.developmentIntensityCategory))].sort();
  const filtered = records.filter((record) => (!district || record.districtName === district)
    && (!category || record.zoningCategory === category)
    && (!intensity || record.developmentIntensityCategory === intensity)
    && (!search || `${record.districtName} ${record.zoningName} ${record.zoningCategory}`.toLowerCase().includes(search.toLowerCase())));
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
  const visible = filtered.slice((Math.min(page, pages) - 1) * 25, Math.min(page, pages) * 25);
  const ratioPresence = [
    { name: label('有建蔽率', 'With BCR'), value: summary.recordsWithBuildingCoverageRatio },
    { name: label('缺建蔽率', 'Missing BCR'), value: summary.recordsWithoutBuildingCoverageRatio },
    { name: label('有容積率', 'With FAR'), value: summary.recordsWithFloorAreaRatioUpperLimit },
    { name: label('缺容積率', 'Missing FAR'), value: summary.recordsWithoutFloorAreaRatioUpperLimit },
  ];
  const scatter = records.filter((record) => record.buildingCoverageRatioPercent !== undefined && record.floorAreaRatioUpperLimitPercent !== undefined).slice(0, 250).map((record) => ({
    buildingCoverageRatioPercent: record.buildingCoverageRatioPercent,
    floorAreaRatioUpperLimitPercent: record.floorAreaRatioUpperLimitPercent,
    zoningName: record.zoningName,
  }));
  useEffect(() => setPage(1), [district, category, intensity, search]);
  return <>
    <section className="section-intro">
      <h2>{label('土地使用內容與使用管制彙整表', 'Land Use and Development Control Summary')}</h2>
      <p>{label('整理臺北市各行政區與分區層級的筆數、建蔽率、容積率上限與面積，作為土地使用組成與開發強度背景觀察。', 'Explore Taipei district-and-zoning-level record counts, building coverage ratios, FAR upper limits, and areas as land-use composition and development-intensity context.')}</p>
      <p className="notice">{label('來源不含地址、地號、坐標或幾何邊界；本模組不建立地圖點位、不推論個別基地權利，也不構成土地使用管制證明、建築許可、法規意見或開發權利保證。衍生最大樓地板面積與建築 footprint 僅為依來源比率做的資料視覺化估算。', 'The source has no address, parcel number, coordinates, or geometry. This module does not create map points, infer parcel rights, or provide zoning certificates, building permits, legal advice, or development-right guarantees. Derived floor-area and footprint estimates are visualization-only planning context from source ratios.')}</p>
    </section>
    <MetricStrip items={[
      { label: label('彙整列數', 'Rows'), value: summary.totalRecords.toLocaleString() },
      { label: label('行政區數', 'Districts'), value: summary.districtCount },
      { label: label('分區名稱數', 'Zoning names'), value: summary.uniqueZoningNameCount.toLocaleString() },
      { label: label('來源筆數合計', 'Source count'), value: summary.totalSourceRecordCount.toLocaleString() },
      { label: label('面積合計', 'Total area'), value: formatArea(summary.totalAreaSquareMeters, language) },
      { label: label('建蔽率列數', 'Rows with BCR'), value: `${summary.recordsWithBuildingCoverageRatio.toLocaleString()} / ${summary.totalRecords.toLocaleString()}` },
      { label: label('容積率列數', 'Rows with FAR'), value: `${summary.recordsWithFloorAreaRatioUpperLimit.toLocaleString()} / ${summary.totalRecords.toLocaleString()}` },
      { label: label('最高建蔽率', 'Max BCR'), value: formatSourcePercent(summary.maxBuildingCoverageRatioPercent) },
      { label: label('最高容積率', 'Max FAR'), value: formatSourcePercent(summary.maxFloorAreaRatioUpperLimitPercent) },
      { label: label('最大面積類別', 'Largest category'), value: summary.largestZoningCategoryByArea ? zoningCategoryLabel(summary.largestZoningCategoryByArea, language) : '—' },
      { label: label('最大面積行政區', 'Largest district'), value: districtLabel(summary.largestDistrictByArea, language) },
      { label: label('公共/開放空間占比', 'Public/open-space share'), value: formatPercent(summary.publicFacilityOpenSpaceAreaShare) },
    ]} />
    <div className="chart-grid">
      <ChartSection title={label('各行政區土地使用面積', 'Land-Use Area by District')}><ResponsiveContainer width="100%" height={300}><BarChart data={summary.byDistrict}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="districtName" angle={-35} textAnchor="end" height={72} tickFormatter={(value) => districtLabel(value, language)} /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="totalAreaHectares" name={label('面積[公頃]', 'Area [ha]')} fill="#356f9d" /></BarChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('土地使用類別面積', 'Area by Zoning Category')}><ResponsiveContainer width="100%" height={300}><BarChart data={summary.byZoningCategory.slice(0, 12).map((item) => ({ ...item, label: zoningCategoryLabel(item.zoningCategory, language) }))}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" angle={-30} textAnchor="end" height={84} /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="totalAreaHectares" name={label('面積[公頃]', 'Area [ha]')} fill="#737d68" /></BarChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('主要分區名稱面積', 'Top Zoning Names by Area')}><ResponsiveContainer width="100%" height={300}><BarChart data={summary.topZoningNamesByArea.slice(0, 10)}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="zoningName" angle={-30} textAnchor="end" height={84} /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="totalAreaSquareMeters" name={label('面積[平方公尺]', 'Area [sqm]')} fill="#c58a43" /></BarChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('各行政區平均容積率上限', 'Average FAR Upper Limit by District')}><ResponsiveContainer width="100%" height={300}><BarChart data={summary.byDistrict}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="districtName" angle={-35} textAnchor="end" height={72} tickFormatter={(value) => districtLabel(value, language)} /><YAxis tickFormatter={(value) => `${value}%`} /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="averageFloorAreaRatioUpperLimitPercent" name={label('平均容積率上限', 'Average FAR upper limit')} fill="#b24738" /></BarChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('建蔽率與容積率資料完整度', 'BCR / FAR Availability')}><ResponsiveContainer width="100%" height={300}><BarChart data={ratioPresence}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="value" name={label('列數', 'Rows')} fill="#775f86" /></BarChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('開發強度分布', 'Development Intensity Distribution')}><ResponsiveContainer width="100%" height={300}><BarChart data={summary.byDevelopmentIntensityCategory.map((item) => ({ ...item, label: developmentIntensityLabel(item.developmentIntensityCategory, language) }))}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" angle={-25} textAnchor="end" height={72} /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="recordRows" name={label('列數', 'Rows')} fill="#408579" /></BarChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('建蔽率與容積率散布', 'BCR vs FAR Scatter')} note={label('僅顯示同時有建蔽率與容積率的列；點位不是地圖坐標。', 'Only rows with both BCR and FAR are shown; points are not map coordinates.')}><ResponsiveContainer width="100%" height={300}><ScatterChart><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="buildingCoverageRatioPercent" name={label('建蔽率', 'BCR')} type="number" unit="%" /><YAxis dataKey="floorAreaRatioUpperLimitPercent" name={label('容積率', 'FAR')} type="number" unit="%" /><Tooltip cursor={{ strokeDasharray: '3 3' }} /><Scatter name={label('分區列', 'Zoning rows')} data={scatter} fill="#356f9d" /></ScatterChart></ResponsiveContainer></ChartSection>
    </div>
    <section className="analysis-list">
      <h2>{label('土地使用管制資料表', 'Land Use Control Table')}</h2>
      <details className="filters" open><summary>{copy[language].filters}</summary><div className="filter-grid">
        <label><span>{copy[language].district}</span><select value={district} onChange={(event) => setDistrict(event.target.value)}><option value="">{copy[language].allDistricts}</option>{DISTRICTS.map((item) => <option key={item} value={item}>{districtLabel(item, language)}</option>)}</select></label>
        <label><span>{label('土地使用類別', 'Zoning category')}</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">{label('全部類別', 'All categories')}</option>{categories.map((item) => <option key={item} value={item}>{zoningCategoryLabel(item, language)}</option>)}</select></label>
        <label><span>{label('開發強度', 'Intensity')}</span><select value={intensity} onChange={(event) => setIntensity(event.target.value)}><option value="">{label('全部', 'All')}</option>{intensities.map((item) => <option key={item} value={item}>{developmentIntensityLabel(item, language)}</option>)}</select></label>
        <label className="search-field"><span>{label('搜尋', 'Search')}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={label('搜尋行政區或分區名稱', 'Search district or zoning name')} type="search" /></label>
      </div></details>
      <p className="notice">{label('估算欄位只在來源建蔽率或容積率存在時產生，缺值不補值；0 會保留為來源明確的 0。', 'Estimate fields are generated only when source BCR/FAR exists. Missing values are not imputed; explicit 0 is preserved as a source value.')}</p>
      <p className="table-count">{filtered.length.toLocaleString()} {label('筆紀錄', 'records')}</p>
      <div className="table-wrap"><table><thead><tr>{[label('行政區', 'District'), label('分區', 'Zoning'), label('類別', 'Category'), label('筆數', 'Count'), label('建蔽率', 'BCR'), label('容積率上限', 'FAR upper'), label('面積', 'Area'), label('公頃', 'Hectares'), label('區內占比', 'District share'), label('開發強度', 'Intensity')].map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{visible.map((record) => <tr key={record.id}><td>{districtLabel(record.districtName, language)}</td><th>{record.zoningName}</th><td>{zoningCategoryLabel(record.zoningCategory, language)}</td><td>{record.recordCount.toLocaleString()}</td><td>{formatSourcePercent(record.buildingCoverageRatioPercent)}</td><td>{formatSourcePercent(record.floorAreaRatioUpperLimitPercent)}</td><td>{record.areaSquareMeters.toLocaleString(language === 'zh' ? 'zh-TW' : 'en-US', { maximumFractionDigits: 2 })}</td><td>{record.areaHectares.toLocaleString(language === 'zh' ? 'zh-TW' : 'en-US', { maximumFractionDigits: 2 })}</td><td>{formatPercent(record.areaShareWithinDistrict)}</td><td>{developmentIntensityLabel(record.developmentIntensityCategory, language)}</td></tr>)}</tbody></table></div>
      <nav className="pagination"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>{label('上一頁', 'Previous')}</button><span>{label('頁', 'Page')} {Math.min(page, pages)} / {pages}</span><button disabled={page === pages} onClick={() => setPage((value) => value + 1)}>{label('下一頁', 'Next')}</button></nav>
    </section>
  </>;
}

const taxPeriodCategoryLabel = (category: LandValueTaxPeriodCategory, language: Language) => ({
  annual: { zh: '全年', en: 'Annual' },
  full_period: { zh: '全期', en: 'Full period' },
  first_half: { zh: '上半年', en: 'First half' },
  second_half: { zh: '下半年', en: 'Second half' },
  first_period: { zh: '上期', en: 'First period' },
  second_period: { zh: '下期', en: 'Second period' },
  other: { zh: '其他', en: 'Other' },
  unknown: { zh: '未知', en: 'Unknown' },
}[category][language]);

function LandValueTaxProgressiveBrackets({ records, summary, language }: { records: LandValueTaxProgressiveBracketRecord[]; summary: LandValueTaxProgressiveBracketSummary; language: Language }) {
  const label = (zh: string, en: string) => language === 'zh' ? zh : en;
  const [year, setYear] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const latest = records.find((record) => record.isLatestRecord) ?? records.at(-1);
  const selected = records.find((record) => record.gregorianYear === Number(year) || record.rocYear === Number(year)) ?? latest;
  const filtered = records.filter((record) => (!year || record.gregorianYear === Number(year) || record.rocYear === Number(year))
    && (!category || record.taxPeriodCategory === category)
    && (!search || `${record.rocYear} ${record.gregorianYear} ${record.taxPeriod} ${record.paymentPeriodStartDate} ${record.paymentPeriodEndDate} ${record.generalLandTaxFormulaRaw} ${record.selfUseResidentialLandTaxFormulaRaw} ${record.industrialLandTaxFormulaRaw} ${record.publicFacilityReservedLandTaxFormulaRaw}`.toLowerCase().includes(search.toLowerCase())));
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
  const visible = filtered.slice((Math.min(page, pages) - 1) * 25, Math.min(page, pages) * 25);
  const periodCategories = [...new Set(records.map((record) => record.taxPeriodCategory))];
  const formulaRows = selected ? [
    { type: label('自用住宅用地', 'Self-use residential land'), formula: selected.selfUseResidentialLandTaxFormulaRaw, rate: selected.selfUseResidentialLandTaxRatePermille, half: selected.selfUseResidentialFormulaHasHalfYearMultiplier },
    { type: label('工業用地', 'Industrial land'), formula: selected.industrialLandTaxFormulaRaw, rate: selected.industrialLandTaxRatePermille, half: selected.industrialFormulaHasHalfYearMultiplier },
    { type: label('公共設施保留地', 'Public facility reserved land'), formula: selected.publicFacilityReservedLandTaxFormulaRaw, rate: selected.publicFacilityReservedLandTaxRatePermille, half: selected.publicFacilityReservedFormulaHasHalfYearMultiplier },
  ] : [];
  useEffect(() => setPage(1), [year, category, search]);
  return <>
    <section className="section-intro">
      <h2>{label('地價稅累進起點地價及課稅級距', 'Land Value Tax Progressive Starting Point and Brackets')}</h2>
      <p>{label('查詢臺北市歷年地價稅累進起點地價、課稅級距、繳納期間與不同土地使用類型公式，作為不動產持有成本、地價政策與財稅資料探索參考。', 'Explore Taipei historical land value tax progressive starting points, tax brackets, payment periods, and formulas for different land-use categories as real-estate holding cost, land value policy, and public finance reference data.')}</p>
      <p className="notice">{label('地價稅累進起點地價及課稅級距資料為臺北市年度稅制與課稅公式資料，未提供地址、行政區、地段、地號或經緯度。本模組以年度趨勢、課稅級距、公式解析與資料表呈現，不建立地圖點位、行政區分布或個別土地分析。', 'Land value tax progressive starting point and bracket data is annual Taipei tax schedule and formula data and does not provide address, district, land section, parcel number, or coordinates. This module is shown through annual trends, tax brackets, formula parsing, and data tables, without creating map points, district distributions, or individual land-parcel analysis.')}</p>
      <p className="notice">{label('本資料不代表個別土地、所有權人或案件之正式應納稅額，不構成稅務建議、法律意見、投資建議、估價報告、節稅規劃、申報指引或官方計算結果。', 'This data does not represent the official payable tax amount for any specific land parcel, owner, or case, and does not constitute tax advice, legal advice, investment advice, appraisal report, tax planning, filing guidance, or official calculation result.')}</p>
    </section>
    <MetricStrip items={[
      { label: label('最新年度', 'Latest year'), value: summary.latestRecord?.gregorianYear ?? '—' },
      { label: label('最新年期', 'Latest tax period'), value: summary.latestRecord?.taxPeriod ?? '—' },
      { label: label('最新繳納期間', 'Latest payment period'), value: summary.latestRecord?.paymentPeriodStartDate && summary.latestRecord?.paymentPeriodEndDate ? `${summary.latestRecord.paymentPeriodStartDate}–${summary.latestRecord.paymentPeriodEndDate}` : '—' },
      { label: label('最新累進起點地價', 'Latest progressive starting-point land value'), value: formatNtd(summary.latestRecord?.generalLandProgressiveStartingPointLandValue, language) },
      { label: label('最新一般土地級距數', 'Latest general land bracket count'), value: summary.latestRecord?.generalLandTaxBracketCount ?? '—' },
      { label: label('最新一般土地最低稅率', 'Latest general land lowest tax rate'), value: formatPermille(summary.latestRecord?.generalLandLowestRatePermille) },
      { label: label('最新一般土地最高稅率', 'Latest general land highest tax rate'), value: formatPermille(summary.latestRecord?.generalLandHighestRatePermille) },
      { label: label('最新自用住宅用地稅率', 'Latest self-use residential land tax rate'), value: formatPermille(summary.latestRecord?.selfUseResidentialLandTaxRatePermille) },
      { label: label('年度範圍', 'Year range'), value: `${summary.minGregorianYear}–${summary.maxGregorianYear}` },
      { label: label('紀錄數', 'Record count'), value: summary.totalRecords },
      { label: label('長期累進起點變化', 'Long-term progressive starting-point change'), value: formatNtd(summary.totalProgressiveStartingPointChange, language) },
      { label: label('最新年度累進起點變化', 'Latest YoY progressive starting-point change'), value: formatNtd(summary.latestRecord?.yearOverYearProgressiveStartingPointChange, language) },
    ]} />
    <div className="chart-grid">
      <ChartSection title={label('各西元年累進起點地價', 'Progressive Starting Point by Gregorian Year')} note={label('此圖僅整理年度、年期、繳納期間與課稅公式等來源欄位，不代表個別土地、所有權人或案件之正式應納稅額。', 'This chart only organizes source fields such as year, period, payment period, and tax formulas; it does not represent official payable tax for a specific parcel, owner, or case.')}><ResponsiveContainer width="100%" height={300}><LineChart data={summary.annualSeries}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="gregorianYear" /><YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1_000_000)}M`} /><Tooltip content={<ChartTooltip language={language} />} /><Line dataKey="generalLandProgressiveStartingPointLandValue" name={label('累進起點地價', 'Progressive starting point')} stroke="#b24738" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('一般土地級距數', 'General Land Bracket Count')}><ResponsiveContainer width="100%" height={300}><BarChart data={summary.annualSeries}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="gregorianYear" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="generalLandTaxBracketCount" name={label('級距數', 'Bracket count')} fill="#356f9d" /></BarChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('一般土地最低與最高稅率', 'General Land Lowest and Highest Tax Rates')}><ResponsiveContainer width="100%" height={300}><LineChart data={summary.annualSeries}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="gregorianYear" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Legend /><Line dataKey="generalLandLowestRatePermille" name={label('最低稅率‰', 'Lowest rate ‰')} stroke="#737d68" strokeWidth={3} dot={false} /><Line dataKey="generalLandHighestRatePermille" name={label('最高稅率‰', 'Highest rate ‰')} stroke="#c58a43" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('不同用地稅率', 'Land-Use Tax Rates')}><ResponsiveContainer width="100%" height={300}><LineChart data={summary.annualSeries}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="gregorianYear" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Legend /><Line dataKey="selfUseResidentialLandTaxRatePermille" name={label('自用住宅‰', 'Self-use residential ‰')} stroke="#775f86" strokeWidth={3} dot={false} /><Line dataKey="industrialLandTaxRatePermille" name={label('工業用地‰', 'Industrial ‰')} stroke="#408579" strokeWidth={3} dot={false} /><Line dataKey="publicFacilityReservedLandTaxRatePermille" name={label('公共設施保留地‰', 'Public facility reserved ‰')} stroke="#b24738" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('繳納期間天數', 'Payment Period Duration')}><ResponsiveContainer width="100%" height={300}><BarChart data={summary.annualSeries}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="gregorianYear" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="paymentPeriodDayCount" name={label('天數', 'Days')} fill="#775f86" /></BarChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('累進起點年度變化', 'Progressive Starting Point YoY Change')}><ResponsiveContainer width="100%" height={300}><BarChart data={summary.annualSeries}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="gregorianYear" /><YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1_000_000)}M`} /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="yearOverYearProgressiveStartingPointChange" name={label('年度變化', 'YoY change')} fill="#408579" /></BarChart></ResponsiveContainer></ChartSection>
      {latest && <ChartSection title={label('最新一般土地級距圖', 'Latest General Land Brackets')}><ResponsiveContainer width="100%" height={300}><BarChart data={latest.generalLandTaxBrackets}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="bracketNumber" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="ratePermille" name={label('稅率‰', 'Tax rate ‰')} fill="#c58a43" /></BarChart></ResponsiveContainer></ChartSection>}
    </div>
    {selected && <section className="analysis-list">
      <h2>{label('一般土地級距與不同用地公式', 'General Land Brackets and Land-Use Formula Comparison')}</h2>
      <p className="notice">{label('公式解析僅供資料視覺化與來源欄位整理，實際應納稅額需依課稅地價、土地使用情形、適用稅率、減免資格與主管機關核定資料計算。', 'Formula parsing is only for data visualization and source-field organization. Actual payable tax must be calculated based on taxable land value, land-use status, applicable rate, exemption or reduction eligibility, and authority-confirmed records.')}</p>
      <details open><summary>{label('一般土地來源公式', 'General land source formula')}</summary><pre>{selected.generalLandTaxFormulaRaw}</pre></details>
      <div className="table-wrap"><table><thead><tr>{[label('級距', 'Bracket'), label('課稅地價下限', 'Taxable land value lower bound'), label('課稅地價上限', 'Taxable land value upper bound'), label('稅率', 'Tax rate'), label('累進差額', 'Progressive difference'), label('來源公式行', 'Source formula line')].map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{selected.generalLandTaxBrackets.map((bracket) => <tr key={bracket.bracketNumber}><td>{bracket.bracketNumber}</td><td>{formatNtd(bracket.lowerBoundLandValue, language)}</td><td>{bracket.isOpenEnded ? label('以上', 'Open-ended') : formatNtd(bracket.upperBoundLandValue, language)}</td><td>{formatPermille(bracket.ratePermille)}</td><td>{formatNtd(bracket.progressiveDifferenceAmount, language)}</td><td>{bracket.rawLine}</td></tr>)}</tbody></table></div>
      <div className="table-wrap"><table><thead><tr>{[label('用地類型', 'Land-use category'), label('來源公式', 'Source formula'), label('解析稅率', 'Parsed tax rate'), label('是否含半期乘數', 'Has half-period multiplier')].map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{formulaRows.map((row) => <tr key={row.type}><th>{row.type}</th><td>{row.formula}</td><td>{formatPermille(row.rate)}</td><td>{row.half ? label('是', 'Yes') : label('否', 'No')}</td></tr>)}</tbody></table></div>
    </section>}
    <section className="analysis-list">
      <h2>{label('地價稅級距資料表', 'Land Value Tax Bracket Data Table')}</h2>
      <details className="filters" open><summary>{copy[language].filters}</summary><div className="filter-grid">
        <label><span>{label('年度', 'Year')}</span><select value={year} onChange={(event) => setYear(event.target.value)}><option value="">{label('全部年度', 'All years')}</option>{records.map((record) => <option key={record.id} value={record.gregorianYear}>{record.gregorianYear} / {record.taxPeriod}</option>)}</select></label>
        <label><span>{label('年期類別', 'Tax period category')}</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">{label('全部', 'All')}</option>{periodCategories.map((item) => <option key={item} value={item}>{taxPeriodCategoryLabel(item, language)}</option>)}</select></label>
        <label className="search-field"><span>{label('搜尋', 'Search')}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={label('搜尋年度、年期、繳納期間或公式', 'Search year, period, payment period, or formula')} type="search" /></label>
      </div></details>
      <p className="table-count">{filtered.length.toLocaleString()} {label('筆紀錄', 'records')}</p>
      <div className="table-wrap"><table><thead><tr>{[label('民國年', 'ROC year'), label('西元年', 'Gregorian year'), label('年期', 'Tax period'), label('繳納期間起日', 'Payment start date'), label('繳納期間迄日', 'Payment end date'), label('一般土地累進起點地價', 'General land progressive starting point'), label('一般土地級距數', 'General land bracket count'), label('一般土地最低稅率', 'General land lowest tax rate'), label('一般土地最高稅率', 'General land highest tax rate'), label('自用住宅用地稅率', 'Self-use residential land tax rate'), label('工業用地稅率', 'Industrial land tax rate'), label('公共設施保留地稅率', 'Public facility reserved land tax rate')].map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{visible.map((record) => <tr key={record.id}><td>{record.rocYear}</td><td>{record.gregorianYear}</td><td>{record.taxPeriod}</td><td>{record.paymentPeriodStartDate ?? '—'}</td><td>{record.paymentPeriodEndDate ?? '—'}</td><td>{formatNtd(record.generalLandProgressiveStartingPointLandValue, language)}</td><td>{record.generalLandTaxBracketCount}</td><td>{formatPermille(record.generalLandLowestRatePermille)}</td><td>{formatPermille(record.generalLandHighestRatePermille)}</td><td>{formatPermille(record.selfUseResidentialLandTaxRatePermille)}</td><td>{formatPermille(record.industrialLandTaxRatePermille)}</td><td>{formatPermille(record.publicFacilityReservedLandTaxRatePermille)}</td></tr>)}</tbody></table></div>
      <nav className="pagination"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>{label('上一頁', 'Previous')}</button><span>{label('頁', 'Page')} {Math.min(page, pages)} / {pages}</span><button disabled={page === pages} onClick={() => setPage((value) => value + 1)}>{label('下一頁', 'Next')}</button></nav>
    </section>
  </>;
}

const pledgeItemLabel = (category: MovablePropertyPledgeItemCategory, language: Language) => ({
  total: { zh: '合計', en: 'Total' },
  gold_jewelry: { zh: '黃金珠寶', en: 'Gold and jewelry' },
  watches: { zh: '鐘錶', en: 'Watches' },
  motorcycle: { zh: '機車', en: 'Motorcycle' },
  other: { zh: '其他', en: 'Other' },
  unknown: { zh: '未分類', en: 'Unknown' },
}[category][language]);

function MovablePropertyPledgeBusiness({ records, summary, language }: { records: MovablePropertyPledgeBusinessRecord[]; summary: MovablePropertyPledgeBusinessSummary; language: Language }) {
  const zh = language === 'zh';
  const label = (zhText: string, enText: string) => zh ? zhText : enText;
  const [year, setYear] = useState(String(summary.latestYear ?? ''));
  const [branch, setBranch] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [search, setSearch] = useState('');
  const [minCases, setMinCases] = useState('');
  const [maxCases, setMaxCases] = useState('');
  const [minPrincipal, setMinPrincipal] = useState('');
  const [maxPrincipal, setMaxPrincipal] = useState('');
  const [minInterest, setMinInterest] = useState('');
  const [maxInterest, setMaxInterest] = useState('');
  const [minSale, setMinSale] = useState('');
  const [maxSale, setMaxSale] = useState('');
  const [page, setPage] = useState(1);
  const years = summary.byYear.map((item) => item.dataYear);
  const branches = [...new Set(records.map((record) => record.branchName).filter((value): value is string => !!value))].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  const categories = [...new Set(records.map((record) => record.itemCategory))];
  const inRange = (value: number | undefined, min: string, max: string) =>
    (!min || (value ?? -Infinity) >= Number(min)) && (!max || (value ?? Infinity) <= Number(max));
  const filtered = records.filter((record) => (!year || record.dataYear === Number(year))
    && (!branch || record.branchName === branch)
    && (!itemCategory || record.itemCategory === itemCategory)
    && inRange(record.annualPledgeCaseCount, minCases, maxCases)
    && inRange(record.annualPledgePrincipalNtd, minPrincipal, maxPrincipal)
    && inRange(record.cashInterestIncomeNtd, minInterest, maxInterest)
    && inRange(record.annualSaleTotalNtd, minSale, maxSale)
    && (!search || [record.dataYear, record.branchName, record.itemRaw, record.sourceResourceName].some((value) => String(value ?? '').toLocaleLowerCase().includes(search.toLocaleLowerCase()))));
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const visible = filtered.slice((page - 1) * 20, page * 20);
  useEffect(() => setPage(1), [year, branch, itemCategory, search, minCases, maxCases, minPrincipal, maxPrincipal, minInterest, maxInterest, minSale, maxSale]);
  const latest = summary.latestAnnualSummary;
  return <>
    <section className="section-intro">
      <h2>{label('動產質借處營業概況', 'Movable Property Pledge Business Statistics')}</h2>
      <p>{label('整理臺北市動產質借處年度營運統計，依年度、分處別與項目觀察質借件數、本金、利息收入與變賣金額等社會經濟背景指標。', 'Explore annual Taipei movable-property pledge office operating statistics by year, branch, and item category, including pledge-loan case counts, principal amounts, interest income, and sale amounts as socioeconomic background indicators.')}</p>
      <p className="notice">{label('本資料僅供社會經濟背景觀察，不代表不動產價格、租金、房貸壓力、個人信用狀況、貧窮程度、投資訊號、政策成效或未來市場預測，也不應作為估價、交易、投資、借貸或財務決策依據。', 'This data is socioeconomic background context only. It does not represent real-estate prices, rents, mortgage stress, credit status, poverty level, investment signals, policy effectiveness, forecasts, appraisal, transaction advice, lending advice, or financial decisions.')}</p>
      <p className="notice">{label('動產質借處營業概況為年度營運統計資料，未提供分處地址或經緯度。本模組以趨勢圖與資料表呈現，不顯示地圖點位。', 'Movable-property pledge business statistics are annual operating statistics and do not provide branch addresses or coordinates. This module is presented through trend charts and tables, not map markers.')}</p>
    </section>
    <MetricStrip items={[
      { label: label('最新年度', 'Latest year'), value: summary.latestYear ?? '—' },
      { label: label('紀錄數', 'Record count'), value: summary.totalRecords.toLocaleString() },
      { label: label('分處數', 'Branch count'), value: summary.branchCount },
      { label: label('項目數', 'Item category count'), value: summary.itemCategoryCount },
      { label: label('最新年度質借件數', 'Latest-year pledge cases'), value: latest?.totalPledgeCaseCount?.toLocaleString() ?? '—' },
      { label: label('最新年度質借本金', 'Latest-year pledge principal'), value: formatNtd(latest?.totalPledgePrincipalNtd, language) },
      { label: label('最新年度現金利息收入', 'Latest-year cash interest income'), value: formatNtd(latest?.totalCashInterestIncomeNtd, language) },
      { label: label('平均每件質借本金', 'Average principal per case'), value: formatNtd(latest?.averagePrincipalPerCaseNtd, language) },
      { label: label('質借件數最多分處', 'Top branch by pledge cases'), value: latest?.topBranchByPledgeCaseCount ?? '—' },
    ]} />
    <div className="chart-grid">
      <ChartSection title={label('年度質借件數', 'Annual pledge case count')} note={label('此圖僅整理動產質借處年度營業統計，不代表不動產價格、租金、房貸壓力、個人信用狀況、貧窮程度、投資訊號、政策成效或未來市場預測。', 'This chart only organizes annual movable-property pledge office operating statistics and does not represent real-estate prices, rents, mortgage stress, individual credit status, poverty level, investment signals, policy effectiveness, or forecasts.')}><ResponsiveContainer width="100%" height={300}><LineChart data={summary.byYear}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="dataYear" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Line dataKey="totalPledgeCaseCount" name={label('質借件數', 'Pledge cases')} stroke="#356f9d" strokeWidth={3} /></LineChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('年度質借本金', 'Annual pledge principal')}><ResponsiveContainer width="100%" height={300}><BarChart data={summary.byYear}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="dataYear" /><YAxis tickFormatter={(value) => `${Math.round(value / 1e6)}M`} /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="totalPledgePrincipalNtd" name={label('質借本金', 'Pledge principal')} fill="#b24738" /></BarChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('各分處質借件數', 'Pledge cases by branch')}><ResponsiveContainer width="100%" height={300}><BarChart data={summary.latestYearBranchBreakdown}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="branchName" angle={-35} textAnchor="end" height={72} /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="pledgeCaseCount" name={label('質借件數', 'Pledge cases')} fill="#737d68" /></BarChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('各項目質借本金', 'Pledge principal by item category')}><ResponsiveContainer width="100%" height={300}><BarChart data={summary.byItemCategory.map((item) => ({ ...item, label: zh ? item.itemLabelZh : item.itemLabelEn }))}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" angle={-35} textAnchor="end" height={72} /><YAxis tickFormatter={(value) => `${Math.round(value / 1e6)}M`} /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="totalPledgePrincipalNtd" name={label('質借本金', 'Pledge principal')} fill="#c58a43" /></BarChart></ResponsiveContainer></ChartSection>
    </div>
    <section className="analysis-list">
      <h2>{label('動產質借資料表', 'Pledge Business Table')}</h2>
      <details className="filters" open><summary>{label('篩選條件', 'Filters')}</summary><div className="filter-grid">
        <label><span>{label('年度', 'Year')}</span><select value={year} onChange={(event) => setYear(event.target.value)}><option value="">{label('全部年份', 'All years')}</option>{years.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>{label('分處', 'Branch')}</span><select value={branch} onChange={(event) => setBranch(event.target.value)}><option value="">{label('全部分處', 'All branches')}</option>{branches.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>{label('項目', 'Item category')}</span><select value={itemCategory} onChange={(event) => setItemCategory(event.target.value)}><option value="">{label('全部項目', 'All items')}</option>{categories.map((item) => <option key={item} value={item}>{pledgeItemLabel(item, language)}</option>)}</select></label>
        <label><span>{label('質借件數範圍', 'Pledge case range')}</span><input type="number" value={minCases} onChange={(event) => setMinCases(event.target.value)} placeholder={label('最小', 'Min')} /></label>
        <label><span>&nbsp;</span><input type="number" value={maxCases} onChange={(event) => setMaxCases(event.target.value)} placeholder={label('最大', 'Max')} /></label>
        <label><span>{label('質借本金範圍', 'Pledge principal range')}</span><input type="number" value={minPrincipal} onChange={(event) => setMinPrincipal(event.target.value)} placeholder={label('最小', 'Min')} /></label>
        <label><span>&nbsp;</span><input type="number" value={maxPrincipal} onChange={(event) => setMaxPrincipal(event.target.value)} placeholder={label('最大', 'Max')} /></label>
        <label><span>{label('現金利息收入範圍', 'Cash interest income range')}</span><input type="number" value={minInterest} onChange={(event) => setMinInterest(event.target.value)} placeholder={label('最小', 'Min')} /></label>
        <label><span>&nbsp;</span><input type="number" value={maxInterest} onChange={(event) => setMaxInterest(event.target.value)} placeholder={label('最大', 'Max')} /></label>
        <label><span>{label('變賣總計範圍', 'Sale total range')}</span><input type="number" value={minSale} onChange={(event) => setMinSale(event.target.value)} placeholder={label('最小', 'Min')} /></label>
        <label><span>&nbsp;</span><input type="number" value={maxSale} onChange={(event) => setMaxSale(event.target.value)} placeholder={label('最大', 'Max')} /></label>
        <label className="search-field"><span>{label('搜尋', 'Search')}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={label('搜尋年度、分處或項目', 'Search year, branch, or item')} type="search" /></label>
      </div></details>
      <p className="table-count">{filtered.length.toLocaleString()} {label('筆紀錄', 'records')}</p>
      <div className="table-wrap"><table><thead><tr>{[label('年度', 'Year'), label('分處別', 'Branch'), label('項目', 'Item'), label('本年質借件數', 'Annual pledge cases'), label('本年質借本金', 'Annual pledge principal'), label('現金利息收入', 'Cash interest income'), label('本年變賣總計', 'Annual sale total'), label('年變動率', 'YoY change')].map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{visible.map((record) => <tr key={record.id}><td>{record.dataYear}</td><td>{record.branchName}</td><td>{record.itemRaw}</td><td>{record.annualPledgeCaseCount?.toLocaleString() ?? '—'}</td><td>{formatNtd(record.annualPledgePrincipalNtd, language)}</td><td>{formatNtd(record.cashInterestIncomeNtd, language)}</td><td>{formatNtd(record.annualSaleTotalNtd, language)}</td><td>{formatSourcePercent(record.yearOverYearPledgeCaseChangePercent)}</td></tr>)}</tbody></table></div>
      <nav className="pagination"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>{label('上一頁', 'Previous')}</button><span>{label('頁', 'Page')} {page} / {pages}</span><button disabled={page === pages} onClick={() => setPage((value) => value + 1)}>{label('下一頁', 'Next')}</button></nav>
    </section>
  </>;
}

const securedTypeLabel = (category: string, language: Language) => ({
  movable_property_mortgage: language === 'zh' ? '動產抵押' : 'Movable property mortgage',
  conditional_sale: language === 'zh' ? '附條件買賣' : 'Conditional sale',
  other: language === 'zh' ? '其他' : 'Other',
  unknown: language === 'zh' ? '未知' : 'Unknown',
}[category] ?? category);

const collateralTypeLabel = (category: string, language: Language) => ({
  machinery_equipment_or_tools: language === 'zh' ? '機器設備或工具' : 'Machinery, equipment, or tools',
  vehicle_or_transport: language === 'zh' ? '車輛或運輸設備' : 'Vehicle or transport',
  inventory_or_goods: language === 'zh' ? '存貨或商品' : 'Inventory or goods',
  other: language === 'zh' ? '其他' : 'Other',
  unknown: language === 'zh' ? '未知' : 'Unknown',
}[category] ?? category);

function MovablePropertySecuredTransactions({ records, summary, language }: { records: MovablePropertySecuredTransactionRecord[]; summary: MovablePropertySecuredTransactionSummary; language: Language }) {
  const label = (zh: string, en: string) => language === 'zh' ? zh : en;
  const [year, setYear] = useState('');
  const [securedType, setSecuredType] = useState('');
  const [collateralType, setCollateralType] = useState('');
  const [district, setDistrict] = useState('');
  const [maximumLimit, setMaximumLimit] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const years = [...new Set(records.map((record) => record.registrationYear).filter(Boolean))].sort();
  const filtered = records.filter((record) =>
    (!year || record.registrationYear === Number(year))
    && (!securedType || record.securedTransactionCategory === securedType)
    && (!collateralType || record.collateralTypeCategory === collateralType)
    && (!district || record.collateralDistrict === district || record.debtorDistrict === district || record.securedPartyDistrict === district)
    && (!maximumLimit || record.maximumLimitFlag === maximumLimit)
    && (!search || `${record.registrationNumber} ${record.debtorName ?? ''} ${record.securedPartyName ?? ''} ${record.collateralLocation ?? ''} ${record.debtorBusinessNumber ?? ''} ${record.securedPartyBusinessNumber ?? ''} ${record.securedTransactionTypeRaw ?? ''}`.toLowerCase().includes(search.toLowerCase())));
  useEffect(() => setPage(1), [year, securedType, collateralType, district, maximumLimit, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((Math.min(page, pages) - 1) * pageSize, Math.min(page, pages) * pageSize);
  const latestYears = summary.byRegistrationYear.slice(-20);
  return <>
    <section className="section-intro">
      <h2>{label('動產擔保登記資料', 'Movable Property Secured Transaction Records')}</h2>
      <p>{label('整理臺北市動產擔保交易登記資料，觀察登記核准日期、擔保類別、契約期間、債務人、擔保權人、標的物種類、所在地、標的物總金額與擔保債權金額。', 'Explore Taipei movable property secured transaction registrations by approval date, secured transaction type, contract period, debtor, secured party, collateral type, location, collateral value, and secured debt amount.')}</p>
      <p className="notice">{label('本資料不代表不動產抵押、房貸資料、土地或建物權利狀態、即時債權狀態、信用評等、違約風險、企業財務狀況、投資建議、法律意見、完整債務資料庫或官方背書。', 'This data does not represent real-estate mortgages, housing loans, land or building title status, real-time claim status, credit rating, default risk, company financial condition, investment advice, legal advice, a complete debt registry, or official endorsement.')}</p>
      <p className="notice">{label('來源資料未提供官方座標；本模組僅解析地址文字中的行政區，不建立精確地圖點位或進行地理編碼。', 'The source has no official coordinates; this module only parses districts from source text and does not create exact map points or geocode.')}</p>
    </section>
    <MetricStrip items={[
      { label: label('登記筆數', 'Records'), value: summary.totalRecords.toLocaleString() },
      { label: label('最新登記月份', 'Latest registration month'), value: summary.latestRegistrationMonth ?? '—' },
      { label: label('登記日期範圍', 'Registration date range'), value: `${summary.minRegistrationApprovalDate ?? '—'} - ${summary.maxRegistrationApprovalDate ?? '—'}` },
      { label: label('標的物總金額', 'Collateral amount'), value: formatNtd(summary.totalCollateralAmountNtd, language) },
      { label: label('擔保債權金額', 'Secured debt amount'), value: formatNtd(summary.totalSecuredDebtAmountNtd, language) },
      { label: label('最高限額筆數', 'Maximum-limit records'), value: summary.recordsWithMaximumLimitFlag.toLocaleString() },
      { label: label('解析標的物行政區', 'Parsed collateral districts'), value: summary.dataQuality.parsedCollateralDistrictCount.toLocaleString() },
      { label: label('遮罩債務人統編', 'Masked debtor IDs'), value: summary.dataQuality.maskedDebtorBusinessNumberCount.toLocaleString() },
    ]} />
    <div className="chart-grid">
      <ChartSection title={label('近年登記筆數', 'Recent Registration Count')} note={label('此圖僅整理登記資料，不代表即時權利狀態、信用風險或法律結論。', 'This chart only organizes registration records and does not represent real-time rights status, credit risk, or legal conclusions.')}><ResponsiveContainer width="100%" height={300}><BarChart data={latestYears}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="year" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="recordCount" name={label('登記筆數', 'Records')} fill="#356f9d" /></BarChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('擔保類別', 'Secured Transaction Types')}><ResponsiveContainer width="100%" height={300}><BarChart data={summary.bySecuredTransactionCategory.map((item) => ({ ...item, label: securedTypeLabel(item.securedTransactionCategory, language) }))}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="count" name={label('筆數', 'Count')} fill="#b24738" /></BarChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('標的物種類', 'Collateral Types')}><ResponsiveContainer width="100%" height={300}><BarChart data={summary.byCollateralTypeCategory.map((item) => ({ ...item, label: collateralTypeLabel(item.collateralTypeCategory, language) }))}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="count" name={label('筆數', 'Count')} fill="#737d68" /></BarChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('標的物所在地行政區', 'Collateral District Distribution')}><ResponsiveContainer width="100%" height={300}><BarChart data={summary.byCollateralDistrict}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="district" angle={-35} textAnchor="end" height={72} tickFormatter={(value) => districtLabel(value, language)} /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="recordCount" name={label('筆數', 'Records')} fill="#c58a43" /></BarChart></ResponsiveContainer></ChartSection>
    </div>
    <section className="analysis-list">
      <h2>{label('動產擔保登記目錄', 'Registration Directory')}</h2>
      <details className="filters" open><summary>{copy[language].filters}</summary><div className="filter-grid">
        <label><span>{copy[language].year}</span><select value={year} onChange={(event) => setYear(event.target.value)}><option value="">{label('全部年份', 'All years')}</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span>{label('擔保類別', 'Secured type')}</span><select value={securedType} onChange={(event) => setSecuredType(event.target.value)}><option value="">{label('全部', 'All')}</option>{summary.bySecuredTransactionCategory.map((item) => <option key={item.securedTransactionCategory} value={item.securedTransactionCategory}>{securedTypeLabel(item.securedTransactionCategory, language)}</option>)}</select></label>
        <label><span>{label('標的物種類', 'Collateral type')}</span><select value={collateralType} onChange={(event) => setCollateralType(event.target.value)}><option value="">{label('全部', 'All')}</option>{summary.byCollateralTypeCategory.map((item) => <option key={item.collateralTypeCategory} value={item.collateralTypeCategory}>{collateralTypeLabel(item.collateralTypeCategory, language)}</option>)}</select></label>
        <label><span>{label('行政區', 'District')}</span><select value={district} onChange={(event) => setDistrict(event.target.value)}><option value="">{label('全部行政區', 'All districts')}</option>{DISTRICTS.map((item) => <option key={item} value={item}>{districtLabel(item, language)}</option>)}</select></label>
        <label><span>{label('最高限額', 'Maximum limit')}</span><select value={maximumLimit} onChange={(event) => setMaximumLimit(event.target.value)}><option value="">{label('全部', 'All')}</option><option value="yes">Y</option><option value="no">N</option><option value="unknown">{label('未知', 'Unknown')}</option></select></label>
        <label className="search-field"><span>{label('搜尋', 'Search')}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={label('搜尋登記編號、債務人、擔保權人、所在地、統編或擔保類別', 'Search registration number, debtor, secured party, location, business number, or secured type')} type="search" /></label>
      </div></details>
      <p className="table-count">{filtered.length.toLocaleString()} {label('筆紀錄', 'records')}</p>
      <div className="table-wrap"><table><thead><tr>{[label('登記編號', 'Registration no.'), label('核准日期', 'Approval date'), label('擔保類別', 'Type'), label('債務人', 'Debtor'), label('擔保權人', 'Secured party'), label('標的物所在地', 'Collateral location'), label('標的物總金額', 'Collateral amount'), label('擔保債權金額', 'Secured debt'), label('最高限額', 'Max limit')].map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{visible.map((record) => <tr key={record.id}><td>{record.registrationNumber}</td><td>{record.registrationApprovalDate ?? '—'}</td><td>{securedTypeLabel(record.securedTransactionCategory, language)}</td><td>{record.debtorName ?? '—'}</td><td>{record.securedPartyName ?? '—'}</td><td>{record.collateralLocation ?? '—'}</td><td>{formatNtd(record.collateralAmountNtd, language)}</td><td>{formatNtd(record.securedDebtAmountNtd, language)}</td><td>{record.maximumLimitFlag}</td></tr>)}</tbody></table></div>
      <nav className="pagination"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>{label('上一頁', 'Previous')}</button><span>{label('頁', 'Page')} {Math.min(page, pages)} / {pages}</span><button disabled={page === pages} onClick={() => setPage((value) => value + 1)}>{label('下一頁', 'Next')}</button></nav>
    </section>
  </>;
}

function PublicPrivatePartnershipContracts({ records, language }: { records: DataBundle['pppRecords']; language: Language }) { const label=(zh:string,en:string)=>language==='zh'?zh:en; const [search,setSearch]=useState(''); const [year,setYear]=useState(''); const [page,setPage]=useState(1); const filtered=records.filter(r=>(!year||r.signingYear===Number(year))&&(!search||`${r.projectName} ${r.pppType} ${r.contractingAgency} ${r.commissionedCompany} ${r.note}`.toLowerCase().includes(search.toLowerCase()))); const years=[...new Set(records.map(r=>r.signingYear).filter((x):x is number=>x!==undefined))].sort((a,b)=>b-a); const total=(key:'privateInvestmentAmount'|'accumulatedRoyaltyAmount'|'annualLandRentAmount')=>filtered.reduce((s,r)=>s+(r[key]??0),0); const pages=Math.max(1,Math.ceil(filtered.length/20)); const visible=filtered.slice((page-1)*20,page*20); useEffect(()=>setPage(1),[search,year]); const csv=()=>{const url=URL.createObjectURL(new Blob([['project,pppType,agency,company,signingDate,investment,royalties,landRent',...filtered.map(r=>[r.projectName,r.pppType,r.contractingAgency,r.commissionedCompany,r.signingDate,r.privateInvestmentAmount,r.accumulatedRoyaltyAmount,r.annualLandRentAmount].map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(','))].join('\n')],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download='public-private-partnership-contracts-filtered.csv';a.click();URL.revokeObjectURL(url)}; return <><section className="section-intro"><h2>{label('促參案件簽約概況','Public-Private Partnership Contracts')}</h2><p className="notice">{label('本資料為已簽約促參案件公開紀錄，僅供公共資產、民間投資、權利金及土地租金分析。民間投資不是政府支出；權利金與年度土地租金不代表專案總收入、獲利或財務績效。請向財政局、辦理機關及官方契約文件查證現況。','This dataset contains public records of signed Taipei public-private partnership projects. Private investment is not government expenditure, while royalties and annual land rent do not represent total project revenue, profitability, or financial performance. Verify terms and current status with official documents.')}</p></section><MetricStrip items={[{label:label('已簽約案件','Signed projects'),value:String(filtered.length)},{label:label('民間投資','Private investment'),value:formatNtd(total('privateInvestmentAmount'),language)},{label:label('權利金累計','Accumulated royalties'),value:formatNtd(total('accumulatedRoyaltyAmount'),language)},{label:label('年度土地租金','Listed annual land rent'),value:formatNtd(total('annualLandRentAmount'),language)},{label:label('辦理機關','Contracting agencies'),value:String(new Set(filtered.map(r=>r.contractingAgency).filter(Boolean)).size)},{label:label('受委託廠商','Commissioned companies'),value:String(new Set(filtered.map(r=>r.commissionedCompany).filter(Boolean)).size)}]}/><section className="analysis-list"><h2>{label('專案目錄','Project Directory')}</h2><div className="filter-grid"><label><span>{label('簽約年度','Signing year')}</span><select value={year} onChange={e=>setYear(e.target.value)}><option value="">{label('全部','All')}</option>{years.map(y=><option key={y}>{y}</option>)}</select></label><label className="search-field"><span>{label('搜尋','Search')}</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={label('搜尋專案、類型、機關、廠商或備註','Search project, type, agency, company, or notes')}/></label></div><button className="link-button" onClick={csv}>{label('下載目前篩選 CSV','Download filtered CSV')}</button><div className="table-wrap"><table><thead><tr>{[label('專案','Project'),label('促參類型','PPP type'),label('辦理機關','Agency'),label('受委託廠商','Company'),label('簽約日','Signing date'),label('契約期間','Period'),label('民間投資','Investment'),label('權利金累計','Royalties'),label('年度土地租金','Land rent'),label('備註','Notes')].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{visible.map(r=><tr key={r.id}><td>{r.projectName??'—'}</td><td>{r.pppType}</td><td>{r.contractingAgency||'—'}</td><td>{r.commissionedCompany||'—'}</td><td>{r.signingDate??'—'}</td><td>{r.contractPeriodRaw||'—'}</td><td>{formatNtd(r.privateInvestmentAmount,language)}</td><td>{formatNtd(r.accumulatedRoyaltyAmount,language)}</td><td>{formatNtd(r.annualLandRentAmount,language)}</td><td>{r.note||'—'}</td></tr>)}</tbody></table></div><nav className="pagination"><button disabled={page===1} onClick={()=>setPage(p=>p-1)}>{label('上一頁','Previous')}</button><span>{page} / {pages}</span><button disabled={page===pages} onClick={()=>setPage(p=>p+1)}>{label('下一頁','Next')}</button></nav></section></>; }

function MunicipalPublicLandInventory({ records, language }: { records: DataBundle['publicLandRecords']; language: Language }) { const label=(zh:string,en:string)=>language==='zh'?zh:en; const [agency,setAgency]=useState(''); const [search,setSearch]=useState(''); const [page,setPage]=useState(1); const agencies=[...new Set(records.map(r=>r.managingAgency).filter((v):v is string=>!!v))].sort(); const filtered=records.filter(r=>(!agency||r.managingAgency===agency)&&(!search||`${r.managingAgency} ${r.landIdentifier} ${r.districtName}`.toLowerCase().includes(search.toLowerCase()))); const total=(key:'parcelAreaSquareMeters'|'ownershipShareAreaSquareMeters'|'recordedValue')=>filtered.reduce((sum,r)=>sum+(r[key]??0),0); const pages=Math.max(1,Math.ceil(filtered.length/25)); const visible=filtered.slice((page-1)*25,page*25); useEffect(()=>setPage(1),[agency,search]); const exportCsv=()=>{const url=URL.createObjectURL(new Blob([['agency,landIdentifier,district,parcelAreaSquareMeters,ownershipShareAreaSquareMeters,ownershipShareRatio,recordedValue,recordedValuePerOwnedSquareMeter',...filtered.map(r=>[r.managingAgency,r.landIdentifier,r.districtName,r.parcelAreaSquareMeters,r.ownershipShareAreaSquareMeters,r.ownershipShareRatio,r.recordedValue,r.recordedValuePerOwnedSquareMeter].map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(','))].join('\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='municipal-public-land-inventory-filtered.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),0)}; return <><section className="section-intro"><h2>{label('市有公用土地清冊','Municipal Public-Use Land Inventory')}</h2><p className="notice">{label('本資料為市有公用土地的公開清冊，僅供市有土地、公共資產及帳列資料分析。列帳金額不是市價、公告土地現值、交易價格、開發價值或出售價格；資料不代表土地目前可供使用、出售、出租、開發或不受權利及使用限制。','This dataset is a public inventory of municipally owned public-use land. Recorded value is not market value, announced land value, transaction price, development value, or sale price. It does not indicate availability, sale, lease, development, or unrestricted title.')}</p></section><MetricStrip items={[{label:label('土地紀錄','Land records'),value:String(filtered.length)},{label:label('管理機關','Managing agencies'),value:String(new Set(filtered.map(r=>r.managingAgency).filter(Boolean)).size)},{label:label('可辨識行政區','Identifiable districts'),value:String(new Set(filtered.map(r=>r.districtName).filter(Boolean)).size)},{label:label('宗地面積（㎡）','Parcel area (m²)'),value:total('parcelAreaSquareMeters').toLocaleString()},{label:label('持分面積（㎡）','Owned-share area (m²)'),value:total('ownershipShareAreaSquareMeters').toLocaleString()},{label:label('列帳金額','Recorded value'),value:formatNtd(total('recordedValue'),language)}]}/><section className="analysis-list"><h2>{label('土地清冊','Land Inventory')}</h2><div className="filter-grid"><label><span>{label('管理機關','Managing agency')}</span><select value={agency} onChange={e=>setAgency(e.target.value)}><option value="">{label('全部','All')}</option>{agencies.map(a=><option key={a}>{a}</option>)}</select></label><label className="search-field"><span>{label('搜尋','Search')}</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={label('搜尋機關、土地標示或行政區','Search agency, land identifier, or district')}/></label></div><button className="link-button" onClick={exportCsv}>{label('下載目前篩選 CSV','Download filtered CSV')}</button><div className="table-wrap"><table><thead><tr>{[label('管理機關','Agency'),label('土地標示名稱','Land identifier'),label('行政區','District'),label('宗地面積（㎡）','Parcel area (m²)'),label('持分面積（㎡）','Owned-share area (m²)'),label('持分比率（推導）','Ownership ratio (derived)'),label('列帳金額','Recorded value'),label('每持分㎡列帳金額（推導）','Recorded value per owned m² (derived)')].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{visible.map(r=><tr key={r.id}><td>{r.managingAgency??'—'}</td><td>{r.landIdentifier??'—'}</td><td>{districtLabel(r.districtName,language)}</td><td>{r.parcelAreaSquareMeters?.toLocaleString()??'—'}</td><td>{r.ownershipShareAreaSquareMeters?.toLocaleString()??'—'}</td><td>{formatPercent(r.ownershipShareRatio)}</td><td>{formatNtd(r.recordedValue,language)}</td><td>{formatNtd(r.recordedValuePerOwnedSquareMeter,language)}</td></tr>)}</tbody></table></div><nav className="pagination"><button disabled={page===1} onClick={()=>setPage(p=>p-1)}>{label('上一頁','Previous')}</button><span>{page} / {pages}</span><button disabled={page===pages} onClick={()=>setPage(p=>p+1)}>{label('下一頁','Next')}</button></nav></section></>; }

function MunicipalIdlePropertyLeaseTenders({ records, summary, language }: { records: MunicipalIdlePropertyLeaseTenderRecord[]; summary: MunicipalIdlePropertyLeaseTenderSummary; language: Language }) {
  const label = (zh: string, en: string) => language === 'zh' ? zh : en;
  const [year, setYear] = useState(''); const [district, setDistrict] = useState(''); const [award, setAward] = useState(''); const [areaMin, setAreaMin] = useState(''); const [areaMax, setAreaMax] = useState(''); const [reserveMin, setReserveMin] = useState(''); const [reserveMax, setReserveMax] = useState(''); const [awardedMin, setAwardedMin] = useState(''); const [awardedMax, setAwardedMax] = useState(''); const [premiumMin, setPremiumMin] = useState(''); const [premiumMax, setPremiumMax] = useState(''); const [search, setSearch] = useState(''); const [sort, setSort] = useState<'year' | 'awardedRent' | 'premiumRate'>('year'); const [direction, setDirection] = useState<'asc' | 'desc'>('desc'); const [page, setPage] = useState(1);
  const years = [...new Set(records.map((record) => record.year).filter((value): value is number => value !== undefined))].sort((a, b) => b - a); const districts = [...new Set(records.map((record) => record.districtNameFromLocation).filter((value): value is string => !!value))].sort();
  const inRange = (value: number | undefined, min: string, max: string) => (!min || (value !== undefined && value >= Number(min))) && (!max || (value !== undefined && value <= Number(max)));
  const filtered = records.filter((record) => (!year || record.year === Number(year)) && (!district || record.districtNameFromLocation === district) && (!award || (award === 'awarded' ? record.hasAwardedRent : !record.hasAwardedRent)) && inRange(record.leasedAreaSquareMeters, areaMin, areaMax) && inRange(record.reserveRent, reserveMin, reserveMax) && inRange(record.awardedRent, awardedMin, awardedMax) && inRange(record.premiumRate === undefined ? undefined : record.premiumRate * 100, premiumMin, premiumMax) && (!search || `${record.caseNameRaw ?? ''} ${record.propertyLocationRaw ?? ''} ${record.districtNameFromLocation ?? ''} ${record.year ?? ''}`.toLowerCase().includes(search.toLowerCase())));
  const ordered = [...filtered].sort((a, b) => { const values = sort === 'year' ? [a.year, b.year] : sort === 'awardedRent' ? [a.awardedRent, b.awardedRent] : [a.premiumRate, b.premiumRate]; const result = (values[0] ?? -Infinity) - (values[1] ?? -Infinity); return direction === 'asc' ? result : -result; });
  const sum = (key: 'leasedAreaSquareMeters' | 'reserveRent' | 'awardedRent') => filtered.reduce((total, record) => total + (record[key] ?? 0), 0); const values = (key: 'awardedRent' | 'awardedRentPerSquareMeter' | 'premiumRate') => filtered.map((record) => record[key]).filter((value): value is number => value !== undefined); const median = (items: number[]) => { const sorted = [...items].sort((a, b) => a - b); const mid = Math.floor(sorted.length / 2); return sorted.length ? (sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2) : undefined; };
  const byYear = years.map((item) => { const matching = filtered.filter((record) => record.year === item); return { year: item, recordCount: matching.length, totalLeasedAreaSquareMeters: matching.reduce((total, record) => total + (record.leasedAreaSquareMeters ?? 0), 0), totalReserveRent: matching.reduce((total, record) => total + (record.reserveRent ?? 0), 0), totalAwardedRent: matching.reduce((total, record) => total + (record.awardedRent ?? 0), 0) }; }); const byDistrict = districts.map((item) => ({ districtName: item, recordCount: filtered.filter((record) => record.districtNameFromLocation === item).length })).filter((item) => item.recordCount);
  const histogram = (items: number[], cuts: number[]) => cuts.map((cut, index) => ({ band: index === cuts.length - 1 ? `${cut}+` : `${cut}–${cuts[index + 1]}`, records: items.filter((value) => value >= cut && (index === cuts.length - 1 || value < cuts[index + 1])).length })); const premiumDistribution = histogram(values('premiumRate').map((value) => value * 100), [-100, 0, 25, 50, 100]); const awardedPerSqmDistribution = histogram(values('awardedRentPerSquareMeter'), [0, 1_000, 5_000, 10_000, 25_000]);
  useEffect(() => setPage(1), [year, district, award, areaMin, areaMax, reserveMin, reserveMax, awardedMin, awardedMax, premiumMin, premiumMax, search, sort, direction]); const pageSize = 20; const pages = Math.max(1, Math.ceil(ordered.length / pageSize)); const visible = ordered.slice((Math.min(page, pages) - 1) * pageSize, Math.min(page, pages) * pageSize);
  const switchSort = (next: typeof sort) => { if (sort === next) setDirection((value) => value === 'asc' ? 'desc' : 'asc'); else { setSort(next); setDirection('desc'); } }; const downloadCsv = () => { const columns = ['year', 'caseName', 'propertyLocation', 'district', 'leasedAreaSquareMeters', 'reserveRent', 'awardedRent', 'premiumAmount', 'premiumRate', 'awardedRentPerSquareMeter']; const rows = ordered.map((record) => [record.year, record.caseNameRaw, record.propertyLocationRaw, record.districtNameFromLocation, record.leasedAreaSquareMeters, record.reserveRent, record.awardedRent, record.premiumAmount, record.premiumRate, record.awardedRentPerSquareMeter].map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')); const url = URL.createObjectURL(new Blob([[columns.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'municipal-idle-property-lease-tenders-filtered.csv'; anchor.click(); URL.revokeObjectURL(url); };
  const missing = '—';
  return <>
    <section className="section-intro"><h2>{label('市有閒置房地出租招標', 'Municipal Idle Property Lease Tenders')}</h2><p>{label('依年度、案件、出租面積、標租底價、得標價與來源位置文字，探索臺北市公開的市有閒置房地出租招標歷史紀錄。', 'Explore historical public municipal idle-property lease tender records by year, case, leased area, reserve rent, awarded rent, and source location text.')}</p><p className="notice">{label('本資料為臺北市市有閒置房地出租招標歷史公開紀錄，僅供市有財產、出租與招標結果分析。標租底價、得標價、出租面積與位置不代表目前可供出租、現行租金、市場租金、可使用性、完整權利狀態、土地使用限制、投資價值或未來報酬。請向臺北市政府財政局及官方招標文件查證實際招標條件、價格單位、租期與案件狀態。', 'This dataset contains historical public records of Taipei municipal idle-property lease tenders. It is for analysis of municipal property, leasing, and tender results only. Reserve prices, awarded prices, leased areas, and locations do not confirm current availability, current rent, market rent, usability, complete title status, land-use restrictions, investment value, or future returns. Verify actual tender terms, price units, lease periods, and case status through Taipei City Department of Finance and official tender documents.')}</p></section>
    <MetricStrip items={[{ label: label('招標紀錄', 'Tender records'), value: filtered.length.toLocaleString() }, { label: label('最新可用年度', 'Latest available year'), value: String(filtered.map((record) => record.year).filter((value): value is number => value !== undefined).sort().at(-1) ?? missing) }, { label: label('出租面積（㎡）', 'Leased area (m²)'), value: sum('leasedAreaSquareMeters').toLocaleString(language === 'zh' ? 'zh-TW' : 'en-US', { maximumFractionDigits: 1 }) }, { label: label('標租底價', 'Reserve rent'), value: formatNtd(sum('reserveRent'), language) }, { label: label('得標價', 'Awarded rent'), value: formatNtd(sum('awardedRent'), language) }, { label: label('有得標價紀錄', 'Records with awarded prices'), value: values('awardedRent').length.toLocaleString() }, { label: label('得標價中位數', 'Median awarded rent'), value: formatNtd(median(values('awardedRent')), language) }, { label: label('得標價每㎡中位數', 'Median awarded rent per m²'), value: formatNtd(median(values('awardedRentPerSquareMeter')), language) }, { label: label('平均溢價率（推導）', 'Average premium rate (derived)'), value: formatPercent(values('premiumRate').length ? values('premiumRate').reduce((total, value) => total + value, 0) / values('premiumRate').length : undefined) }, { label: label('最高得標價', 'Highest awarded rent'), value: formatNtd(values('awardedRent').length ? Math.max(...values('awardedRent')) : undefined, language) }]} />
    <div className="chart-grid"><ChartSection title={label('年度招標紀錄與出租面積', 'Tender Records and Leased Area by Year')}><ResponsiveContainer width="100%" height={280}><ComposedChart data={byYear}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="year" /><YAxis yAxisId="count" /><YAxis yAxisId="area" orientation="right" /><Tooltip content={<ChartTooltip language={language} />} /><Legend /><Bar yAxisId="count" dataKey="recordCount" name={label('紀錄', 'Records')} fill="#356f9d" /><Line yAxisId="area" dataKey="totalLeasedAreaSquareMeters" name={label('面積（㎡）', 'Area (m²)')} stroke="#b24738" /></ComposedChart></ResponsiveContainer></ChartSection><ChartSection title={label('年度標租底價與得標價', 'Reserve versus Awarded Rent by Year')}><ResponsiveContainer width="100%" height={280}><BarChart data={byYear}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="year" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Legend /><Bar dataKey="totalReserveRent" name={label('標租底價', 'Reserve')} fill="#c58a43" /><Bar dataKey="totalAwardedRent" name={label('得標價', 'Awarded')} fill="#408579" /></BarChart></ResponsiveContainer></ChartSection><ChartSection title={label('溢價率分布（推導）', 'Premium-rate Distribution (Derived)')}><ResponsiveContainer width="100%" height={280}><BarChart data={premiumDistribution}><XAxis dataKey="band" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="records" name={label('紀錄', 'Records')} fill="#775f86" /></BarChart></ResponsiveContainer></ChartSection><ChartSection title={label('得標價每㎡分布（推導）', 'Awarded Rent per m² Distribution (Derived)')}><ResponsiveContainer width="100%" height={280}><BarChart data={awardedPerSqmDistribution}><XAxis dataKey="band" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="records" name={label('紀錄', 'Records')} fill="#737d68" /></BarChart></ResponsiveContainer></ChartSection><ChartSection title={label('可可靠辨識的行政區', 'Records by Reliably Derived District')}><ResponsiveContainer width="100%" height={280}><BarChart data={byDistrict}><XAxis dataKey="districtName" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="recordCount" name={label('紀錄', 'Records')} fill="#356f9d" /></BarChart></ResponsiveContainer></ChartSection></div>
    <section className="analysis-list"><h2>{label('招標紀錄', 'Tender Records')}</h2><details className="filters" open><summary>{label('篩選條件', 'Filters')}</summary><div className="filter-grid"><label><span>{label('年度', 'Year')}</span><select value={year} onChange={(event) => setYear(event.target.value)}><option value="">{label('全部年度', 'All years')}</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label><span>{label('行政區', 'District')}</span><select value={district} onChange={(event) => setDistrict(event.target.value)}><option value="">{label('全部行政區', 'All districts')}</option>{districts.map((item) => <option key={item} value={item}>{districtLabel(item, language)}</option>)}</select></label><label><span>{label('得標狀態', 'Award status')}</span><select value={award} onChange={(event) => setAward(event.target.value)}><option value="">{label('全部', 'All')}</option><option value="awarded">{label('有得標價', 'Has awarded price')}</option><option value="not-awarded">{label('無得標價', 'No awarded price')}</option></select></label><label><span>{label('最小出租面積（㎡）', 'Minimum leased area (m²)')}</span><input type="number" min="0" value={areaMin} onChange={(event) => setAreaMin(event.target.value)} /></label><label><span>{label('最大出租面積（㎡）', 'Maximum leased area (m²)')}</span><input type="number" min="0" value={areaMax} onChange={(event) => setAreaMax(event.target.value)} /></label><label><span>{label('最小標租底價', 'Minimum reserve rent')}</span><input type="number" min="0" value={reserveMin} onChange={(event) => setReserveMin(event.target.value)} /></label><label><span>{label('最大標租底價', 'Maximum reserve rent')}</span><input type="number" min="0" value={reserveMax} onChange={(event) => setReserveMax(event.target.value)} /></label><label><span>{label('最小得標價', 'Minimum awarded rent')}</span><input type="number" min="0" value={awardedMin} onChange={(event) => setAwardedMin(event.target.value)} /></label><label><span>{label('最大得標價', 'Maximum awarded rent')}</span><input type="number" min="0" value={awardedMax} onChange={(event) => setAwardedMax(event.target.value)} /></label><label><span>{label('最小溢價率（%）', 'Minimum premium rate (%)')}</span><input type="number" value={premiumMin} onChange={(event) => setPremiumMin(event.target.value)} /></label><label><span>{label('最大溢價率（%）', 'Maximum premium rate (%)')}</span><input type="number" value={premiumMax} onChange={(event) => setPremiumMax(event.target.value)} /></label><label className="search-field"><span>{label('搜尋', 'Search')}</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={label('搜尋案件、地址或地號、行政區、年度', 'Search case, address or land number, district, or year')} /></label></div></details><div className="table-actions"><p className="table-count">{ordered.length.toLocaleString()} {label('筆紀錄', 'records')}</p><button className="link-button" onClick={downloadCsv}>{label('下載目前篩選 CSV', 'Download filtered CSV')}</button></div><div className="table-wrap"><table><thead><tr><th><button className="sort-button" onClick={() => switchSort('year')}>{label('年度', 'Year')}</button></th><th>{label('案件', 'Case')}</th><th>{label('地址或地號', 'Address or land number')}</th><th>{label('行政區', 'District')}</th><th>{label('出租面積（㎡）', 'Leased area (m²)')}</th><th>{label('標租底價', 'Reserve rent')}</th><th><button className="sort-button" onClick={() => switchSort('awardedRent')}>{label('得標價', 'Awarded rent')}</button></th><th>{label('溢價金額（推導）', 'Premium amount (derived)')}</th><th><button className="sort-button" onClick={() => switchSort('premiumRate')}>{label('溢價率（推導）', 'Premium rate (derived)')}</button></th><th>{label('得標價每㎡（推導）', 'Awarded rent per m² (derived)')}</th><th>{label('地圖查詢', 'Map lookup')}</th></tr></thead><tbody>{visible.map((record) => <tr key={record.id}><td>{record.year ?? record.yearRaw ?? missing}</td><td>{record.caseNameRaw ?? missing}</td><td>{record.propertyLocationRaw ?? missing}</td><td>{districtLabel(record.districtNameFromLocation, language)}</td><td>{record.leasedAreaSquareMeters?.toLocaleString(language === 'zh' ? 'zh-TW' : 'en-US', { maximumFractionDigits: 2 }) ?? missing}</td><td>{formatNtd(record.reserveRent, language)}</td><td>{formatNtd(record.awardedRent, language)}</td><td>{formatNtd(record.premiumAmount, language)}</td><td>{formatPercent(record.premiumRate)}</td><td>{formatNtd(record.awardedRentPerSquareMeter, language)}</td><td>{record.externalMapQuery ? <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(record.externalMapQuery)}`} target="_blank" rel="noreferrer">{label('查詢', 'Search')}</a> : missing}</td></tr>)}</tbody></table></div><nav className="pagination"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>{label('上一頁', 'Previous')}</button><span>{label('第', 'Page')} {Math.min(page, pages)} / {pages}</span><button disabled={page === pages} onClick={() => setPage((value) => value + 1)}>{label('下一頁', 'Next')}</button></nav></section>
    <section className="analysis-list"><h2>{label('資料品質', 'Data Quality')}</h2><dl className="detail-list"><div><dt>{label('無效年度', 'Invalid years')}</dt><dd>{summary.dataQuality.invalidYearCount}</dd></div><div><dt>{label('無效金額', 'Invalid amounts')}</dt><dd>{summary.dataQuality.invalidAmountCount}</dd></div><div><dt>{label('無效面積', 'Invalid areas')}</dt><dd>{summary.dataQuality.invalidAreaCount}</dd></div><div><dt>{label('重複列', 'Duplicate rows')}</dt><dd>{summary.dataQuality.duplicateCount}</dd></div><div><dt>{label('缺漏欄位值', 'Missing field values')}</dt><dd>{summary.dataQuality.missingFieldCount}</dd></div></dl></section><section className="notes"><h2>{label('資料說明', 'Data Notes')}</h2><p>{label('所有來源值均以原始字串保留；年度同時支援民國與西元，畫面使用推導後西元年度。面積、標租底價與得標價只在可解析時參與計算；空白、破折號與非數值不會當成零。價格頻率或租期未由來源欄位定義，故本模組不作假設。', 'All source values are retained as raw strings. ROC and Gregorian years are supported, and the interface shows the derived Gregorian year. Areas and prices contribute only when parseable; blank, dash, and nonnumeric values are not treated as zero. The source does not define pricing frequency or lease period, so this module makes no assumption.')}</p><p>{label('行政區僅在位置文字清楚包含行政區時推導。地址或地號不完整、土地編號及描述性位置不會被地理編碼；僅含可用街道地址的紀錄提供外部地圖搜尋連結。', 'A district is derived only when the location text clearly contains one. Incomplete addresses, land numbers, and descriptive locations are not geocoded; only records with a usable street address offer an external map-search link.')}</p></section>
  </>;
}

function RealEstateBrokerPenalties({ records, summary, language }: { records: RealEstateBrokerPenaltyRecord[]; summary: RealEstateBrokerPenaltySummary; language: Language }) {
  const label = (zh: string, en: string) => language === 'zh' ? zh : en;
  const [year, setYear] = useState(''); const [category, setCategory] = useState(''); const [subjectType, setSubjectType] = useState(''); const [city, setCity] = useState(''); const [minAmount, setMinAmount] = useState(''); const [maxAmount, setMaxAmount] = useState(''); const [search, setSearch] = useState(''); const [page, setPage] = useState(1);
  const years = [...new Set(records.map((record) => record.dispositionYear).filter((value): value is number => value !== undefined))].sort((a, b) => b - a);
  const cities = [...new Set(records.map((record) => record.cityName).filter((value): value is string => !!value))].sort();
  const filtered = records.filter((record) => (!year || record.dispositionYear === Number(year)) && (!category || record.violationCategory === category) && (!subjectType || record.subjectType === subjectType) && (!city || record.cityName === city) && (!minAmount || (record.penaltyAmount ?? -Infinity) >= Number(minAmount)) && (!maxAmount || (record.penaltyAmount ?? Infinity) <= Number(maxAmount)) && (!search || `${record.subjectName ?? ''} ${record.violationRule ?? ''} ${record.cityName ?? ''} ${record.dispositionYear ?? ''}`.toLowerCase().includes(search.toLowerCase())));
  useEffect(() => setPage(1), [year, category, subjectType, city, minAmount, maxAmount, search]);
  const pageSize = 25; const pages = Math.max(1, Math.ceil(filtered.length / pageSize)); const visible = filtered.slice((Math.min(page, pages) - 1) * pageSize, Math.min(page, pages) * pageSize);
  const typeLabel = (value: string) => ({ brokerage: label('經紀業', 'Brokerage'), individual: label('個人', 'Individual'), unknown: label('未分類', 'Unknown') }[value] ?? value);
  return <>
    <section className="section-intro"><h2>{label('不動產經紀業裁罰紀錄', 'Real Estate Brokerage Penalty Records')}</h2><p>{label('依處分日期、違反規定、處罰金額與資料來源中的經紀業或姓名，探索臺北市公開歷史裁罰紀錄。', 'Explore Taipei public historical penalty records by disposition date, source rule wording, penalty amount, and the brokerage or name provided in the source.')}</p><p className="notice">{label('本資料為臺北市不動產經紀業管理條例之歷史公開裁罰紀錄，僅供法規遵循與公共資料分析。歷史裁罰不代表目前違規、營業狀態、整體服務品質、信用狀況、交易安全或官方推薦；處罰金額亦非完整違規嚴重度指標。請向臺北市政府地政局或相關主管機關查證現行法令與案件狀態。', 'This dataset contains historical public penalty records under Taipei real-estate brokerage regulations. It is for regulatory-compliance and public-data analysis only. A historical penalty does not establish current non-compliance, operating status, overall service quality, creditworthiness, transaction safety, or official recommendation. Penalty amount alone should not be treated as a complete measure of violation severity. Verify current legal and case status with Taipei City Department of Land Administration or the relevant authority.')}</p><p className="notice">{label('資料不含地址或座標；本模組不建立地圖標記、不製作黑名單、風險分數或信任排名。', 'The source has no addresses or coordinates. This module creates no map markers, blacklist, risk score, or trust ranking.')}</p></section>
    <MetricStrip items={[{ label: label('裁罰紀錄', 'Penalty records'), value: summary.totalRecords.toLocaleString() }, { label: label('最新年度', 'Latest available year'), value: String(summary.latestYear ?? '—') }, { label: label('裁罰總額', 'Total penalty amount'), value: formatNtd(summary.totalPenaltyAmount, language) }, { label: label('平均裁罰', 'Average penalty amount'), value: formatNtd(summary.averagePenaltyAmount, language) }, { label: label('裁罰中位數', 'Median penalty amount'), value: formatNtd(summary.medianPenaltyAmount, language) }, { label: label('最高單筆裁罰', 'Highest single penalty'), value: formatNtd(summary.highestPenaltyAmount, language) }, { label: label('不同主體數', 'Unique subjects'), value: summary.uniqueSubjectCount.toLocaleString() }, { label: label('最常見違反類別', 'Most common category'), value: summary.mostCommonViolationCategory ?? '—' }]} />
    <div className="chart-grid">
      <ChartSection title={label('年度裁罰紀錄數', 'Penalty Records by Year')}><ResponsiveContainer width="100%" height={280}><BarChart data={summary.byYear}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="year" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="recordCount" name={label('紀錄數', 'Records')} fill="#356f9d" /></BarChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('年度裁罰金額與平均值', 'Penalty Amount by Year')}><ResponsiveContainer width="100%" height={280}><ComposedChart data={summary.byYear}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="year" /><YAxis yAxisId="amount" /><Tooltip content={<ChartTooltip language={language} />} /><Legend /><Bar yAxisId="amount" dataKey="totalPenaltyAmount" name={label('總額', 'Total')} fill="#b24738" /><Line yAxisId="amount" dataKey="averagePenaltyAmount" name={label('平均', 'Average')} stroke="#408579" /></ComposedChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('違反規定類別', 'Violation Categories')}><ResponsiveContainer width="100%" height={280}><BarChart data={summary.byViolationCategory.slice(0, 10)} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" /><YAxis type="category" dataKey="violationCategory" width={125} /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="recordCount" name={label('紀錄數', 'Records')} fill="#737d68" /></BarChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('違反類別裁罰金額', 'Penalty Amount by Category')}><ResponsiveContainer width="100%" height={280}><BarChart data={summary.byViolationCategory.slice(0, 10)} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" /><YAxis type="category" dataKey="violationCategory" width={125} /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="totalPenaltyAmount" name={label('裁罰總額', 'Total penalty')} fill="#c58a43" /></BarChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('經紀業與個人紀錄', 'Brokerage and Individual Records')}><ResponsiveContainer width="100%" height={280}><PieChart><Pie data={summary.bySubjectType.map((item) => ({ ...item, label: typeLabel(item.subjectType) }))} dataKey="recordCount" nameKey="label" outerRadius={95}>{summary.bySubjectType.map((item, index) => <Cell key={item.subjectType} fill={colors[index]} />)}</Pie><Tooltip content={<ChartTooltip language={language} />} /><Legend /></PieChart></ResponsiveContainer></ChartSection>
      <ChartSection title={label('裁罰金額分布', 'Penalty Amount Distribution')}><ResponsiveContainer width="100%" height={280}><BarChart data={summary.penaltyAmountDistribution}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" /><YAxis /><Tooltip content={<ChartTooltip language={language} />} /><Bar dataKey="recordCount" name={label('紀錄數', 'Records')} fill="#775f86" /></BarChart></ResponsiveContainer></ChartSection>
    </div>
    <section className="analysis-list"><h2>{label('資料表', 'Data Table')}</h2><details className="filters" open><summary>{label('篩選條件', 'Filters')}</summary><div className="filter-grid"><label><span>{label('處分年度', 'Disposition year')}</span><select value={year} onChange={(event) => setYear(event.target.value)}><option value="">{label('全部年度', 'All years')}</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label><span>{label('違反類別', 'Violation category')}</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">{label('全部類別', 'All categories')}</option>{summary.byViolationCategory.map((item) => <option key={item.violationCategory} value={item.violationCategory}>{item.violationCategory}</option>)}</select></label><label><span>{label('主體類型', 'Subject type')}</span><select value={subjectType} onChange={(event) => setSubjectType(event.target.value)}><option value="">{label('全部類型', 'All types')}</option>{summary.bySubjectType.map((item) => <option key={item.subjectType} value={item.subjectType}>{typeLabel(item.subjectType)}</option>)}</select></label><label><span>{label('縣市', 'City')}</span><select value={city} onChange={(event) => setCity(event.target.value)}><option value="">{label('全部縣市', 'All cities')}</option>{cities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label><span>{label('最低金額', 'Minimum amount')}</span><input type="number" min="0" value={minAmount} onChange={(event) => setMinAmount(event.target.value)} /></label><label><span>{label('最高金額', 'Maximum amount')}</span><input type="number" min="0" value={maxAmount} onChange={(event) => setMaxAmount(event.target.value)} /></label><label className="search-field"><span>{label('搜尋', 'Search')}</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={label('搜尋經紀業或姓名、違反規定、縣市、年度', 'Search subject, violation rule, city, or year')} /></label></div></details><p className="table-count">{filtered.length.toLocaleString()} {label('筆紀錄', 'records')}</p><div className="table-wrap"><table><thead><tr>{[label('處分日期', 'Disposition date'), label('經紀業或姓名', 'Brokerage or individual'), label('主體類型', 'Subject type'), label('違反規定', 'Violation rule'), label('處罰金額', 'Penalty amount'), label('縣市', 'City')].map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{visible.map((record) => <tr key={record.id}><td>{record.dispositionDate ?? record.dispositionDateRaw ?? '—'}</td><td>{record.subjectName ?? '—'}</td><td>{typeLabel(record.subjectType)}</td><td>{record.violationRule ?? '—'}</td><td>{formatNtd(record.penaltyAmount, language)}</td><td>{record.cityName ?? '—'}</td></tr>)}</tbody></table></div><nav className="pagination"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>{label('上一頁', 'Previous')}</button><span>{label('第', 'Page')} {Math.min(page, pages)} / {pages}</span><button disabled={page === pages} onClick={() => setPage((value) => value + 1)}>{label('下一頁', 'Next')}</button></nav></section>
    <section className="analysis-list"><h2>{label('資料品質', 'Data Quality')}</h2><MetricStrip items={[{ label: label('無效日期', 'Invalid dates'), value: summary.dataQuality.invalidDateCount.toLocaleString() }, { label: label('無效金額', 'Invalid amounts'), value: summary.dataQuality.invalidAmountCount.toLocaleString() }, { label: label('缺漏欄位', 'Missing fields'), value: summary.dataQuality.missingFieldCount.toLocaleString() }, { label: label('移除重複紀錄', 'Duplicates removed'), value: summary.dataQuality.duplicateCount.toLocaleString() }, { label: label('已解析日期', 'Parsed dates'), value: summary.dataQuality.recordsWithParsedDate.toLocaleString() }, { label: label('已解析金額', 'Parsed amounts'), value: summary.dataQuality.recordsWithParsedAmount.toLocaleString() }]} /></section>
    <section className="analysis-list"><h2>{label('資料說明', 'Data Notes')}</h2><p>{label('違反規定欄位保留來源原文；較高層級類別僅從可見條文號碼整理，因此可由紀錄中的原始規定回溯。主體類型只依名稱文字的明顯經紀業用語分類，並不推論個人身分、公司資格或目前營業狀態。', 'Violation rules retain the source wording. Broader categories are only derived from visible article numbers, so they remain reversible through each record’s original rule. Subject type is classified only from clear brokerage wording in the source name and does not infer identity, legal status, or current operating status.')}</p></section>
  </>;
}

function SocialHousingProgress({ records, summary, language }: { records: SocialHousingConstructionProgressRecord[]; summary: SocialHousingConstructionProgressSummary; language: Language }) { const label=(zh:string,en:string)=>language==='zh'?zh:en; const [district,setDistrict]=useState(''); const [stage,setStage]=useState(''); const [search,setSearch]=useState(''); const filtered=records.filter(r=>(!district||r.districtName===district)&&(!stage||r.constructionStageCategory===stage)&&(!search||`${r.projectName} ${r.districtName} ${r.address} ${r.constructionStage}`.toLowerCase().includes(search.toLowerCase()))); const coords=filtered.filter(r=>r.hasValidCoordinates); const lon=(v:number)=>((v-121.3)/.5)*100; const lat=(v:number)=>100-((v-24.85)/.45)*100; return <><section className="section-intro"><h2>{label('社會住宅興建工程進度','Social Housing Construction Progress')}</h2><p className="notice">{label('本資料為公開社會住宅位置、規劃戶數、列載居住人口與興建階段資訊，不代表即時工地狀態、保證完工或入住、可申請戶數、候補狀態、租金、資格、安全或品質；請向臺北市政府都市發展局及相關機關查證。','This dataset provides public information about Taipei social-housing locations, planned households, listed resident population, and construction stages. Source progress records do not represent real-time site status, guaranteed completion or occupancy, rental availability, available application units, waiting-list status, rent, eligibility, construction safety, housing quality, or an official commitment. Verify current construction, rental, and occupancy information with Taipei City Department of Urban Development and relevant authorities.')}</p></section><MetricStrip items={[{label:label('專案數','Projects'),value:String(summary.totalProjects)},{label:label('有效座標','Valid coordinates'),value:String(summary.validCoordinateCount)},{label:label('行政區','Districts'),value:String(summary.districtCount)},{label:label('規劃戶數','Planned households'),value:summary.totalPlannedHouseholds.toLocaleString()},{label:label('列載居住人口','Listed population'),value:summary.totalResidentPopulation.toLocaleString()},{label:label('施工中或待開工','Under construction'),value:String(summary.underConstructionCount)},{label:label('已完工或入住','Completed / occupied'),value:String(summary.completedOrOccupiedCount)}]} /><section className="analysis-list"><h2>{label('專案地圖','Project Map')}</h2><p>{label('僅使用官方點座標；不繪製工地邊界。','Official point coordinates only; no construction-site boundaries.')}</p><div className="map-canvas" role="img" aria-label="Social housing project map">{coords.map(r=><button className="map-marker" style={{left:`${lon(r.longitude!)}%`,top:`${lat(r.latitude!)}%`}} title={`${r.projectName}\n${r.districtName}\n${r.constructionStage}`} key={r.id}>●</button>)}</div></section><div className="chart-grid"><ChartSection title={label('興建階段','Construction Stages')}><ResponsiveContainer width="100%" height={260}><BarChart data={summary.byStage}><XAxis dataKey="constructionStageCategory"/><YAxis/><Tooltip/><Bar dataKey="recordCount" fill="#356f9d"/></BarChart></ResponsiveContainer></ChartSection><ChartSection title={label('行政區與規劃戶數','District Housing Supply')}><ResponsiveContainer width="100%" height={260}><BarChart data={summary.byDistrict}><XAxis dataKey="districtName"/><YAxis/><Tooltip/><Bar dataKey="plannedHouseholds" fill="#b24738"/></BarChart></ResponsiveContainer></ChartSection></div><section className="analysis-list"><h2>{label('專案目錄','Project Directory')}</h2><div className="filter-grid"><label><span>{label('行政區','District')}</span><select value={district} onChange={e=>setDistrict(e.target.value)}><option value="">{label('全部','All')}</option>{summary.byDistrict.map(x=><option value={x.districtName} key={x.districtName}>{x.districtName}</option>)}</select></label><label><span>{label('階段','Stage')}</span><select value={stage} onChange={e=>setStage(e.target.value)}><option value="">{label('全部','All')}</option>{summary.byStage.map(x=><option value={x.constructionStageCategory} key={x.constructionStageCategory}>{x.constructionStageCategory}</option>)}</select></label><label><span>{label('搜尋','Search')}</span><input value={search} onChange={e=>setSearch(e.target.value)}/></label></div><div className="table-wrap"><table><thead><tr>{['Project','District','Address','Stage','Planned households','Resident population','Floors','Longitude','Latitude'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td>{r.projectName}</td><td>{r.districtName}</td><td>{r.address}</td><td>{r.constructionStage}</td><td>{r.plannedHouseholds}</td><td>{r.residentPopulation}</td><td>{r.floorDescription}</td><td>{r.longitude}</td><td>{r.latitude}</td></tr>)}</tbody></table></div></section><section className="analysis-list"><h2>{label('資料品質','Data Quality')}</h2><p>{JSON.stringify(summary.dataQuality)}</p></section></>; }

function RentalBusinessDirectory({ language }: { language: Language }) {
  const label = (zh: string, en: string) => language === 'zh' ? zh : en;
  const [records, setRecords] = useState<Array<{ id: string; cityName?: string; authorityCode?: string; registrationNumber?: string; businessName?: string; practiceStatusRaw?: string; practiceStatusNormalized?: string }>>([]);
  const [search, setSearch] = useState(''); const [page, setPage] = useState(1);
  useEffect(() => { loadJson<typeof records>('rental-housing-service-businesses/records.json').then(setRecords).catch(() => setRecords([])); }, []);
  const filtered = records.filter((record) => !search || `${record.businessName} ${record.registrationNumber} ${record.authorityCode} ${record.cityName} ${record.practiceStatusRaw}`.toLowerCase().includes(search.toLowerCase())); const pages = Math.max(1, Math.ceil(filtered.length / 25)); const visible = filtered.slice((page - 1) * 25, page * 25);
  useEffect(() => setPage(1), [search]);
  return <><section className="section-intro"><h2>{label('租賃住宅服務業業者名冊', 'Rental Housing Service Business Directory')}</h2><p className="notice">{label('本名冊提供登錄與執業狀態紀錄；來源狀態不代表服務品質、信用、履約能力、消費安全或官方推薦。', 'This directory provides registration and practice-status records. Source status is not a measure of service quality, creditworthiness, performance, consumer safety, or official recommendation.')}</p></section><MetricStrip items={[{ label: label('業者紀錄', 'Business records'), value: String(filtered.length) }, { label: label('登錄號碼', 'Registration numbers'), value: String(new Set(filtered.map((record) => record.registrationNumber).filter(Boolean)).size) }, { label: label('執業中', 'Active records'), value: String(filtered.filter((record) => record.practiceStatusNormalized === 'active').length) }]} /><section className="analysis-list"><h2>{label('業者目錄', 'Business Directory')}</h2><div className="filter-grid"><label className="search-field"><span>{label('搜尋', 'Search')}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={label('搜尋業者、登錄號碼、機關或縣市', 'Search business, registration, authority, or city')} /></label></div><div className="table-wrap"><table><thead><tr>{[label('業者名稱', 'Business'), label('登錄號碼', 'Registration number'), label('執業狀態', 'Practice status'), label('縣市', 'City'), label('機關代碼', 'Authority code')].map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{visible.map((record) => <tr key={record.id}><td>{record.businessName ?? '—'}</td><td>{record.registrationNumber ?? '—'}</td><td>{record.practiceStatusRaw ?? '—'}</td><td>{record.cityName ?? '—'}</td><td>{record.authorityCode ?? '—'}</td></tr>)}</tbody></table></div><nav className="pagination"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>{label('上一頁', 'Previous')}</button><span>{page} / {pages}</span><button disabled={page === pages} onClick={() => setPage((value) => value + 1)}>{label('下一頁', 'Next')}</button></nav></section></>;
}

function PublicWorksAwardDirectory({ language }: { language: Language }) {
  const label=(zh:string,en:string)=>language==='zh'?zh:en; const [records,setRecords]=useState<Array<{id:string;year?:number;awardCategory?:string;projectName?:string;contractAmountThousandNtd?:number;contractAmountNtd?:number;contractingAgency?:string;contractor?:string;designUnit?:string;supervisionUnit?:string;projectManagementUnit?:string}>>([]); const [search,setSearch]=useState(''); const [page,setPage]=useState(1);
  useEffect(()=>{loadJson<typeof records>('public-works-excellence-award-projects/records.json').then(setRecords).catch(()=>setRecords([]));},[]); const filtered=records.filter(r=>!search||`${r.projectName} ${r.awardCategory} ${r.contractingAgency} ${r.contractor} ${r.designUnit} ${r.supervisionUnit} ${r.projectManagementUnit}`.toLowerCase().includes(search.toLowerCase())); const pages=Math.max(1,Math.ceil(filtered.length/25)); const visible=filtered.slice((page-1)*25,page*25); useEffect(()=>setPage(1),[search]);
  return <><section className="section-intro"><h2>{label('公共工程卓越獎獲獎工程', 'Public Works Excellence Award Projects')}</h2><p className="notice">{label('本資料為歷年獲獎工程紀錄；獎項與列載契約金額不代表目前工程進度、最終支出、完工品質、履約表現或參與單位整體表現。', 'Award records and listed contract values do not represent current progress, final expenditure, completed quality, contract performance, or overall organization performance.')}</p></section><MetricStrip items={[{label:label('獲獎工程','Awarded projects'),value:String(filtered.length)},{label:label('年度範圍','Award years'),value:`${Math.min(...filtered.map(r=>r.year??Infinity)) || '—'} – ${Math.max(...filtered.map(r=>r.year??0)) || '—'}`},{label:label('列載契約金額','Listed contract amount'),value:formatNtd(filtered.reduce((s,r)=>s+(r.contractAmountNtd??0),0),language)}]}/><section className="analysis-list"><h2>{label('工程目錄','Project Directory')}</h2><div className="filter-grid"><label className="search-field"><span>{label('搜尋','Search')}</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={label('搜尋工程、類別或參與單位','Search project, category, or organizations')}/></label></div><div className="table-wrap"><table><thead><tr>{[label('年度','Year'),label('類別','Category'),label('工程','Project'),label('契約金額','Listed contract amount'),label('主辦機關','Agency'),label('施工單位','Contractor'),label('設計單位','Design'),label('監造單位','Supervision')].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{visible.map(r=><tr key={r.id}><td>{r.year??'—'}</td><td>{r.awardCategory??'—'}</td><td>{r.projectName??'—'}</td><td>{r.contractAmountThousandNtd===undefined?'—':`${r.contractAmountThousandNtd.toLocaleString()} ${label('千元（來源）','thousand NTD (source)')} / ${formatNtd(r.contractAmountNtd,language)}`}</td><td>{r.contractingAgency??'—'}</td><td>{r.contractor??'—'}</td><td>{r.designUnit??'—'}</td><td>{r.supervisionUnit??'—'}</td></tr>)}</tbody></table></div><nav className="pagination"><button disabled={page===1} onClick={()=>setPage(p=>p-1)}>{label('上一頁','Previous')}</button><span>{page} / {pages}</span><button disabled={page===pages} onClick={()=>setPage(p=>p+1)}>{label('下一頁','Next')}</button></nav></section></>;
}

export default function App() {
  const [language, setLanguage] = useState<Language>('zh');
  const [tab, setTab] = useState(0);
  const [data, setData] = useState<DataBundle>();
  const [error, setError] = useState(false);
  const [district, setDistrict] = useState('');
  const [recordType, setRecordType] = useState('');
  const [buildingType, setBuildingType] = useState('');
  const [search, setSearch] = useState('');
  const t = copy[language];
  const tabLabels = language === 'zh' ? [...t.tabs.slice(0, 16), '不動產經紀業裁罰', '社會住宅工程進度', '市有閒置房地出租招標', '促參案件簽約概況', ...t.tabs.slice(16)] : [...t.tabs.slice(0, 16), 'Real Estate Brokerage Penalties', 'Social Housing Construction Progress', 'Municipal Idle Property Lease Tenders', 'Public-Private Partnership Contracts', ...t.tabs.slice(16)];

  useEffect(() => {
    Promise.all([
      loadJson<RealPriceRecord[]>('real-price-records.json'),
      loadJson<RealEstateSummary>('real-price-summary.json'),
      loadJson<QuarterlyMarketRecord[]>('quarterly-market-analysis.json'),
      loadJson<QuarterlySummary>('quarterly-market-summary.json'),
      loadJson<PopulationDistrictSummary[]>('population-district-summary.json'),
      loadJson<DistrictComparisonSummary[]>('district-comparison-summary.json'),
      loadJson<ResidentialPriceMonthlyIndexRecord[]>('residential-price-monthly-index-records.json'),
      loadJson<ResidentialPriceMonthlyIndexSummary>('residential-price-monthly-index-summary.json'),
      loadJson<ResidentialPriceQuarterlyIndexRecord[]>('residential-price-quarterly-index-records.json'),
      loadJson<ResidentialPriceQuarterlyIndexSummary>('residential-price-quarterly-index-summary.json'),
      loadJson<ResidentialPriceQuarterlyIndexRecord[]>('residential-price-quarterly-index-latest.json'),
      loadJson<CommercialOfficeRentIndexRecord[]>('commercial-office-rent-index-records.json'),
      loadJson<CommercialOfficeRentIndexSummary>('commercial-office-rent-index-summary.json'),
      loadJson<ResidentialRentIndexRecord[]>('residential-rent-index-records.json'),
      loadJson<ResidentialRentIndexSummary>('residential-rent-index-summary.json'),
      loadJson<LandParcelAssessedValueRecord[]>('land-parcel-assessed-value-records.json'),
      loadJson<LandParcelAssessedValueSummary>('land-parcel-assessed-value-summary.json'),
      loadJson<LandUseZoningControlRecord[]>('land-use-zoning-control-summary.json'),
      loadJson<LandUseZoningControlSummary>('land-use-zoning-control-summary-stats.json'),
      loadJson<IncomePerEarnerByDistrictYearRecord[]>('income-per-earner-by-district-year-records.json'),
      loadJson<IncomePerEarnerByDistrictYearSummary>('income-per-earner-by-district-year-summary.json'),
      loadJson<IncomePerEarnerByDistrictYearRecord[]>('income-per-earner-by-district-year-latest.json'),
      loadJson<ConsumerPriceBasicAnnualIndexRecord[]>('consumer-price-basic-annual-index.json'),
      loadJson<ConsumerPriceBasicAnnualIndexSummary>('consumer-price-basic-annual-index-summary.json'),
      loadJson<ConsumerPriceBasicAnnualIndexRecord[]>('consumer-price-basic-annual-index-latest.json'),
      loadJson<TaipowerTaipeiElectricitySalesRecord[]>('taipower-taipei-electricity-sales.json'),
      loadJson<TaipowerTaipeiElectricitySalesSummary>('taipower-taipei-electricity-sales-summary.json'),
      loadJson<LandValueTaxProgressiveBracketRecord[]>('land-value-tax-progressive-brackets.json'),
      loadJson<LandValueTaxProgressiveBracketSummary>('land-value-tax-progressive-bracket-summary.json'),
      loadJson<MovablePropertyPledgeBusinessRecord[]>('movable-property-pledge-business-records.json'),
      loadJson<MovablePropertyPledgeBusinessSummary>('movable-property-pledge-business-summary.json'),
      loadJson<MovablePropertySecuredTransactionRecord[]>('movable-property-secured-transaction-records.json'),
      loadJson<MovablePropertySecuredTransactionSummary>('movable-property-secured-transaction-summary.json'),
      loadJson<RealEstateBrokerPenaltyRecord[]>('real-estate-broker-penalties/records.json'),
      loadJson<RealEstateBrokerPenaltySummary>('real-estate-broker-penalties/summary.json'),
      loadJson<SocialHousingConstructionProgressRecord[]>('social-housing-construction-progress/records.json'),
      loadJson<SocialHousingConstructionProgressSummary>('social-housing-construction-progress/summary.json'),
      loadJson<MunicipalIdlePropertyLeaseTenderRecord[]>('municipal-idle-property-lease-tenders/records.json'),
      loadJson<MunicipalIdlePropertyLeaseTenderSummary>('municipal-idle-property-lease-tenders/summary.json'),
      loadJson<DataBundle['pppRecords']>('public-private-partnership-contracts/records.json'),
    ]).then(([records, realEstate, quarterly, quarterlySummary, population, comparison, priceIndexRecords, priceIndexSummary, quarterlyPriceIndexRecords, quarterlyPriceIndexSummary, quarterlyPriceIndexLatest, commercialRentRecords, commercialRentSummary, rentIndexRecords, rentIndexSummary, landValueRecords, landValueSummary, landUseZoningRecords, landUseZoningSummary, incomeRecords, incomeSummary, incomeLatest, cpiRecords, cpiSummary, cpiLatest, electricityRecords, electricitySummary, landValueTaxRecords, landValueTaxSummary, pledgeRecords, pledgeSummary, securedTransactionRecords, securedTransactionSummary, brokerPenaltyRecords, brokerPenaltySummary, socialHousingRecords, socialHousingSummary, municipalIdlePropertyLeaseTenderRecords, municipalIdlePropertyLeaseTenderSummary, pppRecords]) =>
      setData({ rentalBusinessRecords: [], publicLandRecords: [], pppRecords, records, realEstate, quarterly, quarterlySummary, population, comparison, priceIndexRecords, priceIndexSummary, quarterlyPriceIndexRecords, quarterlyPriceIndexSummary, quarterlyPriceIndexLatest, commercialRentRecords, commercialRentSummary, rentIndexRecords, rentIndexSummary, landValueRecords, landValueSummary, landUseZoningRecords, landUseZoningSummary, incomeRecords, incomeSummary, incomeLatest, cpiRecords, cpiSummary, cpiLatest, electricityRecords, electricitySummary, landValueTaxRecords, landValueTaxSummary, pledgeRecords, pledgeSummary, securedTransactionRecords, securedTransactionSummary, brokerPenaltyRecords, brokerPenaltySummary, socialHousingRecords, socialHousingSummary, municipalIdlePropertyLeaseTenderRecords, municipalIdlePropertyLeaseTenderSummary }),
    ).catch(() => setError(true));
  }, []);

  useEffect(() => {
    loadJson<DataBundle['publicLandRecords']>('municipal-public-land-inventory/records.json')
      .then((publicLandRecords) => setData((current) => current ? { ...current, publicLandRecords } : current))
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    const listener = (event: Event) => setTab((event as CustomEvent<number>).detail);
    window.addEventListener('set-dashboard-tab', listener);
    return () => window.removeEventListener('set-dashboard-tab', listener);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-Hant' : 'en';
    document.title = t.appTitle;
  }, [language, t.appTitle]);

  const filteredRecords = useMemo(() => data ? filterRecords(data.records, { district, recordType, buildingType, search }) : [], [data, district, recordType, buildingType, search]);
  const comparisonRows = useMemo(() => data?.comparison.filter((row) => !district || row.district === district) ?? [], [data, district]);

  return <div className="app-shell">
    <header className="masthead">
      <div><span className="eyebrow">TAIPEI OPEN DATA · PUBLIC RECORDS</span><h1>{t.appTitle}</h1><p>{t.appSubtitle}</p></div>
      <div className="language-toggle" role="group" aria-label="Language">
        <button className={language === 'zh' ? 'active' : ''} onClick={() => setLanguage('zh')}>中</button>
        <button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button>
      </div>
    </header>
    <nav className="tabs" aria-label="Main sections">{tabLabels.map((label, index) =>
      <button key={label} className={tab === index ? 'active' : ''} onClick={() => setTab(index)}>{label}</button>)}
      <button className={tab === 23 ? 'active' : ''} onClick={() => setTab(23)}>{language === 'zh' ? '市有公用土地清冊' : 'Municipal Public-Use Land Inventory'}</button>
    </nav>
    <nav className="tabs" aria-label="Rental housing directory"><button className={tab === 24 ? 'active' : ''} onClick={() => setTab(24)}>{language === 'zh' ? '租賃住宅服務業業者名冊' : 'Rental Housing Service Businesses'}</button></nav>
    <nav className="tabs" aria-label="Public works award directory">
      <button className={tab === 25 ? 'active' : ''} onClick={() => setTab(25)}>
        {language === 'zh' ? '公共工程卓越獎獲獎工程' : 'Public Works Excellence Award Projects'}
      </button>
    </nav>
    <nav className="tabs" aria-label="MRT joint development rents">
      <button className={tab === 26 ? 'active' : ''} onClick={() => setTab(26)}>
        {language === 'zh' ? '捷運聯合開發大樓每坪每月租金' : 'MRT Joint Development Building Rents'}
      </button>
    </nav>
    <nav className="tabs" aria-label="Real estate brokerage directory">
      <button className={tab === 27 ? 'active' : ''} onClick={() => setTab(27)}>
        {language === 'zh' ? '不動產經紀業業者名冊' : 'Real Estate Brokerage Business Directory'}
      </button>
    </nav>
    <nav className="tabs" aria-label="Real estate consumer disputes">
      <button className={tab === 28 ? 'active' : ''} onClick={() => setTab(28)}>
        {language === 'zh' ? '不動產消費爭議案件處理資料' : 'Real Estate Consumer Dispute Records'}
      </button>
    </nav>
    <nav className="tabs" aria-label="Real estate appraisers"><button className={tab === 29 ? 'active' : ''} onClick={() => setTab(29)}>{language === 'zh' ? '開業不動產估價師名冊' : 'Practicing Real Estate Appraiser Directory'}</button></nav>
    <nav className="tabs" aria-label="Announced land expropriation"><button className={tab === 30 ? 'active' : ''} onClick={() => setTab(30)}>{language === 'zh' ? '公告徵收清冊' : 'Announced Land Expropriation Registry'}</button></nav>
    <nav className="tabs" aria-label="Land readjustment sale results"><button className={tab === 31 ? 'active' : ''} onClick={() => setTab(31)}>{language === 'zh' ? '市地重劃區抵費地標售成果' : 'Land Readjustment Sale Results'}</button></nav>
    <nav className="tabs" aria-label="Declared land values"><button className={tab === 32 ? 'active' : ''} onClick={() => setTab(32)}>{language === 'zh' ? '申報地價' : 'Taipei Declared Land Values'}</button></nav>
    <nav className="tabs" aria-label="Expropriation custody"><button className={tab === 33 ? 'active' : ''} onClick={() => setTab(33)}>{language === 'zh' ? '一般徵收保管清冊統計' : 'General Expropriation Compensation Custody'}</button></nav>
    <nav className="tabs" aria-label="Consumer prices"><button className={tab === 34 ? 'active' : ''} onClick={() => setTab(34)}>{language === 'zh' ? '臺北市消費者物價趨勢' : 'Taipei Consumer Price Trends'}</button></nav>
    <nav className="tabs" aria-label="Active rental service providers"><button className={tab === 35 ? 'active' : ''} onClick={() => setTab(35)}>{language === 'zh' ? '執業中租服業者名冊' : 'Active Rental Housing Service Providers'}</button></nav>
    <nav className="tabs" aria-label="Cadastral clearing custody"><button className={tab === 36 ? 'active' : ''} onClick={() => setTab(36)}>{language === 'zh' ? '地籍清理標售價金保管款' : 'Cadastral Clearing Sale Proceeds in Custody'}</button></nav>
    <nav className="tabs" aria-label="Metro engineering milestones"><button className={tab === 37 ? 'active' : ''} onClick={() => setTab(37)}>{language === 'zh' ? '臺北捷運工程大事紀要' : 'Taipei Metro Engineering Milestones'}</button></nav>
    <main>
      <Filters language={language} district={district} setDistrict={setDistrict} recordType={recordType} setRecordType={setRecordType} buildingType={buildingType} setBuildingType={setBuildingType} search={search} setSearch={setSearch} />
      {error && <p className="status">{t.loadError}</p>}
      {!data && !error && <p className="status">{t.loading}</p>}
      {data && <>
        {tab === 0 && <MarketOverview data={data} language={language} />}
        {tab === 1 && <ResidentialPriceMonthlyIndex data={data} language={language} />}
        {tab === 2 && <ResidentialPriceQuarterlyIndex data={data} language={language} />}
        {tab === 3 && <ResidentialRentIndex data={data} language={language} />}
        {tab === 4 && <CommercialOfficeRentIndex data={data} language={language} />}
        {tab === 5 && <DistrictComparison rows={comparisonRows} language={language} />}
        {tab === 6 && <QuarterlyAnalysis data={data} language={language} />}
        {tab === 7 && <BuildingUsePermits language={language} />}
        {tab === 8 && <LandValue records={data.landValueRecords} summary={data.landValueSummary} language={language} />}
        {tab === 9 && <LandUseZoningControlSummaryView records={data.landUseZoningRecords} summary={data.landUseZoningSummary} language={language} />}
        {tab === 10 && <LandValueTaxProgressiveBrackets records={data.landValueTaxRecords} summary={data.landValueTaxSummary} language={language} />}
        {tab === 11 && <IncomePerEarnerByDistrictYear records={data.incomeRecords} summary={data.incomeSummary} latest={data.incomeLatest} language={language} />}
        {tab === 12 && <ConsumerPriceBasicAnnualIndex records={data.cpiRecords} summary={data.cpiSummary} language={language} />}
        {tab === 13 && <TaipowerTaipeiElectricitySales records={data.electricityRecords} summary={data.electricitySummary} language={language} />}
        {tab === 14 && <MovablePropertyPledgeBusiness records={data.pledgeRecords} summary={data.pledgeSummary} language={language} />}
        {tab === 15 && <MovablePropertySecuredTransactions records={data.securedTransactionRecords} summary={data.securedTransactionSummary} language={language} />}
        {tab === 16 && <RealEstateBrokerPenalties records={data.brokerPenaltyRecords} summary={data.brokerPenaltySummary} language={language} />}
        {tab === 17 && <SocialHousingProgress records={data.socialHousingRecords} summary={data.socialHousingSummary} language={language} />}
        {tab === 18 && <MunicipalIdlePropertyLeaseTenders records={data.municipalIdlePropertyLeaseTenderRecords} summary={data.municipalIdlePropertyLeaseTenderSummary} language={language} />}
        {tab === 19 && <PublicPrivatePartnershipContracts records={data.pppRecords} language={language} />}
        {tab === 20 && <DemographicContext data={data} language={language} />}
        {tab === 21 && <DataTable records={filteredRecords} language={language} />}
        {tab === 22 && <DataNotes language={language} />}
        {tab === 23 && <MunicipalPublicLandInventory records={data.publicLandRecords} language={language} />}
        {tab === 24 && <RentalBusinessDirectory language={language} />}
        {tab === 25 && <PublicWorksAwardDirectory language={language} />}
        {tab === 26 && <MrtJointDevelopmentRents language={language} />}
        {tab === 27 && <RealEstateBrokerageBusinessDirectory language={language} />}
        {tab === 28 && <RealEstateConsumerDisputes language={language} />}
        {tab === 29 && <RealEstateAppraiserDirectory language={language} />}
        {tab === 30 && <AnnouncedLandExpropriationRegistry language={language} />}
        {tab === 31 && <LandReadjustmentSaleResults language={language} />}
        {tab === 32 && <DeclaredLandValueRecords language={language} />}
        {tab === 33 && <GeneralExpropriationCompensationCustody language={language} />}
        {tab === 34 && <ConsumerPriceNatureMonthlyIndex language={language} />}
        {tab === 35 && <ActiveRentalHousingServiceProviders language={language} />}
        {tab === 36 && <CadastralClearingSaleProceedsCustody language={language} />}
        {tab === 37 && <MetroEngineeringMilestones language={language} />}
      </>}
    </main>
    <footer>{t.footer}<br />{language === 'zh' ? '最新官方資訊請以臺北市資料大平臺及主管機關公告為準。' : 'Refer to Taipei Open Data and official authorities for authoritative information.'}</footer>
  </div>;
}

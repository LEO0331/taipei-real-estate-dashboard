import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from 'recharts';
import { filterCommercialRentIndexRecords, filterPriceIndexRecords, filterRecords, filterRentIndexRecords, sortDistricts } from './dashboard';
import { buildingTypeLabel, commercialOfficeRentCategoryLabel, copy, districtEn, priceIndexCategoryLabel, recordTypeLabel, rentIndexCategoryLabel } from './i18n';
import {
  DISTRICTS,
  type BuildingType,
  type CommercialOfficeRentIndexCategory,
  type CommercialOfficeRentIndexRecord,
  type CommercialOfficeRentIndexSummary,
  type BuildingUsePermitDetailRecord,
  type BuildingUsePermitRecord,
  type BuildingUsePermitSummary,
  type DistrictComparisonSummary,
  type Language,
  type IncomePerEarnerByDistrictYearRecord,
  type IncomePerEarnerByDistrictYearSummary,
  type LandParcelAssessedValueRecord,
  type LandParcelAssessedValueSummary,
  type PopulationDistrictSummary,
  type MovablePropertyPledgeBusinessRecord,
  type MovablePropertyPledgeBusinessSummary,
  type MovablePropertyPledgeItemCategory,
  type MovablePropertySecuredTransactionRecord,
  type MovablePropertySecuredTransactionSummary,
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
  incomeRecords: IncomePerEarnerByDistrictYearRecord[];
  incomeSummary: IncomePerEarnerByDistrictYearSummary;
  incomeLatest: IncomePerEarnerByDistrictYearRecord[];
  pledgeRecords: MovablePropertyPledgeBusinessRecord[];
  pledgeSummary: MovablePropertyPledgeBusinessSummary;
  securedTransactionRecords: MovablePropertySecuredTransactionRecord[];
  securedTransactionSummary: MovablePropertySecuredTransactionSummary;
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
      <button className="link-button" onClick={() => window.dispatchEvent(new CustomEvent('set-dashboard-tab', { detail: 9 }))}>{language === 'zh' ? '查看所得收入' : 'View income context'}</button>
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
      <button className="link-button" onClick={() => window.dispatchEvent(new CustomEvent('set-dashboard-tab', { detail: 10 }))}>{language === 'zh' ? '查看動產質借' : 'View pledge loans'}</button>
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
      <button className="link-button" onClick={() => window.dispatchEvent(new CustomEvent('set-dashboard-tab', { detail: 11 }))}>{language === 'zh' ? '查看動產擔保' : 'View movable collateral'}</button>
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
      <p>本網站整理臺北市公開資料中的實價登錄、每季動態分析、住宅價格指數、住宅租金指數、使用執照摘要、所得收入與人口年齡資料，僅供資料探索與區域或市場趨勢觀察使用，並非不動產估價、租金估價、建物安全判定、產權查證、合法使用認定、稅務判斷、投資建議或價格預測。人口、所得與使用執照資料僅作為區域背景脈絡，不代表房價、租金或交易量之因果解釋。</p>
      <ul><li>週報總價以萬元轉為新臺幣；買賣單價由萬元/坪轉為新臺幣/坪。租賃單價保留元/坪/月。</li><li>民國年加 1911 轉為西元年；無法辨識的日期保留原值並寫入轉換報告。</li><li>{t.residentialPriceIndexDataNote}</li><li>{t.residentialPriceIndexInterpretationNote}</li><li>住宅價格季指數以實價登錄資料庫為基礎，整理全市、公寓、大樓、小宅與12行政區季資料；欄位包含季指數、季變動率、標準住宅總價與標準住宅單價。季指數不代表個別住宅估價、實際成交價格、購屋建議、售屋建議、投資建議、房貸建議或價格預測。</li><li>住宅價格季指數未提供個別地址或經緯度；本網站不建立精確地圖點位，行政區排名排除全市與住宅類型列。</li><li>{t.rentIndexDataNote}</li><li>{t.commercialOfficeRentIndexDataNote}</li><li>{t.commercialOfficeRentIndexInterpretationNote}</li><li>商辦租金指數不含行政區、地址或經緯度，本網站不建立地圖點位。</li><li>所得收入資料以 Big5/CP950 解碼，行政區排名排除「總平均」列；僅供所得與負擔能力背景觀察，不代表個別所得、稅務、貸款、投資、財務建議或市場預測，也不建立精確地圖點位。</li><li>動產擔保登記資料提供登記編號、核准日期、擔保類別、契約期間、債務人、擔保權人、標的物種類、所在地、標的物總金額與擔保債權金額等來源欄位；僅供融資與擔保背景觀察，不代表不動產抵押、房貸、即時權利狀態、信用評等、違約風險、法律意見、投資建議或完整債務資料庫。</li><li>動產擔保登記資料未提供官方座標；本網站只解析地址文字中的行政區，不進行地理編碼或建立精確地圖點位。遮罩統編會原樣保留，不推測缺漏識別資訊。</li><li>使用執照大型 XML 在建置階段串流解析成摘要、分年統計與分塊 JSON；前端不載入原始 XML，也不進行地址地理編碼。</li><li>使用執照摘要僅供建物供給、建築年代與區域趨勢觀察，不等同正式使用執照謄本、最新建管資料、建物安全判定、產權查證、合法使用認定、不動產估價、租金估價或投資建議。</li><li>動產質借處營業概況提供年度營運統計，欄位包含分處別、項目、本年質借件數、本金、現金利息收入與變賣金額；僅供社會經濟背景觀察，不代表房價、租金、房貸壓力、個人信用、貧窮程度、投資訊號、借貸建議或財務決策依據。</li><li>人口資料使用行政區總計列，避免同時加總行政區、里別與男女列。</li></ul>
    </> : <>
      <p>This site organizes Taipei public-data records for real-price registration, quarterly market analysis, residential price indexes, residential rent index, building use-permit summaries, income, and population-by-age data for data exploration and regional or market trend observation only. It is not real-estate appraisal, rent appraisal, building-safety assessment, title verification, legal-use determination, tax judgment, investment advice, or price prediction. Population, income, and use-permit data are regional context and do not represent causal explanation for housing prices, rent, or transaction volume.</p>
      <ul><li>Weekly total prices are converted from NT$10,000; sale unit prices are converted from NT$10,000/ping. Rental unit prices remain NTD/ping/month.</li><li>ROC years are converted by adding 1911. Unparsed values remain in the report.</li><li>{t.residentialPriceIndexDataNote}</li><li>{t.residentialPriceIndexInterpretationNote}</li><li>The residential price quarterly index is compiled from real-price registration data and organizes citywide, apartment, building, small-unit, and 12-district quarterly records. It includes quarterly index, quarterly change, standard total price, and standard unit price. It is not individual-home appraisal, actual transaction price, home-buying advice, home-selling advice, investment advice, mortgage advice, or price forecast.</li><li>The residential price quarterly index has no individual address or coordinate fields. No exact map points are generated, and district rankings exclude citywide and housing-type rows.</li><li>{t.rentIndexDataNote}</li><li>{t.commercialOfficeRentIndexDataNote}</li><li>{t.commercialOfficeRentIndexInterpretationNote}</li><li>Commercial office rent index data has no district, address, or coordinate fields; no map markers are generated.</li><li>Income data is decoded as Big5/CP950, district rankings exclude the city-average row, and the data is income and affordability context only. It is not individual income, tax, lending, investment, financial advice, or market prediction, and no exact map points are generated.</li><li>Movable property secured transaction records provide source fields such as registration number, approval date, secured transaction type, contract period, debtor, secured party, collateral type, collateral location, collateral value, and secured debt amount. They are financing and collateral context only, not real-estate mortgages, housing loans, real-time rights status, credit ratings, default risk, legal advice, investment advice, or a complete debt registry.</li><li>Movable property secured transaction records have no official coordinates. This site only parses districts from source text and does not geocode or create exact map points. Masked business numbers are preserved as source text and not inferred.</li><li>Large use-permit XML is parsed through a build-time stream into summaries, yearly statistics, and chunked JSON. The frontend never loads raw XML or geocodes addresses.</li><li>Use-permit summaries are building-stock context only; they are not official transcripts, current building-management records, safety assessments, title verification, legal-use determination, appraisal, or investment advice.</li><li>Movable-property pledge business statistics are annual operating statistics for socioeconomic context only. They do not represent real-estate prices, rents, mortgage stress, individual credit status, poverty level, investment signals, lending advice, or financial decisions.</li><li>District total population rows avoid double-counting district, village, male, and female levels.</li></ul>
    </>}
    <div className="source-links">
      <a href="https://data.taipei/dataset/detail?id=a9a97996-3a55-46c8-9076-e5ebdefad6dc">臺北市實價周報</a>
      <a href="https://data.taipei/dataset/detail?id=ce4ea2c6-6334-44f8-945a-5705492b187d">臺北市住宅價格月指數</a>
      <a href="https://data.taipei/dataset/detail?id=954911b5-896d-4ae1-9ebe-87c4ba8a191e">臺北市住宅價格季指數</a>
      <a href="https://data.taipei/dataset/detail?id=53e5ee8d-9a90-42bc-9874-3a8747ae6afa">每季動態分析</a>
      <a href="https://data.taipei/dataset/detail?id=029c6d0d-c880-4de7-b2fb-9e56669a6f20">住宅租金指數</a>
      <a href="https://data.taipei/dataset/detail?id=8a3d1df7-9169-4dd0-ae0a-949d970e9bb3">商辦租金指數</a>
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
      loadJson<IncomePerEarnerByDistrictYearRecord[]>('income-per-earner-by-district-year-records.json'),
      loadJson<IncomePerEarnerByDistrictYearSummary>('income-per-earner-by-district-year-summary.json'),
      loadJson<IncomePerEarnerByDistrictYearRecord[]>('income-per-earner-by-district-year-latest.json'),
      loadJson<MovablePropertyPledgeBusinessRecord[]>('movable-property-pledge-business-records.json'),
      loadJson<MovablePropertyPledgeBusinessSummary>('movable-property-pledge-business-summary.json'),
      loadJson<MovablePropertySecuredTransactionRecord[]>('movable-property-secured-transaction-records.json'),
      loadJson<MovablePropertySecuredTransactionSummary>('movable-property-secured-transaction-summary.json'),
    ]).then(([records, realEstate, quarterly, quarterlySummary, population, comparison, priceIndexRecords, priceIndexSummary, quarterlyPriceIndexRecords, quarterlyPriceIndexSummary, quarterlyPriceIndexLatest, commercialRentRecords, commercialRentSummary, rentIndexRecords, rentIndexSummary, landValueRecords, landValueSummary, incomeRecords, incomeSummary, incomeLatest, pledgeRecords, pledgeSummary, securedTransactionRecords, securedTransactionSummary]) =>
      setData({ records, realEstate, quarterly, quarterlySummary, population, comparison, priceIndexRecords, priceIndexSummary, quarterlyPriceIndexRecords, quarterlyPriceIndexSummary, quarterlyPriceIndexLatest, commercialRentRecords, commercialRentSummary, rentIndexRecords, rentIndexSummary, landValueRecords, landValueSummary, incomeRecords, incomeSummary, incomeLatest, pledgeRecords, pledgeSummary, securedTransactionRecords, securedTransactionSummary }),
    ).catch(() => setError(true));
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
    <nav className="tabs" aria-label="Main sections">{t.tabs.map((label, index) =>
      <button key={label} className={tab === index ? 'active' : ''} onClick={() => setTab(index)}>{label}</button>)}</nav>
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
        {tab === 9 && <IncomePerEarnerByDistrictYear records={data.incomeRecords} summary={data.incomeSummary} latest={data.incomeLatest} language={language} />}
        {tab === 10 && <MovablePropertyPledgeBusiness records={data.pledgeRecords} summary={data.pledgeSummary} language={language} />}
        {tab === 11 && <MovablePropertySecuredTransactions records={data.securedTransactionRecords} summary={data.securedTransactionSummary} language={language} />}
        {tab === 12 && <DemographicContext data={data} language={language} />}
        {tab === 13 && <DataTable records={filteredRecords} language={language} />}
        {tab === 14 && <DataNotes language={language} />}
      </>}
    </main>
    <footer>{t.footer}<br />{language === 'zh' ? '最新官方資訊請以臺北市資料大平臺及主管機關公告為準。' : 'Refer to Taipei Open Data and official authorities for authoritative information.'}</footer>
  </div>;
}

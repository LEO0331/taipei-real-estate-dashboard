import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from 'recharts';
import { filterPriceIndexRecords, filterRecords, filterRentIndexRecords, sortDistricts } from './dashboard';
import { buildingTypeLabel, copy, districtEn, priceIndexCategoryLabel, recordTypeLabel, rentIndexCategoryLabel } from './i18n';
import {
  DISTRICTS,
  type BuildingType,
  type BuildingUsePermitDetailRecord,
  type BuildingUsePermitRecord,
  type BuildingUsePermitSummary,
  type DistrictComparisonSummary,
  type Language,
  type LandParcelAssessedValueRecord,
  type LandParcelAssessedValueSummary,
  type PopulationDistrictSummary,
  type QuarterlyMarketRecord,
  type ResidentialPriceIndexCategory,
  type ResidentialPriceMonthlyIndexRecord,
  type ResidentialPriceMonthlyIndexSummary,
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
  rentIndexRecords: ResidentialRentIndexRecord[];
  rentIndexSummary: ResidentialRentIndexSummary;
  landValueRecords: LandParcelAssessedValueRecord[];
  landValueSummary: LandParcelAssessedValueSummary;
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
      <button className="link-button" onClick={() => window.dispatchEvent(new CustomEvent('set-dashboard-tab', { detail: 4 }))}>{language === 'zh' ? '查看租金指數' : 'View rent index'}</button>
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
      <p>本網站整理臺北市公開資料中的實價登錄、每季動態分析、住宅租金指數、使用執照摘要與人口年齡資料，僅供資料探索與區域或市場趨勢觀察使用，並非不動產估價、租金估價、建物安全判定、產權查證、合法使用認定、投資建議或價格預測。人口與使用執照資料僅作為區域背景脈絡，不代表房價、租金或交易量之因果解釋。</p>
      <ul><li>週報總價以萬元轉為新臺幣；買賣單價由萬元/坪轉為新臺幣/坪。租賃單價保留元/坪/月。</li><li>民國年加 1911 轉為西元年；無法辨識的日期保留原值並寫入轉換報告。</li><li>{t.residentialPriceIndexDataNote}</li><li>{t.residentialPriceIndexInterpretationNote}</li><li>{t.rentIndexDataNote}</li><li>使用執照大型 XML 在建置階段串流解析成摘要、分年統計與分塊 JSON；前端不載入原始 XML，也不進行地址地理編碼。</li><li>使用執照摘要僅供建物供給、建築年代與區域趨勢觀察，不等同正式使用執照謄本、最新建管資料、建物安全判定、產權查證、合法使用認定、不動產估價、租金估價或投資建議。</li><li>人口資料使用行政區總計列，避免同時加總行政區、里別與男女列。</li></ul>
    </> : <>
      <p>This site organizes Taipei public-data records for real-price registration, quarterly market analysis, residential rent index, building use-permit summaries, and population-by-age data for data exploration and regional or market trend observation only. It is not real-estate appraisal, rent appraisal, building-safety assessment, title verification, legal-use determination, investment advice, or price prediction. Population and use-permit data are regional context and do not represent causal explanation for housing prices, rent, or transaction volume.</p>
      <ul><li>Weekly total prices are converted from NT$10,000; sale unit prices are converted from NT$10,000/ping. Rental unit prices remain NTD/ping/month.</li><li>ROC years are converted by adding 1911. Unparsed values remain in the report.</li><li>{t.residentialPriceIndexDataNote}</li><li>{t.residentialPriceIndexInterpretationNote}</li><li>{t.rentIndexDataNote}</li><li>Large use-permit XML is parsed through a build-time stream into summaries, yearly statistics, and chunked JSON. The frontend never loads raw XML or geocodes addresses.</li><li>Use-permit summaries are building-stock context only; they are not official transcripts, current building-management records, safety assessments, title verification, legal-use determination, appraisal, or investment advice.</li><li>District total population rows avoid double-counting district, village, male, and female levels.</li></ul>
    </>}
    <div className="source-links">
      <a href="https://data.taipei/dataset/detail?id=a9a97996-3a55-46c8-9076-e5ebdefad6dc">臺北市實價周報</a>
      <a href="https://data.taipei/dataset/detail?id=ce4ea2c6-6334-44f8-945a-5705492b187d">臺北市住宅價格月指數</a>
      <a href="https://data.taipei/dataset/detail?id=53e5ee8d-9a90-42bc-9874-3a8747ae6afa">每季動態分析</a>
      <a href="https://data.taipei/dataset/detail?id=029c6d0d-c880-4de7-b2fb-9e56669a6f20">住宅租金指數</a>
      <a href="https://data.taipei/dataset/detail?id=c876ff02-af2e-4eb8-bd33-d444f5052733">臺北市歷年使用執照摘要</a>
      <a href="https://data.taipei/dataset/detail?id=a6394e3f-3514-4542-87bd-de4310a40db3">人口年齡資料</a>
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
      loadJson<ResidentialRentIndexRecord[]>('residential-rent-index-records.json'),
      loadJson<ResidentialRentIndexSummary>('residential-rent-index-summary.json'),
      loadJson<LandParcelAssessedValueRecord[]>('land-parcel-assessed-value-records.json'),
      loadJson<LandParcelAssessedValueSummary>('land-parcel-assessed-value-summary.json'),
    ]).then(([records, realEstate, quarterly, quarterlySummary, population, comparison, priceIndexRecords, priceIndexSummary, rentIndexRecords, rentIndexSummary, landValueRecords, landValueSummary]) =>
      setData({ records, realEstate, quarterly, quarterlySummary, population, comparison, priceIndexRecords, priceIndexSummary, rentIndexRecords, rentIndexSummary, landValueRecords, landValueSummary }),
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
        {tab === 2 && <DistrictComparison rows={comparisonRows} language={language} />}
        {tab === 3 && <QuarterlyAnalysis data={data} language={language} />}
        {tab === 4 && <ResidentialRentIndex data={data} language={language} />}
        {tab === 5 && <BuildingUsePermits language={language} />}
        {tab === 6 && <LandValue records={data.landValueRecords} summary={data.landValueSummary} language={language} />}
        {tab === 7 && <DemographicContext data={data} language={language} />}
        {tab === 8 && <DataTable records={filteredRecords} language={language} />}
        {tab === 9 && <DataNotes language={language} />}
      </>}
    </main>
    <footer>{t.footer}<br />{language === 'zh' ? '最新官方資訊請以臺北市資料大平臺及主管機關公告為準。' : 'Refer to Taipei Open Data and official authorities for authoritative information.'}</footer>
  </div>;
}

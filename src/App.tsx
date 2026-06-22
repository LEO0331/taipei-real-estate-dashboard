import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from 'recharts';
import { filterRecords, sortDistricts } from './dashboard';
import { buildingTypeLabel, copy, districtEn, recordTypeLabel } from './i18n';
import {
  DISTRICTS,
  type BuildingType,
  type DistrictComparisonSummary,
  type Language,
  type PopulationDistrictSummary,
  type QuarterlyMarketRecord,
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
const formatPriceAxis = (value: number, language: Language) =>
  language === 'zh' ? `${Math.round(value / 10_000)}萬` : `${Math.round(value / 1_000)}k`;
const districtLabel = (district: string | undefined, language: Language) =>
  !district ? '—' : language === 'zh' ? district : districtEn[district] ?? district;

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

function MarketOverview({ data, language }: { data: DataBundle; language: Language }) {
  const t = copy[language];
  const summary = data.realEstate;
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
      <p>本網站整理臺北市公開資料中的實價登錄、每季動態分析與人口年齡資料，僅供資料探索與區域比較使用，並非不動產估價、投資建議或價格預測。人口資料僅作為區域背景脈絡，不代表房價或交易量之因果解釋。實價資料可能因系統維護或後續更新而異動，最新官方資訊請以主管機關及官方查詢系統為準。</p>
      <ul><li>週報總價以萬元轉為新臺幣；買賣單價由萬元/坪轉為新臺幣/坪。租賃單價保留元/坪/月。</li><li>民國年加 1911 轉為西元年；無法辨識的日期保留原值並寫入轉換報告。</li><li>人口資料使用行政區總計列，避免同時加總行政區、里別與男女列。</li><li>房市與人口資料只在行政區層級並列，不推論因果。</li></ul>
    </> : <>
      <p>This site organizes Taipei public real-price records, quarterly market analysis, and population-by-age data for exploration and district comparison only. It is not a property appraisal, investment recommendation, or price prediction tool. Population data provides regional context and does not imply causation. Refer to official systems for authoritative records.</p>
      <ul><li>Weekly total prices are converted from NT$10,000; sale unit prices are converted from NT$10,000/ping. Rental unit prices remain NTD/ping/month.</li><li>ROC years are converted by adding 1911. Unparsed values remain in the report.</li><li>District total population rows avoid double-counting district, village, male, and female levels.</li><li>Real-estate and population data are compared only at district level.</li></ul>
    </>}
    <div className="source-links">
      <a href="https://data.taipei/dataset/detail?id=a9a97996-3a55-46c8-9076-e5ebdefad6dc">臺北市實價周報</a>
      <a href="https://data.taipei/dataset/detail?id=53e5ee8d-9a90-42bc-9874-3a8747ae6afa">每季動態分析</a>
      <a href="https://data.taipei/dataset/detail?id=a6394e3f-3514-4542-87bd-de4310a40db3">人口年齡資料</a>
      <a href={`${base}data/conversion-report.json`}>{language === 'zh' ? '轉換報告' : 'Conversion report'}</a>
    </div>
  </article>;
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
    ]).then(([records, realEstate, quarterly, quarterlySummary, population, comparison]) =>
      setData({ records, realEstate, quarterly, quarterlySummary, population, comparison }),
    ).catch(() => setError(true));
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
        {tab === 1 && <DistrictComparison rows={comparisonRows} language={language} />}
        {tab === 2 && <QuarterlyAnalysis data={data} language={language} />}
        {tab === 3 && <DemographicContext data={data} language={language} />}
        {tab === 4 && <DataTable records={filteredRecords} language={language} />}
        {tab === 5 && <DataNotes language={language} />}
      </>}
    </main>
    <footer>{t.footer}<br />{language === 'zh' ? '最新官方資訊請以臺北市資料大平臺及主管機關公告為準。' : 'Refer to Taipei Open Data and official authorities for authoritative information.'}</footer>
  </div>;
}

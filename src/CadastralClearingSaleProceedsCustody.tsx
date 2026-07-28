import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Language } from './models';

type ReconciliationStatus = 'reconciled' | 'review' | 'incomplete';
type RecordItem = {
  id: string;
  sourceSequenceNumber: string;
  transactionDateRaw: string;
  transactionDate: string | null;
  gregorianYear: number | null;
  transactionReference: string;
  saleAmountRaw: string; saleAmountTwd: number | null;
  taxAmountRaw: string; taxAmountTwd: number | null;
  administrativeFeeRaw: string; administrativeFeeTwd: number | null;
  cadastralClearingRewardRaw: string; cadastralClearingRewardTwd: number | null;
  depositedAmountRaw: string; depositedAmountTwd: number | null;
  claimableAmountRaw: string; claimableAmountTwd: number | null;
  recipientDisplayName: string;
  hasValidDate: boolean; hasValidAmounts: boolean; hasRecipientName: boolean; hasComplexRecipientValue: boolean;
  deductionsTwd: number | null; expectedNetAfterDeductionsTwd: number | null;
  saleToDepositDifferenceTwd: number | null; depositToClaimableDifferenceTwd: number | null;
  reconciliationStatus: ReconciliationStatus;
  sourceFields: Record<string, string>;
  quality: Record<string, boolean>;
};
type Metadata = { resourceUpdatedAt?: string; totalRecords?: number; qualityCounts?: Record<string, number> };

const base = import.meta.env.BASE_URL;
const money = (value: number | null) => value === null ? '—' : `NT$${value.toLocaleString('zh-TW', { maximumFractionDigits: 2 })}`;
const total = (rows: RecordItem[], key: keyof RecordItem) => rows.reduce((sum, row) => sum + (typeof row[key] === 'number' ? row[key] as number : 0), 0);
const median = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); const i = Math.floor(sorted.length / 2); return sorted.length ? (sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2) : null; };
const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export function CadastralClearingSaleProceedsCustody({ language }: { language: Language }) {
  const t = (zh: string, en: string) => language === 'zh' ? zh : en;
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [metadata, setMetadata] = useState<Metadata>({});
  const [query, setQuery] = useState('');
  const [yearStart, setYearStart] = useState(''); const [yearEnd, setYearEnd] = useState('');
  const [saleMin, setSaleMin] = useState(''); const [depositMin, setDepositMin] = useState(''); const [claimableMin, setClaimableMin] = useState('');
  const [amounts, setAmounts] = useState(''); const [status, setStatus] = useState(''); const [validDate, setValidDate] = useState('');
  const [sort, setSort] = useState<'date' | 'sale' | 'deposit'>('date'); const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([
      fetch(`${base}data/cadastral-clearing-sale-proceeds-custody/records.public.json`).then((response) => response.json()),
      fetch(`${base}data/cadastral-clearing-sale-proceeds-custody/metadata.json`).then((response) => response.json()),
    ]).then(([sourceRecords, sourceMetadata]) => { setRecords(sourceRecords); setMetadata(sourceMetadata); });
  }, []);

  const filtered = useMemo(() => {
    const includes = query.trim().toLowerCase();
    const min = (value: string) => value === '' ? null : Number(value);
    const saleFloor = min(saleMin), depositFloor = min(depositMin), claimableFloor = min(claimableMin);
    return records.filter((record) => {
      const searchable = `${record.sourceSequenceNumber} ${record.transactionReference} ${record.transactionDateRaw}`.toLowerCase();
      return (!includes || searchable.includes(includes))
        && (!yearStart || (record.gregorianYear ?? -Infinity) >= Number(yearStart))
        && (!yearEnd || (record.gregorianYear ?? Infinity) <= Number(yearEnd))
        && (saleFloor === null || (record.saleAmountTwd ?? -Infinity) >= saleFloor)
        && (depositFloor === null || (record.depositedAmountTwd ?? -Infinity) >= depositFloor)
        && (claimableFloor === null || (record.claimableAmountTwd ?? -Infinity) >= claimableFloor)
        && (!amounts || String(record.hasValidAmounts) === amounts)
        && (!validDate || String(record.hasValidDate) === validDate)
        && (!status || record.reconciliationStatus === status);
    }).sort((a, b) => sort === 'date'
      ? (b.transactionDate ?? '').localeCompare(a.transactionDate ?? '')
      : (b[sort === 'sale' ? 'saleAmountTwd' : 'depositedAmountTwd'] ?? -Infinity) - (a[sort === 'sale' ? 'saleAmountTwd' : 'depositedAmountTwd'] ?? -Infinity));
  }, [records, query, yearStart, yearEnd, saleMin, depositMin, claimableMin, amounts, validDate, status, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const visible = filtered.slice((page - 1) * 20, page * 20);
  const years = [...new Set(records.map((record) => record.gregorianYear).filter((year): year is number => year !== null))].sort((a, b) => a - b);
  const yearly = years.map((year) => { const rows = filtered.filter((record) => record.gregorianYear === year); return { year, count: rows.length, sale: total(rows, 'saleAmountTwd'), deposited: total(rows, 'depositedAmountTwd'), claimable: total(rows, 'claimableAmountTwd') }; });
  const deductionData = [
    { name: t('稅賦', 'Taxes'), value: total(filtered, 'taxAmountTwd'), fill: '#3b82f6' },
    { name: t('行政處理費', 'Administrative fees'), value: total(filtered, 'administrativeFeeTwd'), fill: '#f59e0b' },
    { name: t('地籍清理獎金', 'Cadastral-clearing rewards'), value: total(filtered, 'cadastralClearingRewardTwd'), fill: '#8b5cf6' },
  ];
  const reconciliationData = (['reconciled', 'review', 'incomplete'] as ReconciliationStatus[]).map((key) => ({ name: key === 'reconciled' ? t('已核對', 'Reconciled') : key === 'review' ? t('待檢視', 'Review') : t('資料不完整', 'Incomplete'), count: filtered.filter((record) => record.reconciliationStatus === key).length }));
  const validSales = filtered.map((record) => record.saleAmountTwd).filter((value): value is number => value !== null);
  const validDeposits = filtered.map((record) => record.depositedAmountTwd).filter((value): value is number => value !== null);
  const saleTotal = total(filtered, 'saleAmountTwd');
  const exportCsv = () => {
    const header = ['ID', 'Transaction date', 'Transaction reference', 'Sale amount', 'Taxes', 'Administrative fee', 'Cadastral-clearing reward', 'Deposited amount', 'Source-recorded claimable amount', 'Recipient (masked)', 'Reconciliation status'];
    const body = filtered.map((record) => [record.sourceSequenceNumber, record.transactionDateRaw, record.transactionReference, record.saleAmountRaw, record.taxAmountRaw, record.administrativeFeeRaw, record.cadastralClearingRewardRaw, record.depositedAmountRaw, record.claimableAmountRaw, record.recipientDisplayName, record.reconciliationStatus]);
    const url = URL.createObjectURL(new Blob([[header, ...body].map((row) => row.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'cadastral-clearing-custody-public-records.csv'; link.click(); URL.revokeObjectURL(url);
  };
  const qualityRows = Object.entries(metadata.qualityCounts ?? {});
  const statusLabel = (value: ReconciliationStatus) => value === 'reconciled' ? t('已核對', 'Reconciled') : value === 'review' ? t('待檢視', 'Review') : t('資料不完整', 'Incomplete');

  return <>
    <section className="section-intro">
      <h2>{t('地籍清理標售價金保管款', 'Cadastral Clearing Sale Proceeds in Custody')}</h2>
      <p className="notice">{t('本資料為地籍清理程序下政府標售土地所得價金的歷史行政帳務紀錄。應領金額為來源更新時的記載，不代表目前可領、未領、帳戶餘額、資格或最終法律權利。', 'This is a historical administrative custody ledger for proceeds from government-conducted land sales under cadastral-clearing procedures. Source-recorded claimable amounts do not establish current claimability, unclaimed funds, account balances, eligibility, or final legal rights.')}</p>
      <p>{t('受領人資訊經遮罩處理；本介面不提供姓名搜尋、個人彙整或完整姓名匯出。', 'Recipient values are masked. This interface does not offer name search, person-level aggregation, or a full-name export.')}</p>
    </section>
    <section className="metric-strip" aria-label={t('總覽', 'Overview')}>
      {[
        [t('篩選後紀錄', 'Filtered records'), filtered.length], [t('交易參考號', 'Unique references'), new Set(filtered.map((record) => record.transactionReference).filter(Boolean)).size],
        [t('標售金額合計', 'Source sale amount total'), money(saleTotal)], [t('稅賦合計', 'Taxes total'), money(total(filtered, 'taxAmountTwd'))],
        [t('行政處理費合計', 'Administrative fees total'), money(total(filtered, 'administrativeFeeTwd'))], [t('地籍清理獎金合計', 'Rewards total'), money(total(filtered, 'cadastralClearingRewardTwd'))],
        [t('存入金額合計', 'Deposited amount total'), money(total(filtered, 'depositedAmountTwd'))], [t('來源記載應領金額合計', 'Source-recorded claimable total'), money(total(filtered, 'claimableAmountTwd'))],
        [t('有效日期', 'Valid dates'), filtered.filter((record) => record.hasValidDate).length], [t('完整金額', 'Complete monetary fields'), filtered.filter((record) => record.hasValidAmounts).length],
      ].map(([label, value]) => <article className="metric" key={String(label)}><span>{label}</span><strong>{value}</strong></article>)}
    </section>
    <section className="analysis-list" aria-label={t('篩選條件', 'Filters')}>
      <h3>{t('篩選與匯出', 'Filters and export')}</h3>
      <div className="filter-grid">
        <label className="search-field"><span>{t('搜尋編號、存支編號或原始日期（不含姓名）', 'Search ID, transaction reference, or raw date (not names)')}</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></label>
        <label><span>{t('起始年份（西元）', 'Start year')}</span><select value={yearStart} onChange={(event) => { setYearStart(event.target.value); setPage(1); }}><option value="">All</option>{years.map((year) => <option key={year}>{year}</option>)}</select></label>
        <label><span>{t('結束年份（西元）', 'End year')}</span><select value={yearEnd} onChange={(event) => { setYearEnd(event.target.value); setPage(1); }}><option value="">All</option>{years.map((year) => <option key={year}>{year}</option>)}</select></label>
        <label><span>{t('標售金額下限', 'Minimum sale amount')}</span><input type="number" min="0" value={saleMin} onChange={(event) => { setSaleMin(event.target.value); setPage(1); }} /></label>
        <label><span>{t('存入金額下限', 'Minimum deposited amount')}</span><input type="number" min="0" value={depositMin} onChange={(event) => { setDepositMin(event.target.value); setPage(1); }} /></label>
        <label><span>{t('應領金額下限', 'Minimum source-recorded claimable amount')}</span><input type="number" min="0" value={claimableMin} onChange={(event) => { setClaimableMin(event.target.value); setPage(1); }} /></label>
        <label><span>{t('金額欄位完整', 'Complete monetary fields')}</span><select value={amounts} onChange={(event) => { setAmounts(event.target.value); setPage(1); }}><option value="">All</option><option value="true">{t('是', 'Yes')}</option><option value="false">{t('否', 'No')}</option></select></label>
        <label><span>{t('日期有效', 'Valid date')}</span><select value={validDate} onChange={(event) => { setValidDate(event.target.value); setPage(1); }}><option value="">All</option><option value="true">{t('是', 'Yes')}</option><option value="false">{t('否', 'No')}</option></select></label>
        <label><span>{t('核對狀態', 'Reconciliation status')}</span><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All</option><option value="reconciled">{statusLabel('reconciled')}</option><option value="review">{statusLabel('review')}</option><option value="incomplete">{statusLabel('incomplete')}</option></select></label>
        <label><span>{t('排序', 'Sort')}</span><select value={sort} onChange={(event) => { setSort(event.target.value as typeof sort); setPage(1); }}><option value="date">{t('日期（新到舊）', 'Date (newest first)')}</option><option value="sale">{t('標售金額（高到低）', 'Sale amount (high to low)')}</option><option value="deposit">{t('存入金額（高到低）', 'Deposited amount (high to low)')}</option></select></label>
      </div>
      <button className="link-button" onClick={exportCsv}>{t('下載篩選後的隱私安全 CSV', 'Download filtered privacy-safe CSV')}</button>
    </section>
    <section className="analysis-list" aria-label={t('財務洞察', 'Financial insights')}>
      <h3>{t('財務洞察', 'Financial Insights')}</h3>
      <p>{t(`有效標售金額中，稅賦 ${saleTotal ? ((total(filtered, 'taxAmountTwd') / saleTotal) * 100).toFixed(1) : '—'}%、行政處理費 ${saleTotal ? ((total(filtered, 'administrativeFeeTwd') / saleTotal) * 100).toFixed(1) : '—'}%、地籍清理獎金 ${saleTotal ? ((total(filtered, 'cadastralClearingRewardTwd') / saleTotal) * 100).toFixed(1) : '—'}%、存入金額 ${saleTotal ? ((total(filtered, 'depositedAmountTwd') / saleTotal) * 100).toFixed(1) : '—'}%。這些是歷史來源記載的彙總，不是現行費率。`, `Of valid source sale amounts, taxes represent ${saleTotal ? ((total(filtered, 'taxAmountTwd') / saleTotal) * 100).toFixed(1) : '—'}%, administrative fees ${saleTotal ? ((total(filtered, 'administrativeFeeTwd') / saleTotal) * 100).toFixed(1) : '—'}%, cadastral-clearing rewards ${saleTotal ? ((total(filtered, 'cadastralClearingRewardTwd') / saleTotal) * 100).toFixed(1) : '—'}%, and deposited amounts ${saleTotal ? ((total(filtered, 'depositedAmountTwd') / saleTotal) * 100).toFixed(1) : '—'}%. These are historical source-recorded aggregates, not current fee rates.`)}</p>
      <p>{t(`標售金額中位數：${money(median(validSales))}；存入金額中位數：${money(median(validDeposits))}。年度變化可能反映案件時點與行政處理，不能視為房地產市場趨勢。`, `Median sale amount: ${money(median(validSales))}; median deposited amount: ${money(median(validDeposits))}. Annual variation may reflect case timing and administration, not real-estate market trends.`)}</p>
      <div className="chart-grid">
        <article className="chart-card"><h4>{t('年度交易筆數', 'Transaction count by year')}</h4><ResponsiveContainer width="100%" height={260}><BarChart data={yearly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="year" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#2563eb" /></BarChart></ResponsiveContainer></article>
        <article className="chart-card"><h4>{t('年度標售與存入金額', 'Sale and deposited amounts by year')}</h4><ResponsiveContainer width="100%" height={260}><BarChart data={yearly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="year" /><YAxis tickFormatter={(value) => `${Math.round(value / 1_000_000)}m`} /><Tooltip formatter={(value) => money(Number(value))} /><Legend /><Bar dataKey="sale" name={t('標售金額', 'Sale')} fill="#2563eb" /><Bar dataKey="deposited" name={t('存入金額', 'Deposited')} fill="#16a34a" /></BarChart></ResponsiveContainer></article>
        <article className="chart-card"><h4>{t('扣除項目組成', 'Aggregate deduction composition')}</h4><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={deductionData} dataKey="value" nameKey="name" outerRadius={90} label={({ name }) => String(name)} /> <Tooltip formatter={(value) => money(Number(value))} /></PieChart></ResponsiveContainer></article>
        <article className="chart-card"><h4>{t('核對狀態', 'Reconciliation status')}</h4><ResponsiveContainer width="100%" height={260}><BarChart data={reconciliationData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#7c3aed" /></BarChart></ResponsiveContainer></article>
      </div>
    </section>
    <section className="analysis-list" aria-label={t('交易目錄', 'Custody transaction directory')}>
      <h3>{t('保管交易目錄', 'Custody Transaction Directory')}</h3>
      <div className="table-wrap"><table><thead><tr>{[t('編號', 'ID'), t('存支日期', 'Transaction date'), t('存支編號', 'Transaction reference'), t('標售金額', 'Sale amount'), t('稅賦', 'Taxes'), t('行政處理費', 'Administrative fee'), t('地籍清理獎金', 'Reward'), t('存入金額', 'Deposited'), t('來源記載應領金額', 'Source-recorded claimable'), t('受領人（遮罩）', 'Recipient (masked)'), t('核對狀態', 'Status'), t('來源細節', 'Source details')].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{visible.map((record) => <tr key={record.id}><td>{record.sourceSequenceNumber || '—'}</td><td>{(record.transactionDate ?? record.transactionDateRaw) || '—'}</td><td>{record.transactionReference || '—'} {record.transactionReference && <button className="link-button" onClick={() => navigator.clipboard?.writeText(record.transactionReference)}>{t('複製', 'Copy')}</button>}</td><td>{money(record.saleAmountTwd)}</td><td>{money(record.taxAmountTwd)}</td><td>{money(record.administrativeFeeTwd)}</td><td>{money(record.cadastralClearingRewardTwd)}</td><td>{money(record.depositedAmountTwd)}</td><td>{money(record.claimableAmountTwd)}</td><td>{record.recipientDisplayName || '—'}</td><td>{statusLabel(record.reconciliationStatus)}</td><td><details><summary>{t('查看', 'View')}</summary><p>{t('以下僅含非個人來源欄位；差異為計算所得的檢視旗標，並非錯誤或不當行為認定。', 'Only non-personal source fields appear below. Differences are derived review flags, not a finding of error or wrongdoing.')}</p><pre>{JSON.stringify({ source: record.sourceFields, derived: { deductionsTwd: record.deductionsTwd, expectedNetAfterDeductionsTwd: record.expectedNetAfterDeductionsTwd, saleToDepositDifferenceTwd: record.saleToDepositDifferenceTwd, depositToClaimableDifferenceTwd: record.depositToClaimableDifferenceTwd }, quality: record.quality }, null, 2)}</pre></details></td></tr>)}</tbody></table></div>
      <nav className="pagination" aria-label={t('分頁', 'Pagination')}><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>{t('上一頁', 'Previous')}</button><span>{page}/{pages}</span><button disabled={page === pages} onClick={() => setPage((value) => value + 1)}>{t('下一頁', 'Next')}</button></nav>
    </section>
    <section className="analysis-list"><h3>{t('資料品質與方法', 'Data Quality and Methodology')}</h3><ul>{qualityRows.map(([key, count]) => <li key={key}>{key}: {count}</li>)}</ul><p>{t('計算僅在所需金額皆可解析時產生：扣除額＝稅賦＋行政處理費＋地籍清理獎金；預期淨額＝標售金額－扣除額。與存入及應領金額相差 NT$1 以內者標示為已核對，其餘列為待檢視或資料不完整。來源值不會被自動更正。', 'Derived values are created only when required amounts parse: deductions = taxes + administrative fees + cadastral-clearing rewards; expected net = sale amount − deductions. A difference within NT$1 of both deposited and source-recorded claimable values is shown as reconciled; other rows are review or incomplete items. Source values are never automatically corrected.')}</p><p>{t(`來源更新時間：${metadata.resourceUpdatedAt ?? '—'}。資料集：臺北市地籍清理標售價金保管款清冊。`, `Source update time: ${metadata.resourceUpdatedAt ?? '—'}. Dataset: Taipei Cadastral Clearing Sale Proceeds in Custody.`)}</p></section>
  </>;
}

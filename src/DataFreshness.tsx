import { useEffect, useState } from 'react';
import type { Language } from './models';

type Source = Record<string, unknown>;
type Entry = { key:string; zh:string; en:string; path:string; coverage:(source:Source) => string | null; sourceUpdate:(source:Source) => string | null };
const base = import.meta.env.BASE_URL;

const entries: Entry[] = [
  { key: 'real-price', zh: '實價登錄摘要', en: 'Real-price registration summary', path: 'real-price-summary.json', coverage: (s) => string(s.latestDataPeriod), sourceUpdate: () => null },
  { key: 'price-monthly', zh: '住宅價格月指數', en: 'Residential price monthly index', path: 'residential-price-monthly-index-summary.json', coverage: (s) => string(s.latestPeriod), sourceUpdate: () => null },
  { key: 'price-quarterly', zh: '住宅價格季指數', en: 'Residential price quarterly index', path: 'residential-price-quarterly-index-summary.json', coverage: (s) => string(s.latestQuarterKey), sourceUpdate: () => null },
  { key: 'rent', zh: '住宅租金指數', en: 'Residential rent index', path: 'residential-rent-index-summary.json', coverage: (s) => string(s.latestQuarterKey), sourceUpdate: () => null },
  { key: 'office-rent', zh: '商辦租金指數', en: 'Commercial office rent index', path: 'commercial-office-rent-index-summary.json', coverage: (s) => string(s.latestPeriod), sourceUpdate: () => null },
  { key: 'income', zh: '所得收入者每人所得', en: 'Income per earner', path: 'income-per-earner-by-district-year-summary.json', coverage: (s) => string(s.latestYear), sourceUpdate: () => null },
  { key: 'annual-cpi', zh: '年度消費者物價指數', en: 'Annual consumer price index', path: 'consumer-price-basic-annual-index-summary.json', coverage: (s) => string(s.latestYear), sourceUpdate: () => null },
  { key: 'monthly-cpi', zh: '消費者物價月指數', en: 'Consumer price monthly index', path: 'consumer-price-nature-monthly-index/metadata.json', coverage: (s) => string(s.latestPeriod), sourceUpdate: (s) => string(s.ingestedAt ?? s.metadataUpdatedAt) },
  { key: 'auction', zh: '地籍清理公告開標結果', en: 'Cadastral cleanup auction results', path: 'cadastral-cleanup-land-auction-results/metadata.json', coverage: (s) => string(s.resourceUpdatedAt), sourceUpdate: (s) => string(s.metadataUpdatedAt ?? s.ingestionTimestamp) },
  { key: 'mrt-land-development', zh: '臺北捷運土地開發作業', en: 'Taipei MRT land development', path: 'mrt-land-development/metadata.json', coverage: () => null, sourceUpdate: (s) => string(s.ingestionTimestamp) },
  { key: 'permits', zh: '建築使用執照', en: 'Building use permits', path: 'building-use-permits/summary.json', coverage: (s) => string(s.maxIssueDate), sourceUpdate: () => null },
];

const string = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value) : null;

export function DataFreshness({ language }: { language: Language }) {
  const t = (zh: string, en: string) => language === 'zh' ? zh : en;
  const [sources, setSources] = useState<Record<string, Source>>({});
  const [bundleGeneratedAt, setBundleGeneratedAt] = useState<string | null>(null);

  useEffect(() => {
    Promise.all(entries.map(async (entry) => [entry.key, await fetch(`${base}data/${entry.path}`).then((response) => response.json())] as const)).then((items) => setSources(Object.fromEntries(items))).catch(() => setSources({}));
    fetch(`${base}data/conversion-report.json`).then((response) => response.json()).then((report) => setBundleGeneratedAt(string(report.generatedAt))).catch(() => setBundleGeneratedAt(null));
  }, []);

  return <section className="analysis-list data-freshness"><div className="section-heading"><div><p className="eyebrow">{t('資料狀態', 'DATA STATUS')}</p><h2>{t('資料涵蓋期間與更新紀錄', 'Coverage windows and update records')}</h2></div><span className="muted">{t('本機資料包產製', 'Local bundle generated')}: {bundleGeneratedAt ?? '—'}</span></div><p className="notice">{t('不同資料集有不同發布週期。表中的「涵蓋到」不是所有資料共用的即時更新日；進行跨資料集比較時，請先確認期間是否相容。', 'Datasets publish on different schedules. “Coverage through” is not a shared real-time update date; confirm compatible periods before comparing datasets.')}</p><div className="table-wrap"><table><thead><tr><th>{t('資料集', 'Dataset')}</th><th>{t('涵蓋到', 'Coverage through')}</th><th>{t('來源／產製更新紀錄', 'Source or build update')}</th><th>{t('狀態', 'Status')}</th></tr></thead><tbody>{entries.map((entry) => { const source = sources[entry.key]; const coverage = source ? entry.coverage(source) : null; const update = source ? entry.sourceUpdate(source) : null; return <tr key={entry.key}><td>{t(entry.zh, entry.en)}</td><td>{coverage ?? '—'}</td><td>{update ?? t('此靜態資料未記錄', 'Not recorded for this static dataset')}</td><td>{source ? t('已載入', 'Loaded') : t('讀取中或無法取得', 'Loading or unavailable')}</td></tr>; })}</tbody></table></div><p className="muted">{t('若來源更新紀錄未提供，請以「涵蓋到」判斷可比較期間，並回到官方來源確認最新狀態。', 'When no source-update record is supplied, use coverage only to assess comparability and confirm the latest status with the official source.')}</p></section>;
}

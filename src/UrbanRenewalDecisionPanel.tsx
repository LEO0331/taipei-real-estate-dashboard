import { useEffect, useMemo, useState } from 'react';
import type { Language } from './models';
import { districtEn } from './i18n';
import type { UrbanRenewalSnapshot, ReviewCandidate, ScenarioOptions } from './types/urbanRenewalDecision';
import { runReviewScenario, compareReviewScenarios, buildReviewBriefing, briefingToCsv } from './utils/urbanRenewalScenario';
import './urbanRenewalDecision.css';

const dimensions: Record<string, {zh:string; en:string}> = {
  source_integrity: {zh:'來源完整性', en:'Source integrity'},
  status_traceability: {zh:'程序狀態可追溯性', en:'Status traceability'},
  temporal_freshness: {zh:'時間更新查核', en:'Temporal freshness'},
  scope_comparability: {zh:'統計口徑可比性', en:'Scope comparability'},
  geographic_completeness: {zh:'行政區涵蓋完整性', en:'Geographic completeness'},
};
const sourceNames: Record<string, {zh:string; en:string}> = {
  A: {zh:'現有營造建築物棟數', en:'Existing building stock'},
  B: {zh:'已核准自行劃定更新單元', en:'Approved self-designated renewal units'},
  C: {zh:'都市更新容積獎勵統計', en:'Renewal floor-area incentives'},
  D: {zh:'既有使用執照摘要', en:'Existing use-permit aggregates'},
  E: {zh:'都市更新審議紀錄', en:'Renewal deliberation records'},
  F: {zh:'官方案件進度查詢', en:'Official progress lookup'},
  G: {zh:'法規及政策說明', en:'Regulations and policy guidance'},
};
const exclusions: Record<string, {zh:string;en:string}> = {
  capacity_limit:{zh:'超出本次查核容量',en:'Outside review capacity'},
  insufficient_evidence:{zh:'必要證據不足',en:'Insufficient essential evidence'},
  district_filter:{zh:'不符行政區條件',en:'Outside district filter'},
  category_filter:{zh:'不符問題類別',en:'Outside category filter'},
  source_excluded:{zh:'來源未選用',en:'Source excluded'},
  strict_source_quality:{zh:'未通過嚴格來源品質要求',en:'Does not meet strict source quality'},
  priority_threshold:{zh:'不符優先層級門檻',en:'Outside tier threshold'},
  no_concrete_reconciliation_question:{zh:'沒有具體程序或識別釐清問題',en:'No concrete stage or identity reconciliation question'},
};
const initialOptions: ScenarioOptions = {capacity:5,strategy:'gaps',district:'all',category:'all',sourceQuality:'strict',priorityThreshold:'C',includePermitContext:true,sourceIds:['B']};
const download = (text:string, extension:string) => {
  const url = URL.createObjectURL(new Blob([text], {type:extension === 'csv' ? 'text/csv;charset=utf-8' : 'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = `urban-renewal-evidence-review.${extension}`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function UrbanRenewalDecisionPanel({language}:{language:Language}) {
  const l = (zh:string,en:string) => language === 'zh' ? zh : en;
  const district = (value:string) => language === 'zh' ? value : districtEn[value] ?? value;
  const [snapshot,setSnapshot] = useState<UrbanRenewalSnapshot>();
  const [error,setError] = useState(false);
  const [attempt,setAttempt] = useState(0);
  const [domain,setDomain] = useState('administrative');
  const [options,setOptions] = useState<ScenarioOptions>(initialOptions);
  const [capacityInput,setCapacityInput] = useState('5');
  const [capacityMode,setCapacityMode] = useState('5');
  const [exportStatus,setExportStatus] = useState('');
  const validCapacity = capacityMode !== 'custom' || (/^[1-9]\d*$/.test(capacityInput) && Number.isSafeInteger(Number(capacityInput)));
  const update = <K extends keyof ScenarioOptions>(key:K,value:ScenarioOptions[K]) => setOptions(current => ({...current,[key]:value}));
  useEffect(() => {
    const abort = new AbortController(); setError(false); setSnapshot(undefined);
    fetch(`${import.meta.env.BASE_URL}data/urban-renewal-decision/snapshot.json`, {signal:abort.signal})
      .then(response => {if (!response.ok) throw new Error('snapshot unavailable'); return response.json();})
      .then((value:UrbanRenewalSnapshot) => {if (value.schemaVersion !== '1.0.0' || value.methodologyVersion !== 'urban-renewal-evidence-review-v1' || !Array.isArray(value.sources) || !value.renewalUnits || !value.buildingAge) throw new Error('unsupported snapshot'); setSnapshot(value);})
      .catch(() => {if (!abort.signal.aborted) setError(true);});
    return () => abort.abort();
  },[attempt]);
  const result = useMemo(() => snapshot ? runReviewScenario(snapshot,options) : null,[snapshot,options]);
  const scenarios = useMemo(() => snapshot ? {
    five:runReviewScenario(snapshot,{...options,capacity:5}), ten:runReviewScenario(snapshot,{...options,capacity:10}),
    gaps:runReviewScenario(snapshot,{...options,strategy:'gaps'}), balanced:runReviewScenario(snapshot,{...options,strategy:'balanced'}),
    strict:runReviewScenario(snapshot,{...options,sourceQuality:'strict'}), permissive:runReviewScenario(snapshot,{...options,sourceQuality:'permissive'}),
    optional:runReviewScenario(snapshot,{...options,includePermitContext:!options.includePermitContext}),
  } : null,[snapshot,options]);
  if (error) return <section className="analysis-list"><h2>{l('老舊建築與都市更新決策分析','Aging Buildings & Urban Renewal Decision Support')}</h2><p role="alert">{l('無法讀取已驗證快照，請重試。','Unable to load the validated snapshot. Please retry.')}</p><button onClick={() => setAttempt(attempt+1)}>{l('重試','Retry')}</button></section>;
  if (!snapshot || !result || !scenarios) return <p className="status" role="status">{l('讀取都市更新查核資料…','Loading urban renewal evidence…')}</p>;
  const latestAge = snapshot.buildingAge.rows.filter(row => row.ageBreakdownValid).at(-1);
  const tierName = (tier:string) => tier === 'A' ? l('A 優先複核','A Verify first') : tier === 'B' ? l('B 例行複核','B Review') : tier === 'C' ? l('C 脈絡觀察','C Context monitoring') : l('證據不足','Insufficient evidence');
  const comparisons = [compareReviewScenarios(scenarios.five,scenarios.ten),compareReviewScenarios(scenarios.gaps,scenarios.balanced),compareReviewScenarios(scenarios.strict,scenarios.permissive),compareReviewScenarios(result,scenarios.optional)];
  const briefing = buildReviewBriefing(snapshot,result,comparisons);
  const exportBriefing = (extension:'json'|'csv') => {download(extension === 'json' ? JSON.stringify(briefing,null,2) : briefingToCsv(briefing),extension); setExportStatus(l('已產生摘要下載檔。','Briefing download generated.'));};
  const renderCandidates = (candidates:ReviewCandidate[]) => <div className="renewal-questions">{candidates.map((candidate,index) => <article className="renewal-question" key={candidate.id}>
    <div className="renewal-question__heading"><span>{index+1}. {district(candidate.district)}</span><strong className={`renewal-tier renewal-tier--${candidate.tier}`}>{tierName(candidate.tier)}</strong></div>
    <h3>{candidate.question[language]}</h3><p>{candidate.dimensions.map(value => dimensions[value]?.[language] ?? value).join(' · ') || l('無重大查核面向','No material review dimensions')}</p>
    <details><summary>{l('選入原因與證據','Selection reasons and evidence')}</summary><ul>{candidate.reasons.map((reason,i) => <li key={i}>{reason[language]}</li>)}</ul><p>{l('獨立來源類型','Independent source types')}: {candidate.verifiedSourceTypes} · {l('來源代號','Source IDs')}: {candidate.sourceIds.join(', ')} · {l('來源經過日數','Source age in days')}: {candidate.sourceAgeDays ?? '—'}</p><code>{candidate.id}</code></details>
  </article>)}</div>;
  return <div className="renewal-decision">
    <section className="analysis-list renewal-intro"><p className="eyebrow">{l('政策研究 · 證據查核','POLICY RESEARCH · EVIDENCE REVIEW')}</p><h2>{l('老舊建築與都市更新決策分析','Aging Buildings & Urban Renewal Decision Support')}</h2>
      <p className="renewal-lead">{l('如果只能完成 N 項行政資料查核，哪些問題應先調查？','If analysts can complete only N administrative reviews, which questions should be investigated first?')}</p>
      <p>{l('觀察 → 驗證 → 釐清口徑 → 排定查核 → 比較 → 複核 → 匯出','Observe → Validate → Reconcile → Prioritize → Compare → Review → Export')}</p>
      <p className="notice">{l('這是獨立政策研究 POC。老屋不等於危樓；核准更新單元不等於都更完工。排序單位是「行政區 × 查核問題」，不評估建築安全、法律資格或開發可行性。','Independent policy-research POC. Age does not establish danger; designation approval does not establish completed redevelopment. Reviews concern district × documentary question, without safety, eligibility or feasibility assessments.')}</p>
      <p className="muted">{l('分析基準日','Analysis as of')}: {snapshot.analysisAsOf} · {l('快照產製','Snapshot processed')}: {snapshot.generatedAt}<br />{snapshot.methodologyVersion} · {l('設定版本','Configuration')}: {snapshot.configurationVersion}</p>
      <nav className="renewal-actions" aria-label={l('模組內導覽','Module navigation')}><a href="#renewal-planner">{l('前往查核容量情境','Go to review scenarios')}</a><a href="#renewal-briefing">{l('前往摘要匯出','Go to briefing exports')}</a></nav>
      <label>{l('證據領域','Evidence domain')}<select value={domain} onChange={event => setDomain(event.target.value)}><option value="administrative">{l('行政證據查核','Administrative evidence review')}</option><option value="aging">{l('建物屋齡政策脈絡','Building-age policy context')}</option></select></label>
    </section>
    {domain === 'aging' && <section className="analysis-list"><h2>{l('建物屋齡統計：僅全市','Building-age context: citywide only')}</h2>
      <p className="notice">{l('官方資料沒有行政區屋齡欄位。行政區老屋暴露量不可取得，不以人口、使照或交易比例分配全市棟數。1976–2006 屋齡欄位不可用；2012 年屋齡合計與總棟數不符。','No district age field exists. District aging exposure is unavailable; city totals are never allocated by population, permits or transactions. Age fields are unavailable for 1976–2006; 2012 age totals disagree with total stock.')}</p>
      {latestAge && <p>{latestAge.year} · {l('總棟數','Total buildings')}: {latestAge.total.toLocaleString()} · {l('未滿30年','Under 30 years')}: {latestAge.under30?.toLocaleString()} · {l('30年以上','30 years and over')}: {latestAge.age30Plus?.toLocaleString()}</p>}
      <div className="table-wrap renewal-history"><table><caption>{l('歷年全市棟數；不可用資料不表示零棟','Annual citywide buildings; unavailable does not mean zero')}</caption><thead><tr><th>{l('年度','Year')}</th><th>{l('總棟數','Total buildings')}</th><th>{l('未滿30年','Under 30')}</th><th>{l('30年以上','30 and over')}</th><th>{l('屋齡合計可比','Age sum comparable')}</th></tr></thead><tbody>{snapshot.buildingAge.rows.map(row => <tr key={row.year}><td>{row.year}</td><td>{row.total.toLocaleString()}</td><td>{row.under30?.toLocaleString() ?? '—'}</td><td>{row.age30Plus?.toLocaleString() ?? '—'}</td><td>{row.ageBreakdownValid ? l('是','Yes') : l('不可用／不一致','Unavailable / inconsistent')}</td></tr>)}</tbody></table></div>
    </section>}
    <section className="analysis-list"><h2>{l('都更行政案件與補充脈絡','Administrative records and supplementary context')}</h2>
      <p>{l('來源 B 核准更新單元','Source B designation records')}: {snapshot.renewalUnits.totalRows} {l('來源列','rows')} · {snapshot.renewalUnits.uniqueDocuments} {l('不同公文識別碼（不等於唯一個案）','distinct document identifiers (not unique case identities)')} · {snapshot.renewalUnits.periodStart} – {snapshot.renewalUnits.periodEnd}</p>
      <p>{l('已記錄核准劃定；目前後續程序未知。沒有信義區來源列，不能當成零案件。','Designation approval is documented; current subsequent stages are unknown. No Xinyi row is published; this is not zero cases.')}</p>
      <details><summary>{l('行政區來源涵蓋與使照脈絡','District source coverage and permit context')}</summary><div className="table-wrap"><table><thead><tr><th>{l('行政區','District')}</th><th>{l('更新單元來源列','Designation rows')}</th><th>{l('目前狀態未知的列','Rows with unknown current status')}</th><th>{l('使照紀錄（不同口徑）','Permit records (different population)')}</th></tr></thead><tbody>{snapshot.permitContext.districts.map(row => {const unit = snapshot.renewalUnits.districts.find(value => value.district === row.district); return <tr key={row.district}><td>{district(row.district)}</td><td>{unit?.recordCount ?? l('未列於此來源','Unrepresented')}</td><td>{unit?.unknownCurrentStatusCount ?? '—'}</td><td>{options.includePermitContext ? row.recordCount : '—'}</td></tr>;})}</tbody></table></div></details>
      <p className="muted">{l('使照是行政核發流量，不是現有建物存量，也不是都更完工數。','Permits measure administrative issuance, not current building stock or completed renewal.')}{options.includePermitContext && ` ${snapshot.permitContext.totalRecords.toLocaleString()} · ${snapshot.permitContext.minYear}–${snapshot.permitContext.maxYear} · ${l('最新發照','Latest issue')}: ${snapshot.permitContext.latestIssueDate} · ${l('缺行政區','Missing district')}: ${snapshot.permitContext.missingDistrictRecords}`}</p>
      <details><summary>{l('年度容積獎勵：全市案件數與平方公尺分列','Annual incentives: separate citywide case and area units')}</summary><p>{l('Region = 台北市，不能加入行政區案件分母；獎勵核准不代表住宅供給。','Region = Taipei City. These records cannot become district denominators; incentives do not establish housing supply.')}</p><div className="table-wrap renewal-history"><table><thead><tr><th>{l('年度','Year')}</th><th>{l('獎勵核准案件數','Approved incentive cases')}</th><th>{l('獎勵面積 m²','Bonus area m²')}</th></tr></thead><tbody>{snapshot.incentives.rows.map(row => <tr key={row.year}><td>{row.year}</td><td>{row.approvedCases}</td><td>{row.bonusFloorAreaSqm.toLocaleString()}</td></tr>)}</tbody></table></div></details>
    </section>
    <section className="analysis-list"><h2>{l('行政程序與定義','Process definitions')}</h2><p>{l('都市更新與危老重建是不同法律程序，申請、核准與母體不可混用。更新單元劃定核准、事業計畫核定、權利變換核定、建照、開工與完工是不同里程碑；本來源無法建立完整串聯。審議會議被提及也不表示核准、駁回或完工。','Urban renewal and accelerated dangerous/old-building reconstruction follow distinct legal pathways. Unit designation, business-plan approval, rights transformation, permits, commencement and completion are separate milestones. This source does not link the full process; meeting mentions do not establish decisions or completion.')}</p><a href="https://gis.uro.taipei/r_progress.aspx" target="_blank" rel="noreferrer">{l('至官方平台人工查證案件進度','Verify progress manually on the official platform')}</a> · <a href="https://uro.gov.taipei/News_Content.aspx?n=5E79553CBBAE8DFB&s=0245995C5DF74EF8&sms=87415A8B9CE81B16" target="_blank" rel="noreferrer">{l('官方程序差異說明','Official pathway explanation')}</a></section>
    <section className="analysis-list"><h2>{l('資料來源與品質','Data governance')}</h2><p>{l('來源更新日、案件日期、擷取日與快照產製日不同。查核優先順序以資源版本更新日是否超過365天判斷更新需求，不以最近擷取日假裝案件已更新。','Source updates, case dates, retrieval and processing are different. Freshness review uses whether the resource version was updated over 365 days before analysis, not a recent download date.')}</p>
      <div className="renewal-sources">{snapshot.sources.map(source => <details key={source.id}><summary>{source.id} · {sourceNames[source.id]?.[language] ?? source.title} — {source.suitability === 'verified_analysis' ? l('可作限定行政分析','Verified administrative analysis') : source.suitability === 'unavailable' ? l('不可取得','Unavailable') : l('僅脈絡／受限','Context / limited')}</summary><p><a href={source.url} target="_blank" rel="noreferrer">{l('官方來源','Official source')}</a> · {source.publisher}</p><dl><dt>{l('來源期間','Source period')}</dt><dd>{source.periodStart ?? '—'} – {source.periodEnd ?? '—'}</dd><dt>{l('首次發布／資源更新／目錄更新','First published / resource updated / catalogue updated')}</dt><dd>{source.publishedAt ?? '—'} / {source.resourceUpdatedAt ?? '—'} / {source.metadataUpdatedAt ?? '—'}</dd><dt>{l('擷取／處理','Retrieved / processed')}</dt><dd>{source.retrievedAt} / {source.processedAt}</dd><dt>{l('來源列／有效列／重複','Rows / valid / duplicates')}</dt><dd>{source.rowCount ?? '—'} / {source.validRowCount ?? '—'} / {source.duplicateCount ?? '—'}</dd><dt>{l('無效日期／缺行政區','Invalid dates / missing district')}</dt><dd>{source.invalidDateCount ?? '—'} / {source.missingDistrictCount ?? '—'}</dd><dt>{l('資料集／資源','Dataset / resource')}</dt><dd>{source.datasetId} / {source.resourceId ?? l('無已驗證資源識別碼','No validated resource ID')}</dd><dt>SHA256</dt><dd><code>{source.sha256 ?? l('無原始檔雜湊','No original file hash')}</code></dd></dl></details>)}</div>
    </section>
    <section id="renewal-planner" className="analysis-list renewal-planner"><h2>{l('調查優先順序與資源容量','Research priorities and capacity')}</h2>
      <div className="renewal-controls">
        <label>{l('查核容量','Review capacity')}<select value={capacityMode} onChange={event => {const value=event.target.value;setCapacityMode(value);if(value !== 'custom') update('capacity',value === 'unlimited' ? null : Number(value));else if(validCapacity) update('capacity',Number(capacityInput));}}><option value="5">5</option><option value="10">10</option><option value="unlimited">{l('不限','Unlimited')}</option><option value="custom">{l('自訂正整數','Custom positive integer')}</option></select></label>
        {capacityMode === 'custom' && <label>{l('自訂查核數','Custom review count')}<input type="number" min="1" step="1" value={capacityInput} aria-invalid={!validCapacity} onChange={event => {setCapacityInput(event.target.value);if (/^[1-9]\d*$/.test(event.target.value) && Number.isSafeInteger(Number(event.target.value))) update('capacity',Number(event.target.value));}} /></label>}
        <label>{l('策略','Strategy')}<select value={options.strategy} onChange={event => update('strategy',event.target.value as ScenarioOptions['strategy'])}><option value="gaps">{l('證據缺口優先','Evidence gaps first')}</option><option value="balanced">{l('行政區均衡涵蓋','Balanced district coverage')}</option><option value="reconciliation">{l('來源口徑釐清','Source reconciliation focus')}</option></select></label>
        <label>{l('行政區','District')}<select value={options.district} onChange={event => update('district',event.target.value)}><option value="all">{l('全部行政區','All districts')}</option>{snapshot.permitContext.districts.map(row => <option key={row.district} value={row.district}>{district(row.district)}</option>)}</select></label>
        <label>{l('問題類別','Review category')}<select value={options.category} onChange={event => update('category',event.target.value as ScenarioOptions['category'])}><option value="all">{l('全部類別','All categories')}</option><option value="designation_follow_up">{l('核准更新單元後續查證','Designation follow-up')}</option><option value="source_coverage">{l('來源涵蓋查核','Source coverage')}</option></select></label>
        <label>{l('來源品質要求','Source-quality requirement')}<select value={options.sourceQuality} onChange={event => update('sourceQuality',event.target.value as ScenarioOptions['sourceQuality'])}><option value="strict">{l('嚴格：已驗證來源','Strict: verified sources')}</option><option value="permissive">{l('寬鬆：允許限定來源','Permissive: allow limited sources')}</option></select></label>
        <label>{l('優先層級門檻','Priority threshold')}<select value={options.priorityThreshold} onChange={event => update('priorityThreshold',event.target.value as ScenarioOptions['priorityThreshold'])}><option value="C">{l('A、B、C','A, B, C')}</option><option value="B">{l('A、B','A, B')}</option><option value="A">{l('僅A','A only')}</option></select></label>
      </div><label className="renewal-checkbox"><input type="checkbox" checked={options.includePermitContext} onChange={event => update('includePermitContext',event.target.checked)} />{l('納入使照補充脈絡（不改變查核優先級）','Include supplementary permit context (does not change priority)')}</label>
      <label className="renewal-checkbox"><input type="checkbox" checked={options.sourceIds.includes('B')} onChange={event => update('sourceIds',event.target.checked ? ['B'] : [])} />{l('選用已驗證更新單元來源 B（取消後無合格行政候選）','Use verified designation source B (excluding it leaves no eligible administrative candidates)')}</label>
      {!validCapacity && <p role="alert">{l('請輸入有效正整數。修正前保留上次有效情境，暫停匯出。','Enter a valid positive integer. The last valid scenario remains visible; exports are disabled until corrected.')}</p>}
      <div className="renewal-metrics" aria-live="polite">{[[l('合格問題','Eligible questions'),result.metrics.eligibleQuestions],[l('選入問題','Selected questions'),result.metrics.selectedQuestions],[l('涵蓋行政區','Districts represented'),result.metrics.districtsRepresented],[l('查核面向','Dimensions addressed'),result.metrics.distinctDimensions],[l('來源類型','Source types'),result.metrics.sourceTypes]].map(([label,value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
      <p className="muted">{l('A：至少2個獨立重大查核面向；B：1個；C：僅脈絡。證據不足另列，不能當成低優先級。每個面向最多計算一次，案件列數不等於更新需求。','A: at least two distinct material dimensions; B: one; C: context. Insufficient evidence is separate from low priority. Each dimension counts once; record volume is not renewal demand.')}</p>
      <p className="muted">{l('本快照每個有證據的行政區各有一個獨立問題，且查核條件相同；因此三種策略與嚴格／寬鬆品質結果一致。相同條件以固定行政區識別順序排序，先後不表示不同的更新需求。均衡策略僅分配研究涵蓋，不表示重建成果更公平。','This snapshot has one equally qualified question per represented district, so all three strategies and both quality settings agree. Ties use stable district identifier order; positions do not imply different renewal demand. Balanced selection diversifies research coverage without measuring equitable redevelopment outcomes.')}</p>
      {result.selected.length ? renderCandidates(result.selected) : <p role="status">{l('此條件下沒有可選問題。請檢視排除原因或調整篩選；不以缺失資料產生候選。','No questions are selected under these assumptions. Inspect exclusions or adjust filters; missing evidence does not create synthetic candidates.')}</p>}
      <details><summary>{l('未選入與排除原因','Unselected and excluded reasons')} ({result.excluded.length})</summary>{result.excluded.map(item => <p key={item.candidate.id}>{district(item.candidate.district)} · {item.candidate.question[language]} · {exclusions[item.reason]?.[language] ?? item.reason}</p>)}</details>
    </section>
    <section className="analysis-list"><h2>{l('假設敏感度','Assumption sensitivity')}</h2><p>{l('同一快照、法律定義、行政區單位與候選母體下比較容量與策略。品質要求或選用脈絡不同時標示「不同證據範圍」。變動不代表建物狀況改變。','Capacity and strategy comparisons hold the snapshot, definitions, geography and candidate population constant. Quality or optional-context changes are labelled as a different evidence scope. Changes do not reflect building conditions.')}</p>
      <div className="table-wrap"><table><thead><tr><th>{l('比較','Comparison')}</th><th>{l('選入數','Selected')}</th><th>{l('行政區數','Districts')}</th><th>{l('證據範圍','Evidence scope')}</th></tr></thead><tbody>{[[l('容量5','Capacity 5'),scenarios.five,false],[l('容量10','Capacity 10'),scenarios.ten,false],[l('證據缺口','Evidence gaps'),scenarios.gaps,false],[l('行政區均衡','Balanced coverage'),scenarios.balanced,false],[l('嚴格品質','Strict quality'),scenarios.strict,true],[l('寬鬆品質','Permissive quality'),scenarios.permissive,true],[l('切換使照脈絡','Toggle permit context'),scenarios.optional,true]].map(([label,scenario,changed]) => {const row=scenario as typeof result;return <tr key={String(label)}><td>{String(label)}</td><td>{row.metrics.selectedQuestions}</td><td>{row.metrics.districtsRepresented}</td><td>{changed ? l('不同證據範圍','Different evidence scope') : l('相同','Same')}</td></tr>;})}</tbody></table></div>
      <details><summary>{l('穩定／新增／移除與名次變動明細','Stable / added / removed and rank changes')}</summary><p>{l('容量變動由截取名次改變；均衡策略以行政區輪流選取；品質比較改變來源合格規則。所有候選識別碼與名次變動隨摘要一併匯出。','Capacity changes the rank cutoff; balanced strategy takes district turns; quality comparisons change eligibility. All candidate IDs and rank changes are included in the briefing.')}</p>{comparisons.map((comparison,index) => <article key={index}>
        <h3>{[l('容量5 → 10','Capacity 5 → 10'),l('證據缺口 → 均衡涵蓋','Gaps → balanced'),l('嚴格 → 寬鬆品質','Strict → permissive'),l('切換使照脈絡','Toggle permit context')][index]}</h3>
        <p>{comparison.sameScope ? l('相同證據範圍','Same evidence scope') : l('不同證據範圍','Different evidence scope')} · {l('原因','Reason')}: {index === 0 ? l('查核容量截點改變','Capacity cutoff changes') : index === 1 ? l('行政區輪流取樣；本快照結果相同','District round-robin; identical results for this snapshot') : index === 2 ? l('來源合格規則改變；本來源皆通過','Source eligibility changes; this source meets both') : l('補充脈絡範圍改變，排序不變','Supplementary context changes; priority is unchanged')}</p>
        <p>{l('穩定','Stable')}: {comparison.retained.map(id => district(id.split(':')[0])).join('、') || '—'}</p><p>{l('新增','Added')}: {comparison.added.map(id => district(id.split(':')[0])).join('、') || '—'}</p><p>{l('移除','Removed')}: {comparison.removed.map(id => district(id.split(':')[0])).join('、') || '—'}</p>
        <p>{l('排序變動','Ranking changes')}: {comparison.rankingChanges.length ? comparison.rankingChanges.map(change => `${district(change.id.split(':')[0])}: ${change.before ?? '—'} → ${change.after ?? '—'}`).join(' · ') : l('無','None')}</p>
      </article>)}</details>
      <p className="muted">{l('不可取得：行政區建物屋齡存量、官方跨階段案件串聯、舊版來源快照。僅有本次已驗證版本，不模擬舊版本結果。','Unavailable: district building-age stock, authoritative cross-stage linkage and older audited source snapshots. Historical versions are not simulated.')}</p>
    </section>
    <section id="renewal-briefing" className="analysis-list"><h2>{l('都市更新政策資料查核建議摘要','Urban Renewal Evidence Review Briefing')}</h2><p>{l('向主管機關查證：是否有穩定案件識別碼與後續階段連結？本發布期間與行政區涵蓋是否完整？2012年屋齡統計差異是否有修訂？不同核准案件統計各以何種母體計數？','Ask the responsible authority: are stable case identifiers and later-stage links available? Is period/district coverage complete? Has the 2012 stock discrepancy been revised? What populations underlie each approval count?')}</p><div className="renewal-actions"><button disabled={!validCapacity} onClick={() => exportBriefing('json')}>{l('匯出 JSON 摘要','Export JSON briefing')}</button><button disabled={!validCapacity} onClick={() => exportBriefing('csv')}>{l('匯出 CSV 摘要','Export CSV briefing')}</button></div><p role="status">{exportStatus}</p><p className="muted">{l('摘要包含官方來源、日期、雜湊、方法與設定版本、篩選假設、入選理由、排除及敏感度；不含個人、地址或建物危險評級。','Briefings preserve sources, dates, hashes, methodology, configuration, assumptions, selection reasons, exclusions and sensitivity; they contain no personal details, addresses or property hazard ratings.')}</p></section>
    <section className="analysis-list"><h2>{l('適用範圍與限制','Limitations')}</h2><p>{l('全市屋齡、更新單元核准、容積獎勵、使用執照與審議紀錄有不同統計母體，不能推算都更完成率或老屋需求。缺少公開後續狀態不代表政府沒有業務紀錄或案件停滯。選入查核不表示將核准或完工；涵蓋更多區也不表示保護更多居民。歷史法規名錄不判定目前法律效力。本模組不提供個別工程、法律、投資或補助建議。','Citywide stock, designation approvals, incentives, permits and meetings concern distinct populations; they cannot yield completion rates or renewal demand. Missing public status does not prove missing government operational records or inactivity. A selected review does not imply approval or completion; geographic diversity does not measure residents protected. Historical regulation lists do not determine current legal validity. No individual engineering, legal, investment or subsidy recommendations are provided.')}</p></section>
  </div>;
}

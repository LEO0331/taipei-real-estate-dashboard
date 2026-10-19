import type { ReviewCandidate, ReviewScenario, ScenarioComparison, ScenarioOptions, UrbanRenewalSnapshot } from '../types/urbanRenewalDecision';
import { buildReviewCandidates, compareCandidates, TIER_ORDER } from './urbanRenewalDecision';

export const DEFAULT_SCENARIO_OPTIONS: ScenarioOptions = { capacity: 5, strategy: 'gaps', district: 'all', category: 'all', sourceQuality: 'strict', priorityThreshold: 'C', includePermitContext: true, sourceIds: ['B'] };
export function runReviewScenario(snapshot: UrbanRenewalSnapshot, input: Partial<ScenarioOptions> = {}): ReviewScenario {
  const options = { ...DEFAULT_SCENARIO_OPTIONS, ...input, sourceIds: [...(input.sourceIds ?? DEFAULT_SCENARIO_OPTIONS.sourceIds)].sort() };
  if (options.capacity !== null && (!Number.isSafeInteger(options.capacity) || options.capacity < 1)) throw new Error('Review capacity must be a positive safe integer or null.');
  const population = buildReviewCandidates(snapshot);
  const excluded: ReviewScenario['excluded'] = [];
  const eligible = population.filter(candidate => {
    const reason = exclusionReason(candidate, options);
    if (reason) excluded.push({ candidate, reason });
    return !reason;
  }).sort(compareCandidates);
  const ranked = options.strategy === 'balanced' ? balanced(eligible) : eligible;
  const selected = ranked.slice(0, options.capacity ?? ranked.length);
  for (const candidate of ranked.slice(selected.length)) excluded.push({ candidate, reason: 'capacity_limit' });
  return { snapshotId: snapshot.snapshotId, options, populationIds: population.map(item => item.id).sort(),
    scopeKey: JSON.stringify([snapshot.snapshotId, snapshot.methodologyVersion, snapshot.configurationVersion, 'district-question', population.map(item => item.id).sort(), options.district, options.category, options.sourceQuality, options.priorityThreshold, options.sourceIds, options.includePermitContext]),
    ranked, selected, excluded,
    metrics: { eligibleQuestions: eligible.length, selectedQuestions: selected.length,
      districtsRepresented: new Set(selected.map(item => item.district)).size,
      distinctDimensions: new Set(selected.flatMap(item => item.dimensions)).size,
      sourceTypes: new Set(selected.flatMap(item => item.sourceIds)).size },
    emptyReason: ranked.length ? null : options.strategy === 'reconciliation' ? 'No eligible concrete administrative-stage or identity reconciliation questions.' : 'No review questions meet the selected evidence and scope requirements.' };
}
function exclusionReason(candidate: ReviewCandidate, options: ScenarioOptions): string | null {
  if (candidate.tier === 'insufficient') return 'insufficient_evidence';
  if (options.district !== 'all' && candidate.district !== options.district) return 'district_filter';
  if (options.category !== 'all' && candidate.category !== options.category) return 'category_filter';
  if (!candidate.sourceIds.every(id => options.sourceIds.includes(id))) return 'source_excluded';
  if (options.sourceQuality === 'strict' && candidate.verifiedSourceTypes < 1) return 'strict_source_quality';
  if (TIER_ORDER[candidate.tier] > TIER_ORDER[options.priorityThreshold]) return 'priority_threshold';
  if (options.strategy === 'reconciliation' && !candidate.reconciliation) return 'no_concrete_reconciliation_question';
  return null;
}
/** District queues are ordered by their highest-ranked question, then served round-robin. */
export function balanced(candidates: ReviewCandidate[]): ReviewCandidate[] {
  const groups = new Map<string, ReviewCandidate[]>();
  for (const item of [...candidates].sort(compareCandidates)) groups.set(item.district, [...(groups.get(item.district) ?? []), item]);
  const result: ReviewCandidate[] = [];
  for (let index = 0; result.length < candidates.length; index++) for (const queue of groups.values()) if (queue[index]) result.push(queue[index]);
  return result;
}
export function compareReviewScenarios(a: ReviewScenario, b: ReviewScenario): ScenarioComparison {
  const left = new Set(a.selected.map(item => item.id));
  const right = new Set(b.selected.map(item => item.id));
  const sameScope = a.scopeKey === b.scopeKey;
  const changeReason = !sameScope ? 'evidence_scope_changed' : a.options.strategy !== b.options.strategy ? 'strategy_order' : 'capacity_cutoff';
  const added = [...right].filter(id => !left.has(id));
  const removed = [...left].filter(id => !right.has(id));
  const ids = new Set([...a.ranked.map(item => item.id), ...b.ranked.map(item => item.id)]);
  const rankingChanges = [...ids].flatMap(id => {
    const leftIndex = a.ranked.findIndex(item => item.id === id);
    const rightIndex = b.ranked.findIndex(item => item.id === id);
    return leftIndex === rightIndex ? [] : [{ id, before: leftIndex < 0 ? null : leftIndex + 1, after: rightIndex < 0 ? null : rightIndex + 1, reason: sameScope ? 'strategy_order' : 'evidence_scope_changed' }];
  });
  return { sameScope, explanation: sameScope ? 'Fixed source snapshot and candidate population; selection changes reflect strategy or capacity.' : 'Scope changed: source snapshot, eligibility assumptions, district, category or candidate population differs; this is not a fixed-population performance comparison.',
    added, removed, retained: [...left].filter(id => right.has(id)),
    selectedDelta: b.metrics.selectedQuestions - a.metrics.selectedQuestions, districtDelta: b.metrics.districtsRepresented - a.metrics.districtsRepresented,
    rankingChanges,
    selectionChanges: [...added.map(id => ({ id, change: 'added' as const, reason: changeReason })), ...removed.map(id => ({ id, change: 'removed' as const, reason: changeReason }))],
    unavailableEvidence: ['District building-age stock is unavailable.', 'Only one audited source version is available; historical source-version sensitivity is unavailable.', 'Authoritative current case status and cross-stage case linkage are unavailable.'] };
}
export function buildReviewBriefing(snapshot: UrbanRenewalSnapshot, scenario: ReviewScenario, comparisons: ScenarioComparison[] = []) {
  if (snapshot.snapshotId !== scenario.snapshotId) throw new Error('Briefing source snapshot does not match scenario.');
  return {
    title: { zh: '都市更新政策資料查核建議摘要', en: 'Urban Renewal Evidence Review Briefing' },
    policyQuestion: 'Which documented district-level evidence questions should limited administrative research capacity review first?',
    schemaVersion: snapshot.schemaVersion, methodologyVersion: snapshot.methodologyVersion, configurationVersion: snapshot.configurationVersion,
    snapshotId: snapshot.snapshotId, generatedAt: snapshot.generatedAt, analysisAsOf: snapshot.analysisAsOf,
    statisticalUnit: 'district × administrative review question', analysisPopulation: scenario.populationIds,
    sources: snapshot.sources, buildingAge: snapshot.buildingAge, districtAdministrativeCoverage: snapshot.renewalUnits,
    permitContext: scenario.options.includePermitContext ? snapshot.permitContext : null,
    processDefinitions: ['Renewal-unit designation approval does not establish business-plan approval, rights-transformation approval, permit issuance, commencement or completion.', 'Urban renewal and dangerous/old-building reconstruction are separate legal pathways.', 'Use-permit records are administrative flow, not existing building stock.'],
    scenario, comparisons,
    unresolvedDiscrepancies: ['Citywide incentive statistics and district designation records have different stages, periods and units; no case-count denominator or linked status is established.'],
    authorityQuestions: ['Is a newer designation resource available?', 'Can an official stable identifier link designation to current later-stage status?', 'Can verified district building-age stock and complete district/period coverage be published?'],
    limitations: [...snapshot.limitations, 'This documentary research POC does not assess building safety, legal eligibility, feasibility, investment value or government operational inactivity.'],
  };
}
export type ReviewBriefing = ReturnType<typeof buildReviewBriefing>;
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export function briefingToCsv(briefing: ReviewBriefing): string {
  const header = ['record_type', 'snapshot_id', 'methodology_version', 'configuration_version', 'analysis_as_of', 'capacity', 'strategy', 'district', 'question_id', 'tier', 'dimensions', 'source_ids', 'source_record_count', 'unique_documents_not_cases', 'question', 'selection_reasons', 'limitations', 'briefing_metadata_json'];
  const common = [briefing.snapshotId, briefing.methodologyVersion, briefing.configurationVersion, briefing.analysisAsOf, briefing.scenario.options.capacity ?? 'unlimited', briefing.scenario.options.strategy];
  const rows = briefing.scenario.selected.map(item => ['selected_question', ...common, item.district, item.id, item.tier, item.dimensions.join(';'), item.sourceIds.join(';'), item.recordCount, item.uniqueDocuments, `${item.question.zh} / ${item.question.en}`, item.reasons.map(reason => `${reason.zh} / ${reason.en}`).join(';'), briefing.limitations.join(';'), '']);
  // A metadata row preserves the complete reproducible briefing even when no question is selected.
  const metadata = ['briefing_metadata', ...common, '', '', '', '', '', '', '', '', '', briefing.limitations.join(';'), JSON.stringify(briefing)];
  return '\uFEFF' + [header, metadata, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

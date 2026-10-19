import { DISTRICTS } from '../models';
import type { ReviewCandidate, ReviewDimension, ReviewTier, UrbanRenewalSnapshot } from '../types/urbanRenewalDecision';

export const TIER_ORDER: Record<ReviewTier, number> = { A: 0, B: 1, C: 2, insufficient: 3 };
export function assignReviewTier(essentialEvidenceValid: boolean, dimensions: readonly ReviewDimension[], verifiedSourceTypes: number): ReviewTier {
  if (!essentialEvidenceValid) return 'insufficient';
  const count = new Set(dimensions).size;
  return count >= 2 && verifiedSourceTypes > 0 ? 'A' : count > 0 ? 'B' : 'C';
}
function dayAge(asOf: string, date: string | null): number | null {
  if (!date) return null;
  const delta = Date.parse(asOf.slice(0, 10)) - Date.parse(date.slice(0, 10));
  return Number.isFinite(delta) && delta >= 0 ? Math.floor(delta / 86400000) : null;
}
export function compareCandidates(a: ReviewCandidate, b: ReviewCandidate): number {
  return TIER_ORDER[a.tier] - TIER_ORDER[b.tier]
    || new Set(b.dimensions).size - new Set(a.dimensions).size
    || b.verifiedSourceTypes - a.verifiedSourceTypes
    || b.unresolvedStatusQuestions - a.unresolvedStatusQuestions
    || (b.sourceAgeDays ?? -1) - (a.sourceAgeDays ?? -1)
    || districtOrder(a.district) - districtOrder(b.district)
    || a.district.localeCompare(b.district, 'en') || a.id.localeCompare(b.id, 'en');
}
function districtOrder(district: string): number {
  const index = (DISTRICTS as readonly string[]).indexOf(district);
  return index < 0 ? DISTRICTS.length : index;
}
/** One question per documented district. Rows/documents are evidence volume, never case totals or rank weights. */
export function buildReviewCandidates(snapshot: UrbanRenewalSnapshot): ReviewCandidate[] {
  const source = snapshot.sources.find(item => item.id === snapshot.renewalUnits.sourceId);
  // Resource version update is used, never catalogue metadata update or last case action date.
  const age = dayAge(snapshot.analysisAsOf, source?.resourceUpdatedAt ?? null);
  const validPeriod = !!source?.periodStart && !!source.periodEnd
    && Number.isFinite(Date.parse(source.periodStart)) && Number.isFinite(Date.parse(source.periodEnd))
    && Date.parse(source.periodStart) <= Date.parse(source.periodEnd);
  const essentialSource = !!source?.datasetId && !!source.resourceId && /^[a-f0-9]{64}$/i.test(source.sha256 ?? '')
    && source.geography === 'district' && validPeriod
    && snapshot.renewalUnits.stage === 'renewal_unit_designation_approved'
    && !['unavailable', 'excluded', 'context_only'].includes(source.suitability);
  const verified = source?.suitability === 'verified_analysis' && essentialSource ? 1 : 0;
  return snapshot.renewalUnits.districts.map(row => {
    const dimensions: ReviewDimension[] = [];
    const reasons: ReviewCandidate['reasons'] = [];
    if (row.unknownCurrentStatusCount > 0) {
      dimensions.push('status_traceability');
      reasons.push({ zh: '僅確認更新單元劃定核准；後續事業計畫、權利變換及完工階段未知，需官方連結查核。', en: 'Only renewal-unit designation approval is established; verify official linkage to later business-plan, rights-transformation and completion stages, which remain unknown.' });
    }
    if (age === null || age > 365) {
      dimensions.push('temporal_freshness');
      reasons.push({ zh: '資源版本更新日期未知或距分析日超過365日，應確認是否有更新版本。', en: 'Resource version update is unknown or more than 365 days before analysis; check for a newer source version.' });
    }
    if (row.identityIssueCount > 0) {
      dimensions.push('source_integrity');
      reasons.push({ zh: '文件識別有待釐清；重複列不可當成不同案件。', en: 'Document identity requires clarification; repeated rows must not become distinct cases.' });
    }
    const essentialEvidenceValid = essentialSource && (DISTRICTS as readonly string[]).includes(row.district)
      && row.recordCount > 0 && row.uniqueDocuments > 0 && Number.isFinite(Date.parse(row.latestActionDate))
      && Number.isFinite(Date.parse(row.earliestActionDate)) && row.earliestActionDate <= row.latestActionDate;
    return {
      id: `${row.district}:designation-follow-up`, district: row.district, category: 'designation_follow_up' as const,
      question: { zh: '核准更新單元的後續行政階段與公開資料版本是否可確認？', en: 'Can later administrative stages and the public source version for approved renewal units be verified?' },
      tier: assignReviewTier(essentialEvidenceValid, dimensions, verified), dimensions: [...new Set(dimensions)],
      sourceIds: ['B'], verifiedSourceTypes: verified,
      // One explicit status question, irrespective of the number of source records.
      unresolvedStatusQuestions: row.unknownCurrentStatusCount > 0 ? 1 : 0,
      sourceAgeDays: age, recordCount: row.recordCount, uniqueDocuments: row.uniqueDocuments,
      reasons, reconciliation: row.unknownCurrentStatusCount > 0 || row.identityIssueCount > 0, essentialEvidenceValid,
    };
  }).sort(compareCandidates);
}

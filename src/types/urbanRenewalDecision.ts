export type SourceHealth = {
  id: string; title: string; datasetId: string; resourceId: string | null; publisher: string; url: string;
  resourceUrl: string | null; publishedAt: string | null; resourceUpdatedAt: string | null; metadataUpdatedAt: string | null;
  retrievedAt: string; processedAt: string; sha256: string | null; schema: string[];
  rowCount: number | null; validRowCount: number | null; duplicateCount: number | null;
  invalidDateCount: number | null; missingDistrictCount: number | null;
  geography: 'citywide' | 'district' | 'document' | 'reference'; periodStart: string | null; periodEnd: string | null;
  unit: string; suitability: 'verified_analysis' | 'context_only' | 'limited' | 'unavailable' | 'excluded'; limitations: string[];
};
export type UrbanRenewalSnapshot = {
  schemaVersion: '1.0.0'; methodologyVersion: 'urban-renewal-evidence-review-v1'; configurationVersion: '1.0.0';
  snapshotId: string; generatedAt: string; analysisAsOf: string; sources: SourceHealth[];
  buildingAge: { geography: 'citywide'; districtAgeAvailable: false; unit: 'buildings'; rows: { year: number; total: number; under30: number | null; age30Plus: number | null; ageBreakdownValid: boolean; issue: string | null }[] };
  renewalUnits: { sourceId: 'B'; stage: 'renewal_unit_designation_approved'; currentStatus: 'unknown'; totalRows: number; uniqueDocuments: number; periodStart: string; periodEnd: string; districts: { district: string; recordCount: number; uniqueDocuments: number; earliestActionDate: string; latestActionDate: string; unknownCurrentStatusCount: number; identityIssueCount: number }[]; unrepresentedDistricts: string[] };
  incentives: { geography: 'citywide'; unitCases: 'approved_incentive_cases'; unitArea: 'square_metres'; rows: { year: number; approvedCases: number; bonusFloorAreaSqm: number }[] };
  permitContext: { totalRecords: number; minYear: number; maxYear: number; latestIssueDate: string; missingDistrictRecords: number; districts: { district: string; recordCount: number }[] };
  limitations: string[];
};
export type ReviewDimension = 'source_integrity' | 'status_traceability' | 'temporal_freshness' | 'scope_comparability' | 'geographic_completeness';
export type ReviewTier = 'A' | 'B' | 'C' | 'insufficient';
export type ReviewCategory = 'designation_follow_up' | 'source_coverage';
export type BilingualText = { zh: string; en: string };
export type ReviewCandidate = {
  id: string; district: string; category: ReviewCategory; tier: ReviewTier; question: BilingualText;
  dimensions: ReviewDimension[]; sourceIds: string[]; verifiedSourceTypes: number;
  unresolvedStatusQuestions: number; sourceAgeDays: number | null; recordCount: number | null; uniqueDocuments: number | null;
  reasons: BilingualText[]; reconciliation: boolean; essentialEvidenceValid: boolean;
};
export type ScenarioOptions = {
  capacity: number | null; strategy: 'gaps' | 'balanced' | 'reconciliation'; district: string;
  category: 'all' | ReviewCategory; sourceQuality: 'strict' | 'permissive'; priorityThreshold: 'A' | 'B' | 'C';
  includePermitContext: boolean; sourceIds: string[];
};
export type ReviewScenario = {
  snapshotId: string; options: ScenarioOptions; populationIds: string[]; scopeKey: string;
  ranked: ReviewCandidate[]; selected: ReviewCandidate[]; excluded: { candidate: ReviewCandidate; reason: string }[];
  metrics: { eligibleQuestions: number; selectedQuestions: number; districtsRepresented: number; distinctDimensions: number; sourceTypes: number };
  emptyReason: string | null;
};
export type ScenarioComparison = { sameScope: boolean; explanation: string; added: string[]; removed: string[]; retained: string[]; selectedDelta: number; districtDelta: number; rankingChanges: { id: string; before: number | null; after: number | null; reason: string }[]; selectionChanges: { id: string; change: 'added' | 'removed'; reason: string }[]; unavailableEvidence: string[] };

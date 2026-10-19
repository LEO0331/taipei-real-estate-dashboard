import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { DISTRICTS } from '../src/models.ts';
import type { SourceHealth, UrbanRenewalSnapshot } from '../src/types/urbanRenewalDecision.ts';
import { assignReviewTier, buildReviewCandidates, compareCandidates } from '../src/utils/urbanRenewalDecision.ts';
import { balanced, briefingToCsv, buildReviewBriefing, compareReviewScenarios, csvCell, runReviewScenario } from '../src/utils/urbanRenewalScenario.ts';

function fixture(): UrbanRenewalSnapshot {
  const source: SourceHealth = { id: 'B', title: 'Official designation source', datasetId: 'official-dataset', resourceId: 'official-resource', publisher: 'Taipei', url: 'https://data.taipei/', resourceUrl: null, publishedAt: null, resourceUpdatedAt: '2024-06-13T12:19:19+08:00', metadataUpdatedAt: '2026-09-08', retrievedAt: '2026-10-19', processedAt: '2026-10-19', sha256: 'a'.repeat(64), schema: ['district'], rowCount: 75, validRowCount: 75, duplicateCount: 0, invalidDateCount: 0, missingDistrictCount: 0, geography: 'district', periodStart: '2023-02-01', periodEnd: '2024-06-30', unit: 'designation records', suitability: 'verified_analysis', limitations: [] };
  return { schemaVersion: '1.0.0', methodologyVersion: 'urban-renewal-evidence-review-v1', configurationVersion: '1.0.0', snapshotId: 'fixture-v1', generatedAt: '2026-10-19T00:00:00Z', analysisAsOf: '2026-10-19', sources: [source], buildingAge: { geography: 'citywide', districtAgeAvailable: false, unit: 'buildings', rows: [{ year: 2025, total: 100, under30: 20, age30Plus: 80, ageBreakdownValid: true, issue: null }] }, renewalUnits: { sourceId: 'B', stage: 'renewal_unit_designation_approved', currentStatus: 'unknown', totalRows: 75, uniqueDocuments: 75, periodStart: '2023-02', periodEnd: '2024-06', districts: DISTRICTS.filter(item => item !== '信義區').map((district, index) => ({ district, recordCount: index + 1, uniqueDocuments: index + 1, earliestActionDate: '2023-02-01', latestActionDate: '2024-06-01', unknownCurrentStatusCount: index + 1, identityIssueCount: 0 })), unrepresentedDistricts: ['信義區'] }, incentives: { geography: 'citywide', unitCases: 'approved_incentive_cases', unitArea: 'square_metres', rows: [] }, permitContext: { totalRecords: 8855, minYear: 2001, maxYear: 2026, latestIssueDate: '2026-05-29', missingDistrictRecords: 25, districts: [] }, limitations: ['Citywide age data cannot establish district aging pressure.'] };
}
test('tiers count independent dimensions once and keep insufficient evidence separate', () => {
  assert.equal(assignReviewTier(true, ['status_traceability', 'status_traceability'], 1), 'B');
  assert.equal(assignReviewTier(true, ['status_traceability', 'temporal_freshness'], 1), 'A');
  assert.equal(assignReviewTier(true, [], 1), 'C');
  assert.equal(assignReviewTier(false, ['status_traceability', 'temporal_freshness'], 1), 'insufficient');
});
test('district questions remain independent of raw record volume and citywide building age', () => {
  const snapshot = fixture();
  const candidates = buildReviewCandidates(snapshot);
  assert.equal(candidates.length, 11);
  assert.ok(candidates.every(item => item.tier === 'A' && item.unresolvedStatusQuestions === 1));
  assert.ok(!candidates.some(item => item.district === '信義區'));
  assert.equal(candidates[0].district, '中正區');
  const changed = structuredClone(snapshot);
  changed.buildingAge.rows[0].age30Plus = 999999;
  changed.renewalUnits.districts[0].recordCount = 999999;
  assert.deepEqual(buildReviewCandidates(changed).map(item => item.id), candidates.map(item => item.id));
  assert.deepEqual(candidates[0].dimensions, ['status_traceability', 'temporal_freshness']);
  assert.equal(candidates[0].sourceAgeDays, 858);
});
test('deterministic immutable snapshot and stable tie-breaking', () => {
  const snapshot = fixture();
  const before = JSON.stringify(snapshot);
  assert.deepEqual(runReviewScenario(snapshot), runReviewScenario(snapshot));
  const reversed = structuredClone(snapshot);
  reversed.renewalUnits.districts.reverse();
  assert.deepEqual(runReviewScenario(reversed).selected, runReviewScenario(snapshot).selected);
  assert.equal(JSON.stringify(snapshot), before);
  assert.equal(compareCandidates(buildReviewCandidates(snapshot)[0], buildReviewCandidates(snapshot)[0]), 0);
});
test('freshness follows resource version update, separately from publication, metadata and action dates', () => {
  const snapshot = fixture();
  snapshot.sources[0].publishedAt = '2026-10-18';
  snapshot.sources[0].metadataUpdatedAt = '2026-10-18';
  snapshot.renewalUnits.districts[0].latestActionDate = '2026-10-18';
  assert.equal(buildReviewCandidates(snapshot)[0].sourceAgeDays, 858);
  snapshot.sources[0].resourceUpdatedAt = '2026-10-18';
  assert.ok(buildReviewCandidates(snapshot).every(item => item.sourceAgeDays === 1 && item.tier === 'B'));
  snapshot.sources[0].resourceUpdatedAt = null;
  assert.ok(buildReviewCandidates(snapshot).every(item => item.sourceAgeDays === null));
});
test('capacity 5/10/unlimited and invalid capacities', () => {
  const snapshot = fixture();
  const five = runReviewScenario(snapshot, { capacity: 5 });
  const ten = runReviewScenario(snapshot, { capacity: 10 });
  assert.equal(five.metrics.selectedQuestions, 5);
  assert.equal(ten.metrics.selectedQuestions, 10);
  assert.equal(runReviewScenario(snapshot, { capacity: null }).selected.length, 11);
  for (const capacity of [0, -1, 1.5, Infinity, NaN]) assert.throws(() => runReviewScenario(snapshot, { capacity }));
  assert.equal(five.excluded.filter(item => item.reason === 'capacity_limit').length, 6);
  const comparison = compareReviewScenarios(five, ten);
  assert.equal(comparison.sameScope, true);
  assert.equal(comparison.added.length, 5);
  assert.equal(comparison.retained.length, 5);
  assert.ok(comparison.selectionChanges.every(item => item.reason === 'capacity_cutoff'));
});
test('source quality, threshold, source exclusion, district and category filters', () => {
  const snapshot = fixture();
  assert.equal(runReviewScenario(snapshot, { district: '中正區' }).selected.length, 1);
  assert.equal(runReviewScenario(snapshot, { category: 'source_coverage' }).selected.length, 0);
  assert.equal(runReviewScenario(snapshot, { sourceIds: [] }).selected.length, 0);
  snapshot.sources[0].suitability = 'limited';
  assert.equal(runReviewScenario(snapshot).selected.length, 0);
  assert.equal(runReviewScenario(snapshot, { sourceQuality: 'permissive' }).selected.length, 5);
  assert.equal(runReviewScenario(snapshot, { sourceQuality: 'permissive', priorityThreshold: 'A' }).selected.length, 0);
  snapshot.sources[0].sha256 = null;
  assert.ok(buildReviewCandidates(snapshot).every(item => item.tier === 'insufficient'));
  assert.equal(runReviewScenario(snapshot, { sourceQuality: 'permissive' }).selected.length, 0);
  const invalidPeriod = fixture();
  invalidPeriod.sources[0].periodStart = 'invalid';
  assert.ok(buildReviewCandidates(invalidPeriod).every(item => item.tier === 'insufficient'));
});
test('balanced round robin retains within-district priority; real one-question population agrees with gaps', () => {
  const candidates = buildReviewCandidates(fixture());
  const second = { ...candidates[0], id: candidates[0].id + ':second' };
  const result = balanced([candidates[0], second, candidates[1]]);
  assert.deepEqual(result.map(item => item.district), [candidates[0].district, candidates[1].district, candidates[0].district]);
  assert.deepEqual(runReviewScenario(fixture(), { strategy: 'balanced' }).selected, runReviewScenario(fixture()).selected);
});
test('reconciliation uses concrete missing later-stage linkage without fabricated conflict', () => {
  const snapshot = fixture();
  assert.equal(runReviewScenario(snapshot, { strategy: 'reconciliation' }).selected.length, 5);
  snapshot.renewalUnits.districts.forEach(item => item.unknownCurrentStatusCount = 0);
  const scenario = runReviewScenario(snapshot, { strategy: 'reconciliation' });
  assert.equal(scenario.selected.length, 0);
  assert.match(scenario.emptyReason!, /No eligible concrete/);
});
test('quality and population changes are different scope; optional permit context cannot alter ranking', () => {
  const snapshot = fixture();
  const first = runReviewScenario(snapshot);
  assert.equal(compareReviewScenarios(first, runReviewScenario(snapshot, { sourceQuality: 'permissive' })).sameScope, false);
  assert.equal(compareReviewScenarios(first, runReviewScenario(snapshot, { district: '中正區' })).sameScope, false);
  const noPermits = runReviewScenario(snapshot, { includePermitContext: false });
  assert.deepEqual(noPermits.selected, first.selected);
  assert.equal(compareReviewScenarios(first, noPermits).sameScope, false);
  assert.equal(buildReviewBriefing(snapshot, noPermits).permitContext, null);
});
test('briefing preserves provenance, safe aggregate units and protects CSV formulas', () => {
  const snapshot = fixture();
  const briefing = buildReviewBriefing(snapshot, runReviewScenario(snapshot));
  assert.equal(briefing.methodologyVersion, 'urban-renewal-evidence-review-v1');
  assert.match(briefing.processDefinitions.join(' '), /does not establish.*completion/);
  assert.match(briefing.processDefinitions.join(' '), /separate legal pathways/);
  assert.match(briefing.processDefinitions.join(' '), /not existing building stock/);
  for (const value of ['=SUM(A1:A2)', '+1', '-1', '@lookup', '\t=1', '\r\n+1']) assert.ok(csvCell(value).startsWith('"\''));
  assert.equal(csvCell('a"b'), '"a""b"');
  assert.match(briefingToCsv(briefing), /unique_documents_not_cases/);
  assert.match(briefingToCsv(buildReviewBriefing(snapshot, runReviewScenario(snapshot, { sourceIds: [] }))), /briefing_metadata/);
  assert.ok(!/ownerName|latitude|longitude|hazardScore/.test(JSON.stringify(briefing)));
  assert.throws(() => buildReviewBriefing({ ...snapshot, snapshotId: 'different' }, runReviewScenario(snapshot)));
});
test('actual audited source population produces 11 questions and reproducible 5/10 scenarios', () => {
  const snapshot = JSON.parse(readFileSync(new URL('../public/data/urban-renewal-decision/snapshot.json', import.meta.url), 'utf8')) as UrbanRenewalSnapshot;
  const candidates = buildReviewCandidates(snapshot);
  assert.equal(snapshot.renewalUnits.totalRows, 75);
  assert.equal(candidates.length, 11);
  assert.equal(snapshot.buildingAge.districtAgeAvailable, false);
  assert.equal(snapshot.permitContext.totalRecords, 8855);
  assert.ok(candidates.every(item => item.tier === 'A'));
  assert.equal(runReviewScenario(snapshot, { capacity: 5 }).selected.length, 5);
  assert.equal(runReviewScenario(snapshot, { capacity: 10 }).selected.length, 10);
  assert.deepEqual(runReviewScenario(snapshot, { strategy: 'balanced' }).selected, runReviewScenario(snapshot).selected);
});

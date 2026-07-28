import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyMilestone, extractContractCodes, parseMilestoneDate } from './convertMetroEngineeringMilestones.ts';

test('extracts conservative Metro contract codes without matching unrelated text', () => {
  assert.deepEqual(extractContractCodes('萬大線CQ860及CF690A工程，C860不是合約碼'), ['CQ860', 'CF690A']);
});
test('parses clear month/day and month-only milestone dates', () => {
  assert.deepEqual(parseMilestoneDate(2025, '2月1日'), { month: 2, day: 1, date: '2025-02-01', datePrecision: 'day' });
  assert.deepEqual(parseMilestoneDate(2025, '12月'), { month: 12, day: null, date: '2025-12', datePrecision: 'month' });
});
test('classifies source terms transparently', () => {
  const result = classifyMilestone('工程施工查核CQ860區段標');
  assert.equal(result.category, 'inspection_audit');
  assert.ok(result.matchedTerms.includes('查核'));
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { filterPriceIndexRecords, filterRecords, filterRentIndexRecords, sortDistricts } from './dashboard';

const records = [
  { district: '大安區', recordType: 'sale', buildingType: 'apartment', locationText: '和平東路', totalPriceNtd: 2000 },
  { district: '中山區', recordType: 'rent', buildingType: 'elevator_building', locationText: '南京東路', remarks: '續租', totalPriceNtd: 20 },
];

test('filters records across district, type, and free-text search', () => {
  assert.equal(filterRecords(records, { district: '中山區', recordType: 'rent', search: '續租' }).length, 1);
  assert.equal(filterRecords(records, { search: '大樓' }).length, 1);
});

test('sorts district comparison rows numerically with missing values last', () => {
  const rows = [
    { district: '大安區', transactionsPer1000Residents: 3 },
    { district: '中山區', transactionsPer1000Residents: 7 },
    { district: '文山區' },
  ];
  assert.deepEqual(sortDistricts(rows, 'transactionsPer1000Residents', 'desc').map((row) => row.district), [
    '中山區',
    '大安區',
    '文山區',
  ]);
});

test('filters residential rent index records by category, period, and search', () => {
  const rows = [
    { rentIndexCategory: 'citywide', rentIndexCategoryRaw: '全市', periodRaw: '114Q4', quarterKey: '2025-Q4', year: 2025, quarter: 4, quarterlyChangeRatePercent: 1.42 },
    { rentIndexCategory: 'apartment', rentIndexCategoryRaw: '公寓', periodRaw: '114Q3', quarterKey: '2025-Q3', year: 2025, quarter: 3 },
  ];
  assert.equal(filterRentIndexRecords(rows, { category: 'citywide', year: '2025', quarter: '4', search: '全市' }).length, 1);
  assert.equal(filterRentIndexRecords(rows, { hasQuarterlyChangeRate: true }).length, 1);
  assert.equal(filterRentIndexRecords(rows, { search: '2025-Q3' }).length, 1);
});

test('filters residential price monthly index records by category, period, and search', () => {
  const rows = [
    { category: 'citywide', categoryRaw: '全市', periodRaw: '115/02', period: '2026-02', year: 2026, month: 2, monthlyIndex: 126.81, monthlyIndexChangePercent: 0.67, standardUnitPriceTenThousandNtdPerPing: 63.98 },
    { category: 'citywide_apartment', categoryRaw: '全市公寓', periodRaw: '114/12', period: '2025-12', year: 2025, month: 12, monthlyIndex: 111 },
  ];
  assert.equal(filterPriceIndexRecords(rows, { category: 'citywide', year: '2026', month: '2', search: '115/02' }).length, 1);
  assert.equal(filterPriceIndexRecords(rows, { minMonthlyIndex: 120 }).length, 1);
  assert.equal(filterPriceIndexRecords(rows, { search: '2025' }).length, 1);
});

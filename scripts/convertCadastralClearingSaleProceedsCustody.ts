import { createHash } from 'node:crypto';
import { getColumn, listCsvFiles, parseTaiwanDate, readCsv, writeJson } from './data.ts';

const sourceDirectory = 'data/raw/cadastral-clearing-sale-proceeds-custody';
const outputDirectory = 'public/data/cadastral-clearing-sale-proceeds-custody';
const headers = {
  sequence: '編號',
  date: '存支日期',
  reference: '存支編號',
  sale: '標售金額',
  tax: '應納稅賦',
  administrativeFee: '行政處理費',
  reward: '地籍清理獎金',
  deposited: '存入金額',
  claimable: '應領金額',
  recipient: '應領取人姓名',
};

const clean = (value: string | undefined) => (value ?? '').replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
const amount = (value: string) => {
  const normalized = value.replace(/[，,\s　]/g, '').replace(/^(?:NT\$|NTD|新臺幣|元|\$)/i, '');
  if (!normalized || /^(?:-|--|—)$/.test(normalized) || !/^-?\d+(?:\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const validDate = (raw: string) => {
  const parsed = parseTaiwanDate(raw);
  if (!parsed.date || !parsed.year || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) return { date: null, year: null, rocYear: null };
  const [year, month, day] = parsed.date.split('-').map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return { date: null, year: null, rocYear: null };
  return { date: parsed.date, year, rocYear: year - 1911 };
};

function maskRecipientName(raw: string) {
  const value = clean(raw);
  if (!value) return '';
  if (value.length === 1) return '＊';
  if (value.length === 2) return `${value[0]}＊`;
  return `${value[0]}${'＊'.repeat(value.length - 2)}${value.at(-1)}`;
}

const isComplexRecipient = (value: string) => /[、，,;；/＆&]|\b(?:及|等)\b/.test(value) || value.length > 12;
const sum = (values: Array<number | null>) => values.reduce<number | null>((total, value) => total === null || value === null ? null : total + value, 0);

export async function convertCadastralClearingSaleProceedsCustody() {
  const sourceFile = (await listCsvFiles(sourceDirectory)).at(-1);
  const rows = sourceFile ? await readCsv(sourceFile) : [];
  const referenceCounts = new Map<string, number>();
  const rowHashes = new Map<string, number>();
  const records = rows.map((raw, index) => {
    const sourceSequenceNumber = clean(getColumn(raw, [headers.sequence]));
    const transactionDateRaw = clean(getColumn(raw, [headers.date]));
    const transactionReference = clean(getColumn(raw, [headers.reference]));
    const saleAmountRaw = clean(getColumn(raw, [headers.sale]));
    const taxAmountRaw = clean(getColumn(raw, [headers.tax]));
    const administrativeFeeRaw = clean(getColumn(raw, [headers.administrativeFee]));
    const cadastralClearingRewardRaw = clean(getColumn(raw, [headers.reward]));
    const depositedAmountRaw = clean(getColumn(raw, [headers.deposited]));
    const claimableAmountRaw = clean(getColumn(raw, [headers.claimable]));
    const recipientNameRaw = clean(getColumn(raw, [headers.recipient]));
    const date = validDate(transactionDateRaw);
    const saleAmountTwd = amount(saleAmountRaw);
    const taxAmountTwd = amount(taxAmountRaw);
    const administrativeFeeTwd = amount(administrativeFeeRaw);
    const cadastralClearingRewardTwd = amount(cadastralClearingRewardRaw);
    const depositedAmountTwd = amount(depositedAmountRaw);
    const claimableAmountTwd = amount(claimableAmountRaw);
    const deductionsTwd = sum([taxAmountTwd, administrativeFeeTwd, cadastralClearingRewardTwd]);
    const expectedNetAfterDeductionsTwd = saleAmountTwd !== null && deductionsTwd !== null ? saleAmountTwd - deductionsTwd : null;
    const saleToDepositDifferenceTwd = expectedNetAfterDeductionsTwd !== null && depositedAmountTwd !== null ? expectedNetAfterDeductionsTwd - depositedAmountTwd : null;
    const depositToClaimableDifferenceTwd = depositedAmountTwd !== null && claimableAmountTwd !== null ? depositedAmountTwd - claimableAmountTwd : null;
    const completeAmounts = [saleAmountTwd, taxAmountTwd, administrativeFeeTwd, cadastralClearingRewardTwd, depositedAmountTwd, claimableAmountTwd].every((value) => value !== null && value >= 0);
    const reconciliationStatus = !completeAmounts ? 'incomplete' : Math.abs(saleToDepositDifferenceTwd ?? Infinity) <= 1 && Math.abs(depositToClaimableDifferenceTwd ?? Infinity) <= 1 ? 'reconciled' : 'review';
    const publicSourceFields = {
      [headers.sequence]: sourceSequenceNumber,
      [headers.date]: transactionDateRaw,
      [headers.reference]: transactionReference,
      [headers.sale]: saleAmountRaw,
      [headers.tax]: taxAmountRaw,
      [headers.administrativeFee]: administrativeFeeRaw,
      [headers.reward]: cadastralClearingRewardRaw,
      [headers.deposited]: depositedAmountRaw,
      [headers.claimable]: claimableAmountRaw,
    };
    const stableKey = transactionReference || (sourceSequenceNumber && transactionDateRaw ? `${sourceSequenceNumber}|${transactionDateRaw}` : createHash('sha256').update(JSON.stringify(publicSourceFields)).digest('hex'));
    const rowKey = createHash('sha256').update(JSON.stringify(publicSourceFields)).digest('hex');
    referenceCounts.set(transactionReference, (referenceCounts.get(transactionReference) ?? 0) + (transactionReference ? 1 : 0));
    rowHashes.set(rowKey, (rowHashes.get(rowKey) ?? 0) + 1);
    return {
      id: stableKey,
      sourceSequenceNumber,
      transactionDateRaw,
      transactionDate: date.date,
      rocYear: date.rocYear,
      gregorianYear: date.year,
      transactionReference,
      saleAmountRaw,
      saleAmountTwd,
      taxAmountRaw,
      taxAmountTwd,
      administrativeFeeRaw,
      administrativeFeeTwd,
      cadastralClearingRewardRaw,
      cadastralClearingRewardTwd,
      depositedAmountRaw,
      depositedAmountTwd,
      claimableAmountRaw,
      claimableAmountTwd,
      recipientDisplayName: maskRecipientName(recipientNameRaw),
      hasValidDate: date.date !== null,
      hasValidAmounts: completeAmounts,
      hasRecipientName: Boolean(recipientNameRaw),
      hasComplexRecipientValue: isComplexRecipient(recipientNameRaw),
      deductionsTwd,
      expectedNetAfterDeductionsTwd,
      saleToDepositDifferenceTwd,
      depositToClaimableDifferenceTwd,
      reconciliationStatus,
      sourceFields: publicSourceFields,
      quality: {
        missingSequenceNumber: !sourceSequenceNumber,
        missingTransactionReference: !transactionReference,
        malformedOrNegativeAmount: [saleAmountTwd, taxAmountTwd, administrativeFeeTwd, cadastralClearingRewardTwd, depositedAmountTwd, claimableAmountTwd].some((value) => value === null || value < 0),
        deductionsExceedSale: deductionsTwd !== null && saleAmountTwd !== null && deductionsTwd > saleAmountTwd,
        depositedExceedsSale: depositedAmountTwd !== null && saleAmountTwd !== null && depositedAmountTwd > saleAmountTwd,
        claimableExceedsDeposit: claimableAmountTwd !== null && depositedAmountTwd !== null && claimableAmountTwd > depositedAmountTwd,
        unusuallyLargeTransaction: saleAmountTwd !== null && saleAmountTwd >= 10_000_000,
        requiresReview: reconciliationStatus === 'review',
      },
      _rowKey: rowKey,
    };
  });
  const publicRecords = records.map(({ _rowKey, ...record }) => ({
    ...record,
    quality: {
      ...record.quality,
      duplicateTransactionReference: Boolean(record.transactionReference && (referenceCounts.get(record.transactionReference) ?? 0) > 1),
      exactDuplicateRow: (rowHashes.get(_rowKey) ?? 0) > 1,
    },
  }));
  const qualityCounts = publicRecords.reduce<Record<string, number>>((counts, record) => {
    Object.entries(record.quality).forEach(([key, value]) => { if (value) counts[key] = (counts[key] ?? 0) + 1; });
    if (!record.hasValidDate) counts.invalidOrMissingDate = (counts.invalidOrMissingDate ?? 0) + 1;
    if (!record.hasRecipientName) counts.missingRecipientValue = (counts.missingRecipientValue ?? 0) + 1;
    if (record.hasComplexRecipientValue) counts.complexRecipientValue = (counts.complexRecipientValue ?? 0) + 1;
    return counts;
  }, {});
  await writeJson(`${outputDirectory}/records.public.json`, publicRecords);
  await writeJson(`${outputDirectory}/metadata.json`, {
    dataset: '臺北市地籍清理標售價金保管款清冊',
    sourceUrl: 'https://data.taipei/dataset/detail?id=c7afc6a7-b324-4c41-80f3-b036e7b0947c',
    resourceUpdatedAt: '2026-06-23T11:35:57+08:00',
    metadataUpdatedAt: '2026-06-23T11:37:31+08:00',
    totalRecords: publicRecords.length,
    qualityCounts,
    privacy: 'Full recipient names remain in the protected raw ingestion source and are never written to the public runtime JSON.',
    methodology: 'Derived reconciliation compares source-recorded amounts with a NT$1 tolerance and flags review items without correcting or judging the source record.',
  });
  return publicRecords;
}

if (process.argv[1]?.endsWith('convertCadastralClearingSaleProceedsCustody.ts')) {
  console.log((await convertCadastralClearingSaleProceedsCustody()).length);
}

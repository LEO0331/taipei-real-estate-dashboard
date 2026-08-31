import type { Language } from './models';

const zhLabels: Record<string, string> = {
  missingCategory: '缺少類別', unknownCategory: '未分類類別', missingIndex: '缺少指數值', missingYoY: '缺少年增率', duplicateCount: '重複紀錄',
  invalidAreaCount: '無效面積', unknownAreaUnitCount: '未知面積單位', invalidRentCount: '無效租金', invalidBuildingCount: '無效棟數', invalidHouseholdCount: '無效戶數', missingProjectNameCount: '缺少專案名稱',
  missingYearCount: '缺少年度', invalidMonthCount: '無效月份', missingPropertyNatureCount: '缺少財產性質', missingItemCount: '缺少項目', missingAmountCount: '缺少金額', invalidAmountCount: '無效金額', negativeAmountCount: '負值金額', duplicateCombinationCount: '重複組合',
  missingBrokerageNameCount: '缺少經紀業名稱', missingRegistrationNumberCount: '缺少登錄號碼', unknownCodeCount: '未知代碼',
  invalidDateCount: '無效日期', missingCompanyNameCount: '缺少公司名稱', unknownCompanyCategoryCount: '未知公司類別', emptyReasonCount: '缺少爭議原因',
  unusuallyLargeTransaction: '異常偏高金額', requiresReview: '需要檢視的紀錄', depositedExceedsSale: '存入金額高於標售金額',
  invalidPeriodCount: '無效期別', missingTotalAmountCount: '缺少總金額', duplicatePeriodCount: '重複期別',
  duplicateKeyCount: '重複鍵值', nonPositiveReservePriceCount: '非正數底價', nonPositivePropertyAreaCount: '非正數物件面積', invalidPublicAreaRatioCount: '無效公設比', missingAddressCount: '缺少地址', missingLocationCodeCount: '缺少位置代碼', sqmPingInconsistencyCount: '平方公尺與坪數換算不一致',
};

export function qualityLabel(key: string, language: Language) {
  return language === 'zh' ? zhLabels[key] ?? '其他資料品質檢查項目' : key;
}

type SearchableRecord = {
  district?: string;
  recordType?: string;
  buildingType?: string;
  buildingTypeRaw?: string;
  transactionTargetRaw?: string;
  locationText?: string;
  remarks?: string;
  totalPriceNtd?: number;
  unitPricePerPingNtd?: number;
  buildingAreaPing?: number;
};

type Filters = {
  district?: string;
  recordType?: string;
  buildingType?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
};

type RentIndexRecord = {
  rentIndexCategoryRaw?: string;
  rentIndexCategory?: string;
  periodRaw?: string;
  quarterKey?: string;
  year?: number;
  quarter?: number;
  quarterlyChangeRatePercent?: number;
};

type RentIndexFilters = {
  category?: string;
  year?: string;
  quarter?: string;
  hasQuarterlyChangeRate?: boolean;
  search?: string;
};

type PriceIndexRecord = {
  categoryRaw?: string;
  category?: string;
  categoryLabelZh?: string;
  categoryLabelEn?: string;
  periodRaw?: string;
  period?: string;
  year?: number;
  month?: number;
  monthlyIndex?: number;
  monthlyIndexChangePercent?: number;
  standardUnitPriceTenThousandNtdPerPing?: number;
};

type PriceIndexFilters = {
  category?: string;
  year?: string;
  month?: string;
  search?: string;
  minMonthlyIndex?: number;
  maxMonthlyIndex?: number;
  minMonthlyChange?: number;
  maxMonthlyChange?: number;
  minStandardUnitPrice?: number;
  maxStandardUnitPrice?: number;
};

type CommercialRentIndexRecord = {
  categoryRaw?: string;
  category?: string;
  categoryLabelZh?: string;
  categoryLabelEn?: string;
  periodRaw?: string;
  period?: string;
  year?: number;
  quarterNumber?: number;
  quarterlyIndex?: number;
  quarterlyChangePercent?: number;
  standardRentNtdPerPingPerMonth?: number;
};

type CommercialRentIndexFilters = {
  category?: string;
  year?: string;
  quarter?: string;
  search?: string;
  minQuarterlyIndex?: number;
  maxQuarterlyIndex?: number;
  minQuarterlyChange?: number;
  maxQuarterlyChange?: number;
  minStandardRent?: number;
  maxStandardRent?: number;
};

export function filterRecords<T extends SearchableRecord>(records: T[], filters: Filters): T[] {
  const search = filters.search?.trim().toLocaleLowerCase();
  const buildingTypeSearch: Record<string, string> | undefined = search ? {
    apartment: '公寓 apartment',
    elevator_building: '華廈 住宅大樓 大樓 電梯 elevator building',
    house: '透天 house',
    office: '辦公 office',
    shop: '店面 商業 shop',
    factory: '工廠 factory',
    parking: '車位 parking',
    land: '土地 land',
  } : undefined;
  return records.filter((record) => {
    if (filters.district && record.district !== filters.district) return false;
    if (filters.recordType && record.recordType !== filters.recordType) return false;
    if (filters.buildingType && record.buildingType !== filters.buildingType) return false;
    if (filters.minPrice !== undefined && (record.totalPriceNtd ?? -Infinity) < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && (record.totalPriceNtd ?? Infinity) > filters.maxPrice) return false;
    if (!search) return true;
    return [
      record.district,
      record.locationText,
      record.buildingTypeRaw,
      record.buildingType,
      record.buildingType ? buildingTypeSearch?.[record.buildingType] : undefined,
      record.transactionTargetRaw,
      record.remarks,
    ].some((value) => value?.toLocaleLowerCase().includes(search));
  });
}

export function sortDistricts<T extends { district: string }>(
  rows: T[],
  key: keyof T,
  direction: 'asc' | 'desc',
): T[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = a[key];
    const right = b[key];
    if (left == null) return right == null ? 0 : 1;
    if (right == null) return -1;
    if (typeof left === 'number' && typeof right === 'number') return (left - right) * sign;
    return String(left).localeCompare(String(right), 'zh-Hant') * sign;
  });
}

export function filterRentIndexRecords<T extends RentIndexRecord>(records: T[], filters: RentIndexFilters): T[] {
  const search = filters.search?.trim().toLocaleLowerCase();
  return records.filter((record) => {
    if (filters.category && record.rentIndexCategory !== filters.category) return false;
    if (filters.year && record.year !== Number(filters.year)) return false;
    if (filters.quarter && record.quarter !== Number(filters.quarter)) return false;
    if (filters.hasQuarterlyChangeRate && record.quarterlyChangeRatePercent === undefined) return false;
    if (!search) return true;
    return [record.rentIndexCategoryRaw, record.rentIndexCategory, record.periodRaw, record.quarterKey]
      .some((value) => value?.toLocaleLowerCase().includes(search));
  });
}

export function filterPriceIndexRecords<T extends PriceIndexRecord>(records: T[], filters: PriceIndexFilters): T[] {
  const search = filters.search?.trim().toLocaleLowerCase();
  return records.filter((record) => {
    if (filters.category && record.category !== filters.category) return false;
    if (filters.year && record.year !== Number(filters.year)) return false;
    if (filters.month && record.month !== Number(filters.month)) return false;
    if (filters.minMonthlyIndex !== undefined && (record.monthlyIndex ?? -Infinity) < filters.minMonthlyIndex) return false;
    if (filters.maxMonthlyIndex !== undefined && (record.monthlyIndex ?? Infinity) > filters.maxMonthlyIndex) return false;
    if (filters.minMonthlyChange !== undefined && (record.monthlyIndexChangePercent ?? -Infinity) < filters.minMonthlyChange) return false;
    if (filters.maxMonthlyChange !== undefined && (record.monthlyIndexChangePercent ?? Infinity) > filters.maxMonthlyChange) return false;
    if (filters.minStandardUnitPrice !== undefined && (record.standardUnitPriceTenThousandNtdPerPing ?? -Infinity) < filters.minStandardUnitPrice) return false;
    if (filters.maxStandardUnitPrice !== undefined && (record.standardUnitPriceTenThousandNtdPerPing ?? Infinity) > filters.maxStandardUnitPrice) return false;
    if (!search) return true;
    return [record.categoryRaw, record.category, record.categoryLabelZh, record.categoryLabelEn, record.periodRaw, record.period, record.year?.toString()]
      .some((value) => value?.toLocaleLowerCase().includes(search));
  });
}

export function filterCommercialRentIndexRecords<T extends CommercialRentIndexRecord>(records: T[], filters: CommercialRentIndexFilters): T[] {
  const search = filters.search?.trim().toLocaleLowerCase();
  return records.filter((record) => {
    if (filters.category && record.category !== filters.category) return false;
    if (filters.year && record.year !== Number(filters.year)) return false;
    if (filters.quarter && record.quarterNumber !== Number(filters.quarter)) return false;
    if (filters.minQuarterlyIndex !== undefined && (record.quarterlyIndex ?? -Infinity) < filters.minQuarterlyIndex) return false;
    if (filters.maxQuarterlyIndex !== undefined && (record.quarterlyIndex ?? Infinity) > filters.maxQuarterlyIndex) return false;
    if (filters.minQuarterlyChange !== undefined && (record.quarterlyChangePercent ?? -Infinity) < filters.minQuarterlyChange) return false;
    if (filters.maxQuarterlyChange !== undefined && (record.quarterlyChangePercent ?? Infinity) > filters.maxQuarterlyChange) return false;
    if (filters.minStandardRent !== undefined && (record.standardRentNtdPerPingPerMonth ?? -Infinity) < filters.minStandardRent) return false;
    if (filters.maxStandardRent !== undefined && (record.standardRentNtdPerPingPerMonth ?? Infinity) > filters.maxStandardRent) return false;
    if (!search) return true;
    return [record.categoryRaw, record.category, record.categoryLabelZh, record.categoryLabelEn, record.periodRaw, record.period, record.year?.toString(), record.quarterNumber ? `q${record.quarterNumber}` : undefined]
      .some((value) => value?.toLocaleLowerCase().includes(search));
  });
}

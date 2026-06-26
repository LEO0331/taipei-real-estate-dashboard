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

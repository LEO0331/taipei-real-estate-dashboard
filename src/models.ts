export type Language = 'zh' | 'en';

export const DISTRICTS = [
  '中正區', '大同區', '中山區', '松山區', '大安區', '萬華區',
  '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區',
] as const;

export type District = typeof DISTRICTS[number];
export type RealPriceRecordType = 'sale' | 'pre_sale' | 'rent' | 'unknown';
export type BuildingType =
  | 'apartment' | 'elevator_building' | 'house' | 'office' | 'shop'
  | 'factory' | 'parking' | 'land' | 'other' | 'unknown';

export type RealPriceRecord = {
  id: string;
  district?: District;
  recordType: RealPriceRecordType;
  transactionTargetRaw?: string;
  locationText?: string;
  transactionDateRaw?: string;
  transactionYear?: number;
  transactionMonth?: number;
  transactionQuarter?: string;
  buildingTypeRaw?: string;
  buildingType: BuildingType;
  mainUse?: string;
  mainMaterial?: string;
  completionDateRaw?: string;
  buildingAgeYears?: number;
  landAreaSqm?: number;
  buildingAreaSqm?: number;
  buildingAreaPing?: number;
  totalPriceNtd?: number;
  unitPricePerSqmNtd?: number;
  unitPricePerPingNtd?: number;
  parkingAreaSqm?: number;
  parkingPriceNtd?: number;
  rentPriceNtd?: number;
  remarks?: string;
  source: string;
};

export type QuarterlyMarketRecord = {
  id: string;
  year?: number;
  quarter?: number;
  quarterLabel?: string;
  district: District;
  totalSaleCaseCount?: number;
  residentialZoneCaseCount?: number;
  commercialZoneCaseCount?: number;
  industrialZoneCaseCount?: number;
  analysisText?: string;
  source: string;
};

export type PopulationDistrictSummary = {
  id: string;
  year: number;
  month: number;
  district: District;
  totalPopulation: number;
  malePopulation?: number;
  femalePopulation?: number;
  age0To14: number;
  age15To19: number;
  age20To34: number;
  age35To44: number;
  age45To64: number;
  age65Plus: number;
  youthShare: number;
  workingAgeShare: number;
  seniorShare: number;
  dependencyRatio?: number;
  source: string;
};

export type DistrictRealEstateSummary = {
  district: District;
  transactionCount: number;
  saleCount: number;
  rentCount: number;
  medianTotalPriceNtd?: number;
  averageTotalPriceNtd?: number;
  medianUnitPricePerPingNtd?: number;
  averageUnitPricePerPingNtd?: number;
  medianBuildingAreaPing?: number;
  medianBuildingAgeYears?: number;
  byBuildingType: Array<{ buildingType: BuildingType; count: number }>;
};

export type DistrictComparisonSummary = {
  district: District;
  realEstate?: DistrictRealEstateSummary;
  population?: PopulationDistrictSummary;
  quarterly?: QuarterlyMarketRecord;
  transactionsPer1000Residents?: number;
  salesPer1000Residents?: number;
  medianUnitPricePerPingNtd?: number;
  seniorShare?: number;
  workingAgeShare?: number;
  youthShare?: number;
  dependencyRatio?: number;
};

export type MonthlyRealEstateSummary = {
  period: string;
  transactionCount: number;
  saleCount: number;
  rentCount: number;
  medianUnitPricePerPingNtd?: number;
};

export type RealEstateSummary = {
  latestDataPeriod?: string;
  totalRecords: number;
  saleRecordCount: number;
  rentalRecordCount: number;
  medianUnitPricePerPingNtd?: number;
  medianTotalPriceNtd?: number;
  mostActiveDistrict?: District;
  highestMedianUnitPriceDistrict?: District;
  mostCommonBuildingType?: BuildingType;
  byDistrict: DistrictRealEstateSummary[];
  byMonth: MonthlyRealEstateSummary[];
  byBuildingType: Array<{ buildingType: BuildingType; count: number }>;
  totalPriceBands: Array<{ label: string; count: number }>;
  unitPriceBands: Array<{ label: string; count: number }>;
};

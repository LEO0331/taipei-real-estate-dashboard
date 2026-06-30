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
export type ResidentialRentIndexCategory =
  | 'citywide' | 'elevator_building' | 'apartment' | 'other' | 'unknown';
export type ResidentialPriceIndexCategory =
  | 'citywide' | 'citywide_apartment' | 'citywide_building' | 'citywide_small_unit' | 'other' | 'unknown';
export type CommercialOfficeRentIndexCategory = 'citywide' | 'major_roads' | 'other' | 'unknown';
export type MovablePropertyPledgeItemCategory = 'total' | 'gold_jewelry' | 'watches' | 'motorcycle' | 'other' | 'unknown';
export type BuildingConstructionType = 'new_construction' | 'addition' | 'repair' | 'reconstruction' | 'other' | 'unknown';
export type PublicUseStatus = 'public_use' | 'non_public_use' | 'unspecified';
export type ZoningCategory = 'residential' | 'commercial' | 'industrial' | 'school' | 'park' | 'government' | 'protection' | 'mixed_or_special' | 'other' | 'unknown';
export type FloorUseCategory = 'residential' | 'parking' | 'office' | 'retail' | 'school' | 'mechanical' | 'shelter' | 'public_facility' | 'other' | 'unknown';

export type BuildingUsePermitRecord = {
  id: string; permitYearRaw?: string; permitYearRoc?: number; permitYearGregorian?: number;
  permitNumber?: string; issueDateRaw?: string; issueDate?: string; originalPermitNumber?: string;
  constructionTypeRaw?: string; constructionType: BuildingConstructionType;
  structureTypeRaw?: string; structureTypePrimary?: string; publicUseStatus: PublicUseStatus;
  zoningRaw?: string; zoningCategory: ZoningCategory;
  district?: District; primaryAddress?: string; addressCount: number; addressesSample?: string[];
  landSectionCount: number; landSectionsSample?: string[];
  buildingInfo?: { buildingCount?: number; blockCount?: number; aboveGroundFloors?: number; undergroundFloors?: number; householdCount?: number };
  buildingArea?: { arcadeSiteAreaSqm?: number; otherSiteAreaSqm?: number; buildingAreaSqm?: number; legalOpenSpaceAreaSqm?: number; aboveGroundShelterAreaSqm?: number; undergroundShelterAreaSqm?: number };
  buildingHeightM?: number; projectCostNtd?: number; completionDateRaw?: string; completionDate?: string; startDateRaw?: string; startDate?: string;
  floorSummary: { floorRecordCount: number; primaryUses: string[]; residentialFloorRecordCount: number; officeFloorRecordCount: number; retailFloorRecordCount: number; parkingFloorRecordCount: number };
  parkingSummary: { parkingRecordCount: number; carSpaces?: number; motorcycleSpaces?: number; bicycleSpaces?: number; otherSpaces?: number };
  remarksCount: number; hasChangeSummary: boolean; sourceDetailAvailable: boolean;
};

export type BuildingUsePermitDetailRecord = BuildingUsePermitRecord & {
  designerRaw?: string; supervisorRaw?: string; contractorRaw?: string; allAddresses: string[]; allLandSections: string[];
  floorRecords: Array<{ raw: string; floorLabel?: string; areaSqm?: number; heightM?: number; useRaw?: string; useCategory?: FloorUseCategory }>;
  parkingRecords: Array<{ raw: string; setupType?: string; vehicleType?: string; reviewType?: string; locationIndoorOutdoor?: string; locationAboveBelowGround?: string; spaceCount?: number; areaSqm?: number }>;
  miscellaneousWorkItems: string[]; applicableLawItems: string[]; remarks: string[]; changeSummaryItems: string[];
};

export type BuildingUsePermitSummary = {
  totalRecords: number; minPermitYearGregorian?: number; maxPermitYearGregorian?: number; minIssueDate?: string; maxIssueDate?: string;
  districtCount: number; recordsWithDistrict: number; recordsMissingDistrict: number; totalHouseholdCount: number; totalProjectCostNtd: number; totalBuildingAreaSqm: number;
  totalCarParkingSpaces: number; totalMotorcycleParkingSpaces: number; medianAboveGroundFloors?: number; medianBuildingHeightM?: number;
  constructionTypeCounts: Array<{ constructionType: BuildingConstructionType; count: number }>;
  publicUseStatusCounts: Array<{ publicUseStatus: PublicUseStatus; count: number }>;
};
export type LandParcelAssessedValueRecord = {
  id: string; source: string; sourceAgency: string; sourceResourceName?: string; sourceYearRoc?: number; year: number; district: District;
  totalParcelCount?: number; totalAreaHectares?: number; totalAnnouncedLandCurrentValueThousandNtd?: number; totalAnnouncedLandCurrentValueNtd?: number;
  urbanPublicParcelCount?: number; urbanPublicAreaHectares?: number; urbanPublicAnnouncedLandCurrentValueThousandNtd?: number; urbanPublicAnnouncedLandCurrentValueNtd?: number;
  urbanPrivateParcelCount?: number; urbanPrivateAreaHectares?: number; urbanPrivateAnnouncedLandCurrentValueThousandNtd?: number; urbanPrivateAnnouncedLandCurrentValueNtd?: number;
  urbanJointParcelCount?: number; urbanJointAreaHectares?: number; urbanJointAnnouncedLandCurrentValueThousandNtd?: number; urbanJointAnnouncedLandCurrentValueNtd?: number;
  announcedLandCurrentValueNtdPerHectare?: number; urbanPublicAreaShare?: number; urbanPrivateAreaShare?: number; urbanJointAreaShare?: number; urbanPublicValueShare?: number; urbanPrivateValueShare?: number; urbanJointValueShare?: number; urbanPublicParcelShare?: number; urbanPrivateParcelShare?: number; urbanJointParcelShare?: number;
  yearOverYearTotalParcelCountChangePercent?: number; yearOverYearTotalAreaChangePercent?: number; yearOverYearTotalAnnouncedLandCurrentValueChangePercent?: number; yearOverYearValuePerHectareChangePercent?: number;
};
export type LandParcelAssessedValueSummary = { totalRecords: number; minYear?: number; maxYear?: number; districtCount: number; latestYear?: number; latestCitywideTotals?: Pick<LandParcelAssessedValueRecord, 'totalParcelCount' | 'totalAreaHectares' | 'totalAnnouncedLandCurrentValueNtd' | 'announcedLandCurrentValueNtdPerHectare' | 'urbanPublicAreaHectares' | 'urbanPrivateAreaHectares' | 'urbanJointAreaHectares'>; latestByDistrict: LandParcelAssessedValueRecord[]; byYear: Array<{ year: number; totalParcelCount: number; totalAreaHectares: number; totalAnnouncedLandCurrentValueNtd: number; announcedLandCurrentValueNtdPerHectare?: number }>; };

export type MovablePropertyPledgeBusinessRecord = {
  id: string; module: 'movable_property_pledge_business_statistics'; dataYear: number; rocYear?: number; sourceResourceName?: string;
  branchRaw?: string; branchName?: string; branchNameNormalized?: string; itemRaw?: string; itemCategory: MovablePropertyPledgeItemCategory; itemCategoryNormalized?: string;
  annualPledgeCaseCount?: number; annualPledgePrincipalNtd?: number; cashInterestIncomeNtd?: number; annualSaleTotalNtd?: number; annualSalePrincipalNtd?: number; annualSaleInterestNtd?: number; annualSaleProfitNtd?: number;
  averagePrincipalPerCaseNtd?: number; cashInterestIncomePerCaseNtd?: number; saleTotalToPledgePrincipalRatioPercent?: number; saleProfitToSaleTotalRatioPercent?: number; salePrincipalSharePercent?: number; saleInterestSharePercent?: number;
  yearOverYearPledgeCaseChangePercent?: number; yearOverYearPledgePrincipalChangePercent?: number; yearOverYearCashInterestIncomeChangePercent?: number; yearOverYearSaleTotalChangePercent?: number;
  isTotalRow: boolean; sourceRecordHash?: string; source: string; sourceAgency: string;
};

export type MovablePropertyPledgeAnnualSummary = {
  dataYear: number; recordCount: number; totalPledgeCaseCount?: number; totalPledgePrincipalNtd?: number; totalCashInterestIncomeNtd?: number; totalSaleTotalNtd?: number; totalSalePrincipalNtd?: number; totalSaleInterestNtd?: number; totalSaleProfitNtd?: number;
  averagePrincipalPerCaseNtd?: number; cashInterestIncomePerCaseNtd?: number; branchCount: number; itemCategoryCount: number; topBranchByPledgeCaseCount?: string; topBranchByPledgePrincipal?: string; topItemCategoryByPledgeCaseCount?: MovablePropertyPledgeItemCategory;
};

export type MovablePropertyPledgeBusinessSummary = {
  totalRecords: number; minYear?: number; maxYear?: number; latestYear?: number; branchCount: number; itemCategoryCount: number; latestAnnualSummary?: MovablePropertyPledgeAnnualSummary; byYear: MovablePropertyPledgeAnnualSummary[];
  byBranch: Array<{ branchName: string; recordCount: number; totalPledgeCaseCount?: number; totalPledgePrincipalNtd?: number; totalCashInterestIncomeNtd?: number; totalSaleTotalNtd?: number }>;
  byItemCategory: Array<{ itemCategory: MovablePropertyPledgeItemCategory; itemLabelZh: string; itemLabelEn: string; recordCount: number; totalPledgeCaseCount?: number; totalPledgePrincipalNtd?: number; totalCashInterestIncomeNtd?: number; totalSaleTotalNtd?: number }>;
  latestYearBranchBreakdown: Array<{ branchName: string; pledgeCaseCount?: number; pledgePrincipalNtd?: number; cashInterestIncomeNtd?: number; saleTotalNtd?: number }>;
};

export function classifyBuildingConstructionType(raw: string | undefined): BuildingConstructionType {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown'; if (text.includes('新建')) return 'new_construction'; if (text.includes('增建')) return 'addition'; if (text.includes('修建')) return 'repair'; if (text.includes('改建')) return 'reconstruction'; return 'other';
}
export function parsePublicUseStatus(raw: string | undefined): PublicUseStatus {
  const text = raw?.trim() ?? ''; return text.includes('非供公眾使用') ? 'non_public_use' : text.includes('供公眾使用') ? 'public_use' : 'unspecified';
}
export function classifyZoning(raw: string | undefined): ZoningCategory {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown'; if (/住|住宅/.test(text)) return 'residential'; if (/商|商業/.test(text)) return 'commercial'; if (/工|工業/.test(text)) return 'industrial'; if (/學校|國小|國中|高中|大學/.test(text)) return 'school'; if (/公園|綠地/.test(text)) return 'park'; if (text.includes('機關')) return 'government'; if (text.includes('保護')) return 'protection'; if (/特定|專用/.test(text)) return 'mixed_or_special'; return 'other';
}
export function classifyFloorUse(raw: string | undefined): FloorUseCategory {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown'; if (/住宅|H-?2/.test(text)) return 'residential'; if (text.includes('停車')) return 'parking'; if (/事務所|辦公/.test(text)) return 'office'; if (/零售|商店|商場/.test(text)) return 'retail'; if (/學校|教室/.test(text)) return 'school'; if (/機房|機械|水箱|梯間|樓梯/.test(text)) return 'mechanical'; if (/防空避難|避難/.test(text)) return 'shelter'; return 'other';
}

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

export type ResidentialRentIndexRecord = {
  id: string;
  source: string;
  sourceAgency: string;
  rentIndexCategoryRaw: string;
  rentIndexCategory: ResidentialRentIndexCategory;
  periodRaw: string;
  rocYear?: number;
  year?: number;
  quarter?: number;
  quarterKey?: string;
  quarterlyRentIndex?: number;
  quarterlyChangeRatePercent?: number;
  standardRentUnitPriceNtdPerPingMonthly?: number;
  yearOverYearRentIndexChangePercent?: number;
  yearOverYearStandardRentUnitPriceChangePercent?: number;
  previousQuarterKey?: string;
  previousYearSameQuarterKey?: string;
};

export type ResidentialRentIndexSummary = {
  totalRecords: number;
  categoryCount: number;
  minQuarterKey?: string;
  maxQuarterKey?: string;
  latestQuarterKey?: string;
  latestByCategory: Array<{
    rentIndexCategory: ResidentialRentIndexCategory;
    rentIndexCategoryRaw: string;
    quarterKey: string;
    quarterlyRentIndex?: number;
    quarterlyChangeRatePercent?: number;
    standardRentUnitPriceNtdPerPingMonthly?: number;
    yearOverYearRentIndexChangePercent?: number;
    yearOverYearStandardRentUnitPriceChangePercent?: number;
  }>;
  byCategory: Array<{
    rentIndexCategory: ResidentialRentIndexCategory;
    rentIndexCategoryRaw: string;
    recordCount: number;
    minQuarterKey?: string;
    maxQuarterKey?: string;
    firstRentIndex?: number;
    latestRentIndex?: number;
    firstStandardRentUnitPrice?: number;
    latestStandardRentUnitPrice?: number;
    rentIndexChangeSinceFirstPercent?: number;
    standardRentUnitPriceChangeSinceFirstPercent?: number;
  }>;
  byQuarter: Array<{
    quarterKey: string;
    year: number;
    quarter: number;
    citywideRentIndex?: number;
    elevatorBuildingRentIndex?: number;
    apartmentRentIndex?: number;
    citywideStandardRentUnitPrice?: number;
    elevatorBuildingStandardRentUnitPrice?: number;
    apartmentStandardRentUnitPrice?: number;
  }>;
};

export type ResidentialPriceMonthlyIndexRecord = {
  id: string;
  source: string;
  sourceAgency: string;
  categoryRaw?: string;
  category: ResidentialPriceIndexCategory;
  categoryLabelZh: string;
  categoryLabelEn: string;
  periodRaw?: string;
  period: string;
  periodDate: string;
  year: number;
  month: number;
  quarter: string;
  monthlyIndex?: number;
  threeMonthMovingAverageIndex?: number;
  sixMonthMovingAverageIndex?: number;
  monthlyIndexChangePercent?: number;
  threeMonthMovingAverageChangePercent?: number;
  sixMonthMovingAverageChangePercent?: number;
  standardTotalPriceTenThousandNtd?: number;
  standardTotalPriceNtd?: number;
  standardUnitPriceTenThousandNtdPerPing?: number;
  standardUnitPriceNtdPerPing?: number;
  standardUnitPriceNtdPerSqm?: number;
  yearOverYearMonthlyIndexChangePercent?: number;
  yearOverYearStandardUnitPriceChangePercent?: number;
  indexFromStartChangePercent?: number;
  isLatestPeriod: boolean;
};

export type ResidentialPriceMonthlyIndexSummary = {
  totalRecords: number;
  categoryCount: number;
  periodCount: number;
  minPeriod?: string;
  maxPeriod?: string;
  latestPeriod?: string;
  latestByCategory: Array<Pick<ResidentialPriceMonthlyIndexRecord,
    'category' | 'categoryLabelZh' | 'categoryLabelEn' | 'period' | 'monthlyIndex' | 'monthlyIndexChangePercent' |
    'yearOverYearMonthlyIndexChangePercent' | 'threeMonthMovingAverageIndex' | 'sixMonthMovingAverageIndex' |
    'standardTotalPriceTenThousandNtd' | 'standardUnitPriceTenThousandNtdPerPing'>>;
  byCategory: Array<{
    category: ResidentialPriceIndexCategory;
    categoryLabelZh: string;
    categoryLabelEn: string;
    recordCount: number;
    minPeriod?: string;
    maxPeriod?: string;
    startMonthlyIndex?: number;
    latestMonthlyIndex?: number;
    indexFromStartChangePercent?: number;
    latestStandardTotalPriceTenThousandNtd?: number;
    latestStandardUnitPriceTenThousandNtdPerPing?: number;
  }>;
  byPeriod: Array<{
    period: string;
    citywideMonthlyIndex?: number;
    citywideApartmentMonthlyIndex?: number;
    citywideBuildingMonthlyIndex?: number;
    citywideSmallUnitMonthlyIndex?: number;
    citywideStandardUnitPriceTenThousandNtdPerPing?: number;
  }>;
};

export type CommercialOfficeRentIndexRecord = {
  id: string;
  source: string;
  sourceAgency: string;
  categoryRaw?: string;
  category: CommercialOfficeRentIndexCategory;
  categoryLabelZh: string;
  categoryLabelEn: string;
  periodRaw?: string;
  period: string;
  periodDate: string;
  rocYear?: number;
  year: number;
  quarter: string;
  quarterNumber: number;
  quarterlyIndex?: number;
  quarterlyChangePercent?: number;
  standardRentNtdPerPingPerMonth?: number;
  standardRentNtdPerSqmPerMonth?: number;
  yearOverYearQuarterlyIndexChangePercent?: number;
  yearOverYearStandardRentChangePercent?: number;
  indexFromStartChangePercent?: number;
  rentGapNtdPerPingPerMonth?: number;
  rentGapPercent?: number;
  isLatestPeriod: boolean;
};

export type CommercialOfficeRentIndexSummary = {
  totalRecords: number;
  categoryCount: number;
  periodCount: number;
  minPeriod?: string;
  maxPeriod?: string;
  latestPeriod?: string;
  latestByCategory: Array<Pick<CommercialOfficeRentIndexRecord,
    'category' | 'categoryLabelZh' | 'categoryLabelEn' | 'period' | 'quarterlyIndex' | 'quarterlyChangePercent' |
    'yearOverYearQuarterlyIndexChangePercent' | 'standardRentNtdPerPingPerMonth' | 'standardRentNtdPerSqmPerMonth' |
    'indexFromStartChangePercent'>>;
  latestMajorRoadPremium?: {
    period: string;
    citywideRentNtdPerPingPerMonth?: number;
    majorRoadRentNtdPerPingPerMonth?: number;
    rentGapNtdPerPingPerMonth?: number;
    rentGapPercent?: number;
  };
  byCategory: Array<{
    category: CommercialOfficeRentIndexCategory;
    categoryLabelZh: string;
    categoryLabelEn: string;
    recordCount: number;
    minPeriod?: string;
    maxPeriod?: string;
    startQuarterlyIndex?: number;
    latestQuarterlyIndex?: number;
    indexFromStartChangePercent?: number;
    latestStandardRentNtdPerPingPerMonth?: number;
    latestStandardRentNtdPerSqmPerMonth?: number;
  }>;
  byPeriod: Array<{
    period: string;
    citywideQuarterlyIndex?: number;
    majorRoadQuarterlyIndex?: number;
    citywideStandardRentNtdPerPingPerMonth?: number;
    majorRoadStandardRentNtdPerPingPerMonth?: number;
    rentGapNtdPerPingPerMonth?: number;
    rentGapPercent?: number;
  }>;
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
  residentialRentIndex?: {
    latestQuarterKey?: string;
    citywideRentIndex?: number;
    citywideQuarterlyChangeRatePercent?: number;
    citywideStandardRentUnitPriceNtdPerPingMonthly?: number;
    citywideYearOverYearRentIndexChangePercent?: number;
    citywideYearOverYearStandardRentUnitPriceChangePercent?: number;
  };
  residentialPriceMonthlyIndex?: {
    latestPeriod?: string;
    citywideMonthlyIndex?: number;
    citywideMonthlyIndexChangePercent?: number;
    citywideYearOverYearMonthlyIndexChangePercent?: number;
    citywideStandardTotalPriceTenThousandNtd?: number;
    citywideStandardUnitPriceTenThousandNtdPerPing?: number;
  };
  commercialOfficeRentIndex?: {
    latestPeriod?: string;
    citywideQuarterlyIndex?: number;
    citywideQuarterlyChangePercent?: number;
    citywideStandardRentNtdPerPingPerMonth?: number;
    majorRoadQuarterlyIndex?: number;
    majorRoadQuarterlyChangePercent?: number;
    majorRoadStandardRentNtdPerPingPerMonth?: number;
    majorRoadRentGapNtdPerPingPerMonth?: number;
    majorRoadRentGapPercent?: number;
  };
  movablePropertyPledgeBusinessStatistics?: {
    latestYear?: number;
    latestYearPledgeCaseCount?: number;
    latestYearPledgePrincipalNtd?: number;
    latestYearCashInterestIncomeNtd?: number;
  };
};

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
export type ResidentialPriceQuarterlyIndexCategoryType = 'citywide' | 'housing_type' | 'district' | 'unknown';
export type ResidentialPriceHousingType = 'all' | 'apartment' | 'building' | 'small_unit' | 'unknown';
export type CommercialOfficeRentIndexCategory = 'citywide' | 'major_roads' | 'other' | 'unknown';
export type ConsumerPriceClassificationGroup = 'total' | 'food' | 'clothing' | 'housing' | 'transport_communication' | 'healthcare' | 'education_recreation' | 'miscellaneous' | 'other' | 'unknown';
export type ConsumerPriceClassificationLevel = 'total' | 'main_category' | 'sub_category' | 'unknown';
export type AnnualTrendDirection = 'increase' | 'decrease' | 'no_change' | 'first_record' | 'unknown';
export type LandValueTaxPeriodCategory = 'annual' | 'full_period' | 'first_half' | 'second_half' | 'first_period' | 'second_period' | 'other' | 'unknown';
export type LandUseZoningCategory = 'residential' | 'commercial' | 'industrial' | 'administrative_public_institution' | 'school_education' | 'park_green_open_space' | 'transportation' | 'market' | 'parking' | 'utility_infrastructure' | 'river_water' | 'cultural_religious_social_welfare' | 'medical' | 'agriculture' | 'special_district' | 'public_facility' | 'other' | 'unknown';
export type DevelopmentIntensityCategory = 'no_ratio_or_not_applicable' | 'very_low' | 'low' | 'medium' | 'high' | 'very_high' | 'unknown';
export type MovablePropertyPledgeItemCategory = 'total' | 'gold_jewelry' | 'watches' | 'motorcycle' | 'other' | 'unknown';
export type SecuredTransactionCategory = 'movable_property_mortgage' | 'conditional_sale' | 'other' | 'unknown';
export type MovableCollateralTypeCategory = 'machinery_equipment_or_tools' | 'vehicle_or_transport' | 'inventory_or_goods' | 'other' | 'unknown';
export type SourceYesNoUnknown = 'yes' | 'no' | 'unknown';
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

export type MovablePropertySecuredTransactionRecord = {
  id: string; module: 'movable_property_secured_transaction_records'; registrationNumber: string; source: string; sourceAgency: string; sourceRecordHash?: string;
  registrationApprovalDateRaw?: string; registrationApprovalDate?: string; registrationYear?: number; registrationMonth?: number; registrationMonthKey?: string; registrationQuarter?: string;
  amendmentDocumentNumber?: string; amendmentApprovalDateRaw?: string; amendmentApprovalDate?: string; amendmentYear?: number; hasAmendment: boolean;
  cancellationDocumentNumber?: string; cancellationDateRaw?: string; cancellationDate?: string; cancellationYear?: number; hasCancellation: boolean;
  securedTransactionTypeRaw?: string; securedTransactionType?: string; securedTransactionCategory: SecuredTransactionCategory;
  contractStartDateRaw?: string; contractStartDate?: string; contractStartYear?: number; contractEndDateRaw?: string; contractEndDate?: string; contractEndYear?: number; contractDurationDays?: number; isContractCurrentlyWithinPeriod?: boolean; isContractExpiredByDate?: boolean;
  debtorName?: string; debtorNameNormalized?: string; debtorBusinessNumber?: string; hasMaskedDebtorBusinessNumber: boolean; debtorAddress?: string; debtorDistrict?: District; debtorRoadName?: string; debtorAgentName?: string; debtorAgentBusinessNumber?: string;
  securedPartyName?: string; securedPartyNameNormalized?: string; securedPartyBusinessNumber?: string; hasMaskedSecuredPartyBusinessNumber: boolean; securedPartyAddress?: string; securedPartyDistrict?: District; securedPartyRoadName?: string; securedPartyAgentName?: string; securedPartyAgentBusinessNumber?: string; securedPartyNotes?: string;
  collateralTypeRaw?: string; collateralType?: string; collateralTypeCategory: MovableCollateralTypeCategory; collateralOwnerName?: string; collateralOwnerNameNormalized?: string; collateralOwnerBusinessNumber?: string; hasMaskedCollateralOwnerBusinessNumber: boolean; collateralLocation?: string; collateralDistrict?: District; collateralRoadName?: string;
  collateralTotalAmount?: number; collateralCurrency?: string; collateralAmountNtd?: number; securedDebtAmount?: number; securedDebtCurrency?: string; securedDebtAmountNtd?: number; securedDebtToCollateralRatio?: number;
  maximumLimitFlag: SourceYesNoUnknown; isMaximumLimit: boolean; movableItemCount?: number; floatingChargeFlag: SourceYesNoUnknown; isFloatingCharge: boolean;
};

export type MovablePropertySecuredTransactionSummary = {
  totalRecords: number; minRegistrationApprovalDate?: string; maxRegistrationApprovalDate?: string; latestRegistrationMonth?: string;
  uniqueRegistrationNumberCount: number; uniqueDebtorNameCount: number; uniqueSecuredPartyNameCount: number; uniqueCollateralOwnerNameCount: number;
  recordsWithAmendment: number; recordsWithCancellation: number; recordsWithContractStartDate: number; recordsWithContractEndDate: number; recordsWithCollateralAmount: number; recordsWithSecuredDebtAmount: number; recordsWithDebtToCollateralRatio: number; recordsWithMaximumLimitFlag: number; recordsWithFloatingChargeFlag: number;
  totalCollateralAmountNtd?: number; totalSecuredDebtAmountNtd?: number; medianCollateralAmountNtd?: number; medianSecuredDebtAmountNtd?: number; averageSecuredDebtToCollateralRatio?: number; medianSecuredDebtToCollateralRatio?: number;
  byRegistrationYear: Array<{ year: number; recordCount: number; totalCollateralAmountNtd?: number; totalSecuredDebtAmountNtd?: number; maximumLimitCount: number }>;
  byRegistrationMonth: Array<{ registrationMonthKey: string; recordCount: number; totalCollateralAmountNtd?: number; totalSecuredDebtAmountNtd?: number }>;
  bySecuredTransactionCategory: Array<{ securedTransactionCategory: SecuredTransactionCategory; count: number; totalCollateralAmountNtd?: number; totalSecuredDebtAmountNtd?: number }>;
  byCollateralTypeCategory: Array<{ collateralTypeCategory: MovableCollateralTypeCategory; count: number; totalCollateralAmountNtd?: number; totalSecuredDebtAmountNtd?: number }>;
  byCollateralDistrict: Array<{ district: District; recordCount: number; totalCollateralAmountNtd?: number; totalSecuredDebtAmountNtd?: number }>;
  byDebtorDistrict: Array<{ district: District; recordCount: number }>;
  bySecuredPartyDistrict: Array<{ district: District; recordCount: number }>;
  topSecuredPartiesByRecordCount: Array<{ securedPartyName: string; recordCount: number; totalSecuredDebtAmountNtd?: number }>;
  topDebtorsByRecordCount: Array<{ debtorName: string; recordCount: number; totalSecuredDebtAmountNtd?: number }>;
  dataQuality: { maskedDebtorBusinessNumberCount: number; maskedSecuredPartyBusinessNumberCount: number; maskedCollateralOwnerBusinessNumberCount: number; parsedCollateralDistrictCount: number; parsedDebtorDistrictCount: number; parsedSecuredPartyDistrictCount: number };
};

export type IncomePerEarnerByDistrictYearRecord = {
  id: string; module: 'income_per_earner_by_district_year'; source: string; sourceAgency: string; sourceResourceName?: string; sourceRecordHash?: string;
  yearRaw?: string; rocYear?: number; dataYear: number; districtRaw?: string; district?: District; districtNormalized: string; isCityAverage: boolean;
  incomeEarnerCount?: number; totalIncomeNtd?: number; employeeCompensationNtd?: number; mainJobSalaryNtd?: number; sideJobSalaryNtd?: number; otherEmployeeIncomeNtd?: number;
  businessOwnerIncomeNtd?: number; agriculturalNetIncomeNtd?: number; businessNetIncomeNtd?: number; professionalPracticeNetIncomeNtd?: number; propertyIncomeNtd?: number; imputedOwnerOccupiedRentIncomeNtd?: number;
  currentTransferIncomeNtd?: number; transferFromPrivateNtd?: number; transferFromGovernmentNtd?: number; socialInsuranceBenefitNtd?: number; transferFromEnterpriseNtd?: number; transferFromAbroadNtd?: number; miscellaneousIncomeNtd?: number;
  nonConsumptionExpenditureNtd?: number; interestExpenditureNtd?: number; currentTransferExpenditureNtd?: number; transferToPrivateNtd?: number; transferToGovernmentNtd?: number; socialInsuranceExpenditureNtd?: number; transferToAbroadNtd?: number; disposableIncomeNtd?: number;
  employeeCompensationSharePercent?: number; businessOwnerIncomeSharePercent?: number; propertyIncomeSharePercent?: number; currentTransferIncomeSharePercent?: number; nonConsumptionExpenditureToTotalIncomePercent?: number; interestExpenditureToTotalIncomePercent?: number; disposableIncomeToTotalIncomePercent?: number;
  mainJobSalaryShareOfEmployeeCompensationPercent?: number; sideJobSalaryShareOfEmployeeCompensationPercent?: number; yearOverYearTotalIncomeChangePercent?: number; yearOverYearDisposableIncomeChangePercent?: number; totalIncomeRank?: number; disposableIncomeRank?: number;
};

export type IncomePerEarnerByDistrictYearSummary = {
  totalRecords: number; minYear?: number; maxYear?: number; latestYear?: number; districtCount: number; hasCityAverage: boolean;
  latestCityAverage?: IncomePerEarnerByDistrictYearRecord;
  latestYearDistrictRanking: Array<Pick<IncomePerEarnerByDistrictYearRecord, 'district' | 'totalIncomeNtd' | 'disposableIncomeNtd' | 'incomeEarnerCount' | 'totalIncomeRank' | 'disposableIncomeRank'>>;
  byYear: Array<{ dataYear: number; rocYear?: number; recordCount: number; cityAverageTotalIncomeNtd?: number; cityAverageDisposableIncomeNtd?: number; cityAverageIncomeEarnerCount?: number; topDistrictByTotalIncome?: District; topDistrictByDisposableIncome?: District; lowestDistrictByDisposableIncome?: District }>;
  byDistrict: Array<{ district: District; recordCount: number; latestTotalIncomeNtd?: number; latestDisposableIncomeNtd?: number; latestIncomeEarnerCount?: number; totalIncomeChangeSinceFirstPercent?: number; disposableIncomeChangeSinceFirstPercent?: number }>;
  latestIncomeComposition: Array<{ key: string; labelZh: string; labelEn: string; valueNtd?: number; sharePercent?: number }>;
};

export type ConsumerPriceBasicAnnualIndexRecord = {
  id: string; module: 'consumer_price_basic_annual_index'; source: string; sourceAgency: string; sourceResourceName?: string; sourceRecordHash?: string;
  cityCodeRaw?: string; cityCode?: string; isTaipeiCity: boolean; yearRaw?: string; rocYear?: number; year: number;
  basicClassificationRaw: string; basicClassificationLabel: string; semanticClassificationLabel: string; classificationKey: string;
  classificationGroup: ConsumerPriceClassificationGroup; classificationLevel: ConsumerPriceClassificationLevel; classificationSortOrder: number;
  parentClassificationKey?: string; indexValue?: number; annualChangeRaw?: string; annualChangePercent?: number; yearOverYearIndexDelta?: number;
  isTotalIndex: boolean; isMainCategory: boolean; isHousingRelated: boolean; isFoodRelated: boolean; isTransportRelated: boolean; isHealthcareRelated: boolean;
  indexBaseNote?: string;
};

export type ConsumerPriceBasicAnnualIndexSummary = {
  totalRecords: number; minYear?: number; maxYear?: number; latestYear?: number; classificationCount: number; semanticClassificationKeyCount: number; mainCategoryCount: number;
  latestTotalIndex?: number; latestTotalAnnualChangePercent?: number; latestHousingIndex?: number; latestHousingAnnualChangePercent?: number;
  baseYearCandidate?: number; byYear: Array<{ year: number; totalIndex?: number; totalAnnualChangePercent?: number; housingIndex?: number; rentIndex?: number; foodIndex?: number; transportCommunicationIndex?: number }>;
  latestMainCategories: Array<Pick<ConsumerPriceBasicAnnualIndexRecord, 'classificationKey' | 'basicClassificationLabel' | 'semanticClassificationLabel' | 'classificationGroup' | 'indexValue' | 'annualChangePercent' | 'yearOverYearIndexDelta'>>;
  byClassificationGroup: Array<{ classificationGroup: ConsumerPriceClassificationGroup; recordCount: number; latestIndex?: number; latestAnnualChangePercent?: number }>;
  highestLatestAnnualChangeCategories: Array<Pick<ConsumerPriceBasicAnnualIndexRecord, 'classificationKey' | 'semanticClassificationLabel' | 'classificationGroup' | 'indexValue' | 'annualChangePercent'>>;
};

export type TaipowerTaipeiElectricitySalesRecord = {
  id: string; module: 'taipower_taipei_electricity_sales'; periodRaw: string; rocYear: number; gregorianYear: number; periodLabelZh: string; periodLabelEn: string;
  totalCustomerCount?: number; totalElectricitySalesThousandKwh?: number; totalElectricitySalesKwh?: number; totalElectricityUsePerCustomerKwh?: number;
  lightingCustomerCount?: number; lightingElectricitySalesThousandKwh?: number; lightingElectricitySalesKwh?: number; lightingElectricityUsePerCustomerKwh?: number;
  lightingFlatRateCustomerCount?: number; lightingFlatRateElectricitySalesThousandKwh?: number; lightingFlatRateUsePerCustomerKwh?: number;
  lightingFlatRateGeneralCustomerCount?: number; lightingFlatRateGeneralElectricitySalesThousandKwh?: number; lightingFlatRateGeneralUsePerCustomerKwh?: number;
  lightingFlatRateStreetlightCustomerCount?: number; lightingFlatRateStreetlightElectricitySalesThousandKwh?: number; lightingFlatRateStreetlightUsePerCustomerKwh?: number;
  lightingMeteredCustomerCount?: number; lightingMeteredElectricitySalesThousandKwh?: number; lightingMeteredUsePerCustomerKwh?: number;
  lightingMeteredBusinessCustomerCount?: number; lightingMeteredBusinessElectricitySalesThousandKwh?: number; lightingMeteredBusinessUsePerCustomerKwh?: number;
  lightingMeteredNonBusinessCustomerCount?: number; lightingMeteredNonBusinessElectricitySalesThousandKwh?: number; lightingMeteredNonBusinessUsePerCustomerKwh?: number;
  powerCustomerCount?: number; powerElectricitySalesThousandKwh?: number; powerElectricitySalesKwh?: number; powerUsePerCustomerKwh?: number;
  powerFlatRateCustomerCount?: number; powerFlatRateElectricitySalesThousandKwh?: number; powerFlatRateUsePerCustomerKwh?: number;
  powerMeteredCustomerCount?: number; powerMeteredElectricitySalesThousandKwh?: number; powerMeteredUsePerCustomerKwh?: number;
  taipowerSelfUseElectricityThousandKwh?: number; taipowerSelfUseElectricityKwh?: number;
  totalCustomerCountYearOverYearChange?: number; totalCustomerCountTrendDirection: AnnualTrendDirection;
  totalElectricitySalesYearOverYearChange?: number; totalElectricitySalesYearOverYearPercentChange?: number; totalElectricitySalesTrendDirection: AnnualTrendDirection;
  totalElectricityUsePerCustomerYearOverYearChange?: number; totalElectricityUsePerCustomerTrendDirection: AnnualTrendDirection;
  lightingShareOfTotalSales?: number; powerShareOfTotalSales?: number; lightingMeteredBusinessShareOfLightingSales?: number; lightingMeteredNonBusinessShareOfLightingSales?: number; powerMeteredShareOfPowerSales?: number;
  isLatestRecord: boolean; categoryConsistencyWarnings: string[]; sourceRecordHash?: string; source: string; sourceAgency: string;
};

export type TaipowerTaipeiElectricitySalesSummary = {
  totalRecords: number; minRocYear?: number; maxRocYear?: number; minGregorianYear?: number; maxGregorianYear?: number;
  latestRecord?: Pick<TaipowerTaipeiElectricitySalesRecord, 'rocYear' | 'gregorianYear' | 'totalCustomerCount' | 'totalElectricitySalesThousandKwh' | 'totalElectricityUsePerCustomerKwh' | 'lightingElectricitySalesThousandKwh' | 'powerElectricitySalesThousandKwh' | 'totalElectricitySalesYearOverYearChange' | 'totalElectricitySalesYearOverYearPercentChange'>;
  firstTotalCustomerCount?: number; latestTotalCustomerCount?: number; totalCustomerCountChange?: number; totalCustomerCountPercentChange?: number;
  firstTotalElectricitySalesThousandKwh?: number; latestTotalElectricitySalesThousandKwh?: number; totalElectricitySalesChangeThousandKwh?: number; totalElectricitySalesPercentChange?: number;
  minTotalElectricitySalesThousandKwh?: number; maxTotalElectricitySalesThousandKwh?: number; averageTotalElectricitySalesThousandKwh?: number;
  minTotalElectricityUsePerCustomerKwh?: number; maxTotalElectricityUsePerCustomerKwh?: number; averageTotalElectricityUsePerCustomerKwh?: number;
  latestLightingShareOfTotalSales?: number; latestPowerShareOfTotalSales?: number;
  annualSeries: Array<Pick<TaipowerTaipeiElectricitySalesRecord, 'rocYear' | 'gregorianYear' | 'totalCustomerCount' | 'totalElectricitySalesThousandKwh' | 'totalElectricityUsePerCustomerKwh' | 'lightingElectricitySalesThousandKwh' | 'powerElectricitySalesThousandKwh' | 'lightingCustomerCount' | 'powerCustomerCount' | 'totalElectricitySalesYearOverYearChange' | 'totalElectricitySalesYearOverYearPercentChange' | 'totalCustomerCountYearOverYearChange' | 'totalElectricityUsePerCustomerYearOverYearChange' | 'lightingShareOfTotalSales' | 'powerShareOfTotalSales' | 'lightingMeteredBusinessElectricitySalesThousandKwh' | 'lightingMeteredNonBusinessElectricitySalesThousandKwh'>>;
  dataQuality: { missingPeriodCount: number; invalidPeriodCount: number; duplicateYearCount: number; missingTotalCustomerCountCount: number; invalidTotalCustomerCountCount: number; missingTotalElectricitySalesCount: number; invalidTotalElectricitySalesCount: number; missingPerCustomerUseCount: number; invalidPerCustomerUseCount: number; categorySumMismatchCount: number; duplicateFallbackKeyCount: number };
};

export type LandValueTaxBracket = {
  bracketNumber: number; lowerBoundLandValue?: number; upperBoundLandValue?: number; isLowerBoundInclusive: boolean; isUpperBoundInclusive: boolean; isOpenEnded: boolean; ratePermille: number; progressiveDifferenceAmount?: number; rawLine: string;
};

export type LandValueTaxProgressiveBracketRecord = {
  id: string; module: 'land_value_tax_progressive_brackets'; rocYearRaw?: string; rocYear: number; gregorianYear: number; yearLabelZh: string; yearLabelEn: string;
  taxPeriodRaw: string; taxPeriod: string; taxPeriodCategory: LandValueTaxPeriodCategory;
  paymentPeriodStartRaw?: string; paymentPeriodEndRaw?: string; paymentPeriodStartDate?: string; paymentPeriodEndDate?: string; paymentPeriodMonth?: number; paymentPeriodDayCount?: number;
  generalLandTaxFormulaRaw: string; generalLandTaxBrackets: LandValueTaxBracket[]; generalLandTaxBracketCount: number; generalLandProgressiveStartingPointLandValue?: number; generalLandLowestRatePermille?: number; generalLandHighestRatePermille?: number; generalLandHighestBracketLowerBound?: number; generalLandFormulaHasHalfYearMultiplier: boolean;
  selfUseResidentialLandTaxFormulaRaw: string; selfUseResidentialLandTaxRatePermille?: number; selfUseResidentialFormulaHasHalfYearMultiplier: boolean;
  industrialLandTaxFormulaRaw: string; industrialLandTaxRatePermille?: number; industrialFormulaHasHalfYearMultiplier: boolean;
  publicFacilityReservedLandTaxFormulaRaw: string; publicFacilityReservedLandTaxRatePermille?: number; publicFacilityReservedFormulaHasHalfYearMultiplier: boolean;
  yearOverYearProgressiveStartingPointChange?: number; yearOverYearProgressiveStartingPointPercentChange?: number; isLatestRecord: boolean; sourceRecordHash?: string; source: string; sourceAgency: string;
};

export type LandValueTaxProgressiveBracketSummary = {
  totalRecords: number; minRocYear?: number; maxRocYear?: number; minGregorianYear?: number; maxGregorianYear?: number;
  latestRecord?: Pick<LandValueTaxProgressiveBracketRecord, 'rocYear' | 'gregorianYear' | 'taxPeriod' | 'paymentPeriodStartDate' | 'paymentPeriodEndDate' | 'generalLandProgressiveStartingPointLandValue' | 'generalLandLowestRatePermille' | 'generalLandHighestRatePermille' | 'generalLandTaxBracketCount' | 'selfUseResidentialLandTaxRatePermille' | 'industrialLandTaxRatePermille' | 'publicFacilityReservedLandTaxRatePermille' | 'yearOverYearProgressiveStartingPointChange' | 'yearOverYearProgressiveStartingPointPercentChange'>;
  firstProgressiveStartingPointLandValue?: number; latestProgressiveStartingPointLandValue?: number; minProgressiveStartingPointLandValue?: number; maxProgressiveStartingPointLandValue?: number; averageProgressiveStartingPointLandValue?: number;
  totalProgressiveStartingPointChange?: number; totalProgressiveStartingPointPercentChange?: number; minGeneralLandLowestRatePermille?: number; maxGeneralLandHighestRatePermille?: number;
  byTaxPeriodCategory: Array<{ taxPeriodCategory: LandValueTaxPeriodCategory; count: number }>;
  byGregorianYear: Array<{ gregorianYear: number; rocYear: number; recordCount: number; taxPeriods: string[]; progressiveStartingPointLandValue?: number; generalLandTaxBracketCount?: number; selfUseResidentialLandTaxRatePermille?: number; industrialLandTaxRatePermille?: number; publicFacilityReservedLandTaxRatePermille?: number }>;
  annualSeries: Array<Pick<LandValueTaxProgressiveBracketRecord, 'rocYear' | 'gregorianYear' | 'taxPeriod' | 'paymentPeriodStartDate' | 'paymentPeriodEndDate' | 'paymentPeriodMonth' | 'paymentPeriodDayCount' | 'generalLandProgressiveStartingPointLandValue' | 'generalLandLowestRatePermille' | 'generalLandHighestRatePermille' | 'generalLandTaxBracketCount' | 'selfUseResidentialLandTaxRatePermille' | 'industrialLandTaxRatePermille' | 'publicFacilityReservedLandTaxRatePermille' | 'yearOverYearProgressiveStartingPointChange' | 'yearOverYearProgressiveStartingPointPercentChange'>>;
  dataQuality: { missingYearCount: number; invalidYearCount: number; duplicateYearPeriodCount: number; missingTaxPeriodCount: number; unknownTaxPeriodCount: number; missingPaymentPeriodStartCount: number; invalidPaymentPeriodStartCount: number; missingPaymentPeriodEndCount: number; invalidPaymentPeriodEndCount: number; invalidPaymentPeriodRangeCount: number; missingGeneralLandFormulaCount: number; failedGeneralLandBracketParseCount: number; missingSelfUseResidentialFormulaCount: number; failedSelfUseResidentialRateParseCount: number; missingIndustrialFormulaCount: number; failedIndustrialRateParseCount: number; missingPublicFacilityReservedFormulaCount: number; failedPublicFacilityReservedRateParseCount: number; duplicateFallbackKeyCount: number };
};

export type LandUseZoningControlRecord = {
  id: string; module: 'land_use_zoning_control_summary'; districtName: string; districtNameNormalized?: string; isTaipeiDistrict: boolean;
  zoningName: string; zoningNameNormalized?: string; zoningCategory: LandUseZoningCategory; zoningUseFamily?: string; recordCount: number;
  isResidentialZoning: boolean; isCommercialZoning: boolean; isIndustrialZoning: boolean; isPublicFacilityZoning: boolean; isTransportationZoning: boolean; isOpenSpaceOrGreenZoning: boolean; isRiverOrWaterZoning: boolean;
  buildingCoverageRatioPercent?: number; buildingCoverageRatioDecimal?: number; hasBuildingCoverageRatio: boolean;
  floorAreaRatioUpperLimitPercent?: number; floorAreaRatioUpperLimitDecimal?: number; hasFloorAreaRatioUpperLimit: boolean;
  areaSquareMeters: number; areaHectares: number; areaPing: number; areaShareWithinDistrict?: number; areaShareCitywide?: number; recordCountShareWithinDistrict?: number;
  developmentIntensityCategory: DevelopmentIntensityCategory;
  estimatedMaxFloorAreaSquareMeters?: number; estimatedMaxFloorAreaHectares?: number; estimatedMaxFloorAreaPing?: number;
  estimatedBuildingFootprintLimitSquareMeters?: number; estimatedBuildingFootprintLimitHectares?: number; estimatedBuildingFootprintLimitPing?: number;
  sourceRecordHash?: string; source: string; sourceAgency: string;
};

export type LandUseZoningControlSummary = {
  totalRecords: number; districtCount: number; uniqueZoningNameCount: number; totalSourceRecordCount: number; totalAreaSquareMeters: number; totalAreaHectares: number; totalAreaPing: number;
  recordsWithBuildingCoverageRatio: number; recordsWithoutBuildingCoverageRatio: number; recordsWithFloorAreaRatioUpperLimit: number; recordsWithoutFloorAreaRatioUpperLimit: number;
  minBuildingCoverageRatioPercent?: number; maxBuildingCoverageRatioPercent?: number; averageBuildingCoverageRatioPercent?: number;
  minFloorAreaRatioUpperLimitPercent?: number; maxFloorAreaRatioUpperLimitPercent?: number; averageFloorAreaRatioUpperLimitPercent?: number;
  totalEstimatedMaxFloorAreaSquareMeters?: number; totalEstimatedBuildingFootprintLimitSquareMeters?: number;
  largestZoningCategoryByArea?: LandUseZoningCategory; largestDistrictByArea?: string; highestAverageFarDistrict?: string; highestAverageBcrDistrict?: string; publicFacilityOpenSpaceAreaShare?: number;
  byDistrict: Array<{ districtName: string; recordRows: number; sourceRecordCount: number; uniqueZoningNameCount: number; totalAreaSquareMeters: number; totalAreaHectares: number; citywideAreaShare: number; averageBuildingCoverageRatioPercent?: number; averageFloorAreaRatioUpperLimitPercent?: number; maxBuildingCoverageRatioPercent?: number; maxFloorAreaRatioUpperLimitPercent?: number; recordsWithBuildingCoverageRatio: number; recordsWithFloorAreaRatioUpperLimit: number }>;
  byZoningCategory: Array<{ zoningCategory: LandUseZoningCategory; recordRows: number; sourceRecordCount: number; districtCount: number; uniqueZoningNameCount: number; totalAreaSquareMeters: number; totalAreaHectares: number; citywideAreaShare: number; averageBuildingCoverageRatioPercent?: number; averageFloorAreaRatioUpperLimitPercent?: number }>;
  byDevelopmentIntensityCategory: Array<{ developmentIntensityCategory: DevelopmentIntensityCategory; recordRows: number; totalAreaSquareMeters: number; citywideAreaShare: number }>;
  topZoningNamesByArea: Array<{ zoningName: string; zoningCategory: LandUseZoningCategory; totalAreaSquareMeters: number; districtCount: number; sourceRecordCount: number }>;
  topDistrictZoningCombinationsByArea: Array<Pick<LandUseZoningControlRecord, 'districtName' | 'zoningName' | 'zoningCategory' | 'areaSquareMeters' | 'areaShareWithinDistrict' | 'buildingCoverageRatioPercent' | 'floorAreaRatioUpperLimitPercent'>>;
  dataQuality: { missingDistrictCount: number; unknownDistrictCount: number; missingZoningNameCount: number; missingRecordCountCount: number; invalidRecordCountCount: number; missingBuildingCoverageRatioCount: number; invalidBuildingCoverageRatioCount: number; missingFloorAreaRatioUpperLimitCount: number; invalidFloorAreaRatioUpperLimitCount: number; missingAreaCount: number; invalidAreaCount: number; duplicateDistrictZoningKeyCount: number; zeroAreaCount: number; zeroBuildingCoverageRatioCount: number; zeroFloorAreaRatioCount: number };
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

export type ResidentialPriceQuarterlyIndexRecord = {
  id: string;
  module: 'residential_price_quarterly_index';
  source: string;
  sourceAgency: string;
  sourceRecordHash?: string;
  categoryRaw: string;
  category: string;
  categoryType: ResidentialPriceQuarterlyIndexCategoryType;
  housingType?: ResidentialPriceHousingType;
  district?: District;
  isCitywide: boolean;
  isHousingType: boolean;
  isDistrict: boolean;
  quarterRaw?: string;
  rocYear?: number;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  quarterKey: string;
  quarterStartDate: string;
  quarterlyIndex?: number;
  quarterlyChangePercent?: number;
  standardHousingTotalPriceTenThousandNtd?: number;
  standardHousingUnitPriceTenThousandNtdPerPing?: number;
  quarterlyIndexYoYChangePercent?: number;
  standardHousingTotalPriceYoYChangePercent?: number;
  standardHousingUnitPriceYoYChangePercent?: number;
  indexChangeFromFirstQuarterPercent?: number;
  unitPriceChangeFromFirstQuarterPercent?: number;
  districtRankByQuarterlyIndex?: number;
  districtRankByStandardUnitPrice?: number;
  districtRankByQuarterlyChange?: number;
};

export type ResidentialPriceQuarterlyIndexSummary = {
  totalRecords: number;
  minQuarterKey?: string;
  maxQuarterKey?: string;
  latestQuarterKey?: string;
  categoryCount: number;
  districtCount: number;
  housingTypeCategoryCount: number;
  latestCitywide?: Pick<ResidentialPriceQuarterlyIndexRecord, 'quarterKey' | 'quarterlyIndex' | 'quarterlyChangePercent' | 'standardHousingTotalPriceTenThousandNtd' | 'standardHousingUnitPriceTenThousandNtdPerPing' | 'quarterlyIndexYoYChangePercent' | 'standardHousingUnitPriceYoYChangePercent'>;
  latestHousingTypeValues: Array<Pick<ResidentialPriceQuarterlyIndexRecord, 'category' | 'housingType' | 'quarterlyIndex' | 'quarterlyChangePercent' | 'standardHousingTotalPriceTenThousandNtd' | 'standardHousingUnitPriceTenThousandNtdPerPing'>>;
  latestDistrictRanking: Array<Pick<ResidentialPriceQuarterlyIndexRecord, 'district' | 'quarterlyIndex' | 'quarterlyChangePercent' | 'standardHousingTotalPriceTenThousandNtd' | 'standardHousingUnitPriceTenThousandNtdPerPing' | 'districtRankByQuarterlyIndex' | 'districtRankByStandardUnitPrice'>>;
  byCategory: Array<{ category: string; categoryType: ResidentialPriceQuarterlyIndexCategoryType; recordCount: number; minQuarterKey?: string; maxQuarterKey?: string; latestQuarterlyIndex?: number; latestStandardUnitPrice?: number; indexChangeFromFirstQuarterPercent?: number }>;
  byQuarter: Array<{ quarterKey: string; recordCount: number; citywideQuarterlyIndex?: number; citywideQuarterlyChangePercent?: number; citywideStandardUnitPrice?: number; apartmentQuarterlyIndex?: number; buildingQuarterlyIndex?: number; smallUnitQuarterlyIndex?: number }>;
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
  residentialPriceQuarterlyIndex?: {
    latestQuarterKey?: string;
    citywideQuarterlyIndex?: number;
    citywideQuarterlyChangePercent?: number;
    citywideYearOverYearQuarterlyIndexChangePercent?: number;
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
  movablePropertySecuredTransactionRecords?: {
    totalRecords?: number;
    latestRegistrationMonth?: string;
    totalCollateralAmountNtd?: number;
    totalSecuredDebtAmountNtd?: number;
  };
  incomePerEarnerByDistrictYear?: {
    latestYear?: number;
    cityAverageTotalIncomeNtd?: number;
    cityAverageDisposableIncomeNtd?: number;
    cityAverageIncomeEarnerCount?: number;
    topDistrictByDisposableIncome?: string;
  };
  consumerPriceBasicAnnualIndex?: {
    latestYear?: number;
    latestTotalIndex?: number;
    latestTotalAnnualChangePercent?: number;
    latestHousingIndex?: number;
    latestHousingAnnualChangePercent?: number;
  };
  taipowerTaipeiElectricitySales?: {
    latestYear?: number;
    latestTotalCustomerCount?: number;
    latestTotalElectricitySalesThousandKwh?: number;
    latestTotalElectricityUsePerCustomerKwh?: number;
    latestTotalElectricitySalesYearOverYearPercentChange?: number;
  };
  landValueTaxProgressiveBrackets?: {
    latestYear?: number;
    latestProgressiveStartingPointLandValue?: number;
    latestGeneralLandHighestRatePermille?: number;
    latestGeneralLandTaxBracketCount?: number;
    latestYearOverYearProgressiveStartingPointPercentChange?: number;
  };
  landUseZoningControlSummary?: {
    totalRecords?: number;
    districtCount?: number;
    uniqueZoningNameCount?: number;
    totalAreaSquareMeters?: number;
    maxFloorAreaRatioUpperLimitPercent?: number;
    maxBuildingCoverageRatioPercent?: number;
    largestZoningCategoryByArea?: string;
    largestDistrictByArea?: string;
  };
};

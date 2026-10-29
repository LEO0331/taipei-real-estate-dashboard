import type { QuarterlyMarketRecord } from '../models';

export function latestMarketRows(records: QuarterlyMarketRecord[]) {
  const latest = records.map(r => r.quarterLabel).sort().at(-1);
  return records.filter(r => r.quarterLabel === latest);
}
export function marketSummary(records: QuarterlyMarketRecord[]) {
  const latest = latestMarketRows(records);
  return {
    latestQuarter: latest[0]?.quarterLabel,
    totalSaleCaseCount: latest.reduce((n,r) => n + (r.totalSaleCaseCount ?? 0), 0),
    residentialZoneCaseCount: latest.reduce((n,r) => n + (r.residentialZoneCaseCount ?? 0), 0),
    commercialZoneCaseCount: latest.reduce((n,r) => n + (r.commercialZoneCaseCount ?? 0), 0),
    industrialZoneCaseCount: latest.reduce((n,r) => n + (r.industrialZoneCaseCount ?? 0), 0),
    topDistrict: [...latest].sort((a,b) => (b.totalSaleCaseCount ?? 0) - (a.totalSaleCaseCount ?? 0))[0]?.district,
  };
}


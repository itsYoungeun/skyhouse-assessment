import { RawCampaign, Campaign, Summary } from '../types';

// Parse a numeric CSV field. Returns null for missing/blank/non-numeric values
// so callers can surface "N/A" rather than silently treating bad data as 0 or NaN.
function parseNumber(value: string | undefined): number | null {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Convert one raw CSV row into a Campaign with calculated ROAS and CPA.
// ROAS = revenue / spend, CPA = spend / conversions.
// Any field that is missing/non-numeric stays null; metrics are null when their
// inputs are missing or would divide by zero.
export function toCampaign(raw: RawCampaign): Campaign {
  const spend = parseNumber(raw.spend);
  const revenue = parseNumber(raw.revenue);
  const conversions = parseNumber(raw.conversions);

  const roas =
    revenue !== null && spend !== null && spend > 0 ? revenue / spend : null;
  const cpa =
    spend !== null && conversions !== null && conversions > 0
      ? spend / conversions
      : null;

  return {
    campaign_id: raw.campaign_id,
    campaign_name: raw.campaign_name,
    spend,
    revenue,
    conversions,
    platform: raw.platform,
    roas,
    cpa,
  };
}

export function calculateMetrics(rows: RawCampaign[]): Campaign[] {
  return rows.map(toCampaign);
}

// Aggregate totals across all campaigns. Missing spend/revenue values are
// skipped (treated as 0) rather than poisoning the totals; overallRoas is null
// when there is no spend to divide by.
export function computeSummary(campaigns: Campaign[]): Summary {
  const totalSpend = campaigns.reduce((acc, c) => acc + (c.spend ?? 0), 0);
  const totalRevenue = campaigns.reduce((acc, c) => acc + (c.revenue ?? 0), 0);
  const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : null;
  return { totalSpend, totalRevenue, overallRoas };
}

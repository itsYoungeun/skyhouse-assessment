// Shape of a row exactly as parsed from campaigns.csv (all values are strings).
export interface RawCampaign {
  campaign_id: string;
  campaign_name: string;
  spend: string;
  revenue: string;
  conversions: string;
  platform: string;
}

// A campaign after parsing + metric calculation.
// Numeric fields are null when the source value was missing or non-numeric;
// roas / cpa are null when they cannot be computed (missing input or divide-by-zero).
export interface Campaign {
  campaign_id: string;
  campaign_name: string;
  spend: number | null;
  revenue: number | null;
  conversions: number | null;
  platform: string;
  roas: number | null;
  cpa: number | null;
}

export interface Summary {
  totalSpend: number;
  totalRevenue: number;
  overallRoas: number | null;
}

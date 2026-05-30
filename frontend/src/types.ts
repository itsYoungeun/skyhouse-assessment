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

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

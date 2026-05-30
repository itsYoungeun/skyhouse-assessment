import type { Campaign } from '../types';
import { formatCurrency } from '../format';

// Bonus: a simple bar chart of Revenue by Campaign, rendered with plain CSS
// (bar width is proportional to the largest revenue in the current view).
// Campaigns with no revenue value render an empty bar and "N/A".
export function RevenueChart({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) return null;

  const maxRevenue = Math.max(0, ...campaigns.map((c) => c.revenue ?? 0));

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-gray-900">
        Revenue by Campaign
      </h2>
      <div className="space-y-3">
        {campaigns.map((c) => {
          const pct =
            c.revenue !== null && maxRevenue > 0
              ? (c.revenue / maxRevenue) * 100
              : 0;
          return (
            <div key={c.campaign_id}>
              <div className="mb-1 flex justify-between text-xs text-gray-600">
                <span className="truncate pr-2">{c.campaign_name}</span>
                <span className="tabular-nums">{formatCurrency(c.revenue)}</span>
              </div>
              <div className="h-3 w-full rounded bg-gray-100">
                <div
                  className="h-3 rounded bg-blue-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

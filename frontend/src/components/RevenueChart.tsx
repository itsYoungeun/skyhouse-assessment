import type { Campaign } from '../types';
import { formatCurrency } from '../lib/format';

// Bonus: a simple bar chart of Revenue by Campaign, rendered with plain CSS
// (bar width is proportional to the largest revenue in the current view).
// Campaigns with no revenue value render an empty bar and "N/A".
export function RevenueChart({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) return null;

  const maxRevenue = Math.max(0, ...campaigns.map((c) => c.revenue ?? 0));

  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-text-strong">
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
              <div className="mb-1 flex justify-between text-xs text-text-soft">
                <span className="truncate pr-2">{c.campaign_name}</span>
                <span className="tabular-nums">{formatCurrency(c.revenue)}</span>
              </div>
              <div className="h-3 w-full rounded bg-hairline">
                <div
                  className="h-3 rounded bg-bar"
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

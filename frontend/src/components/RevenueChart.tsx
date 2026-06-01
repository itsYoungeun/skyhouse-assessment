import { useCallback, useRef, useState } from 'react';
import type { Campaign } from '../types';
import { formatCurrency } from '../lib/format';

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Bonus: a simple bar chart of Revenue by Campaign, rendered with plain CSS
// (bar width is proportional to the largest revenue in the current view).
// Campaigns with no revenue value render an empty bar and "N/A".
//
// The bars fill from zero the first time the chart scrolls into view, and the
// effect plays once. Remounting via a key (on a dataset change) re-arms it.
export function RevenueChart({ campaigns }: { campaigns: Campaign[] }) {
  // Start already filled (no animation) when the user prefers reduced motion.
  const [filled, setFilled] = useState(prefersReducedMotion);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Fill the bars the first time the chart scrolls into view, then stop.
  const chartRef = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    if (!node || prefersReducedMotion()) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setFilled(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  if (campaigns.length === 0) return null;

  const maxRevenue = Math.max(0, ...campaigns.map((c) => c.revenue ?? 0));

  return (
    <div
      ref={chartRef}
      className="rounded-lg border border-border bg-surface p-4 shadow-sm"
    >
      <h2 className="mb-4 text-base font-semibold text-text-strong">
        Revenue by Campaign
      </h2>
      <div className="space-y-3">
        {campaigns.map((c, i) => {
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
                  className="h-3 rounded bg-bar transition-[width] duration-[900ms] ease-out motion-reduce:transition-none"
                  style={{
                    width: filled ? `${pct}%` : '0%',
                    transitionDelay: `${i * 60}ms`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

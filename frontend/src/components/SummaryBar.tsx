import type { Summary } from '../types';
import { formatCurrency, formatRoas } from '../lib/format';

export function SummaryBar({ summary }: { summary: Summary }) {
  const items = [
    { label: 'Total Spend', value: formatCurrency(summary.totalSpend) },
    { label: 'Total Revenue', value: formatCurrency(summary.totalRevenue) },
    { label: 'Overall ROAS', value: formatRoas(summary.overallRoas) },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-border bg-surface p-4 shadow-sm"
        >
          <div className="text-sm font-medium text-text-muted">
            {item.label}
          </div>
          <div className="mt-1 text-2xl font-semibold text-text-strong">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

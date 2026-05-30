import type { Summary } from '../types';
import { formatCurrency, formatRoas } from '../format';

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
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="text-sm font-medium text-gray-500">{item.label}</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

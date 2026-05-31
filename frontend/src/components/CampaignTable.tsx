import { useMemo, useState } from 'react';
import type { Campaign } from '../types';
import { formatCurrency, formatCount, formatRoas, formatCpa } from '../lib/format';
import { ROAS_GREEN_MIN, ROAS_YELLOW_MIN } from '../lib/constants';

type SortDir = 'desc' | 'asc';
// Only numeric columns are sortable.
type SortKey = 'spend' | 'revenue' | 'conversions' | 'roas' | 'cpa';

// Row tint by ROAS: green >= 3.0, yellow 1.5-2.99, red < 1.5, neutral if N/A.
function roasRowClass(roas: number | null): string {
  if (roas === null) return 'bg-surface';
  if (roas >= ROAS_GREEN_MIN) return 'bg-row-good';
  if (roas >= ROAS_YELLOW_MIN) return 'bg-row-ok';
  return 'bg-row-bad';
}

// Compare two nullable numbers, keeping null ("N/A") rows last in BOTH
// directions; otherwise sort by value in the requested direction.
function compareNullableNumber(
  a: number | null,
  b: number | null,
  dir: SortDir,
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return dir === 'desc' ? b - a : a - b;
}

interface Props {
  campaigns: Campaign[];
  emptyMessage: string;
}

export function CampaignTable({ campaigns, emptyMessage }: Props) {
  // key === null means "default order" (the order rows arrive in, untouched).
  const [sort, setSort] = useState<{ key: SortKey | null; dir: SortDir }>({
    key: null,
    dir: 'desc',
  });

  const sorted = useMemo(() => {
    if (sort.key === null) return campaigns;
    const key = sort.key;
    return [...campaigns].sort((a, b) =>
      compareNullableNumber(a[key], b[key], sort.dir),
    );
  }, [campaigns, sort]);

  // 1st click: highest first. 2nd: lowest first. 3rd: back to default order.
  function handleSort(key: SortKey) {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: 'desc' };
      if (prev.dir === 'desc') return { key, dir: 'asc' };
      return { key: null, dir: 'desc' };
    });
  }

  function renderSortHeader(label: string, key: SortKey) {
    const isActive = sort.key === key;
    const indicator = isActive ? (sort.dir === 'desc' ? '▼' : '▲') : '↕';
    return (
      <th
        className="px-4 py-3 text-right"
        aria-sort={
          isActive ? (sort.dir === 'desc' ? 'descending' : 'ascending') : 'none'
        }
      >
        <button
          type="button"
          onClick={() => handleSort(key)}
          className="inline-flex cursor-pointer items-center gap-1 hover:text-text"
          title={`Sort by ${label}`}
        >
          <span>{label}</span>
          <span
            aria-hidden="true"
            className={`-translate-y-px leading-none ${
              isActive ? 'text-text' : 'text-text-muted'
            }`}
          >
            {indicator}
          </span>
        </button>
      </th>
    );
  }

  if (campaigns.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-surface text-left text-xs font-semibold tracking-wide text-text-muted uppercase">
          <tr>
            <th className="px-4 py-3">Campaign</th>
            <th className="px-4 py-3">Platform</th>
            {renderSortHeader('Spend', 'spend')}
            {renderSortHeader('Revenue', 'revenue')}
            {renderSortHeader('Conversions', 'conversions')}
            {renderSortHeader('ROAS', 'roas')}
            {renderSortHeader('CPA', 'cpa')}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {sorted.map((c) => (
            <tr key={c.campaign_id} className={roasRowClass(c.roas)}>
              <td className="px-4 py-3 font-medium text-text-strong">
                {c.campaign_name}
              </td>
              <td className="px-4 py-3 text-text-soft">{c.platform}</td>
              <td className="px-4 py-3 text-right text-text tabular-nums">
                {formatCurrency(c.spend)}
              </td>
              <td className="px-4 py-3 text-right text-text tabular-nums">
                {formatCurrency(c.revenue)}
              </td>
              <td className="px-4 py-3 text-right text-text tabular-nums">
                {formatCount(c.conversions)}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-text-strong tabular-nums">
                {formatRoas(c.roas)}
              </td>
              <td className="px-4 py-3 text-right text-text tabular-nums">
                {formatCpa(c.cpa)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

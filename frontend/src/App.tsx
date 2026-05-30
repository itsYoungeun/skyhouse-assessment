import { useEffect, useMemo, useState } from 'react';
import type { Campaign, Summary } from './types';
import { fetchCampaigns, fetchSummary } from './api';
import { SummaryBar } from './components/SummaryBar';
import { RoasFilter } from './components/RoasFilter';
import { CampaignTable } from './components/CampaignTable';
import { RevenueChart } from './components/RevenueChart';

function App() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minRoas, setMinRoas] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([fetchCampaigns(), fetchSummary()])
      .then(([campaignData, summaryData]) => {
        if (!active) return;
        setCampaigns(campaignData);
        setSummary(summaryData);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load data');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Client-side min-ROAS filter. Campaigns with no ROAS (N/A) are excluded
  // once a minimum is set, since they cannot meet any threshold.
  const filtered = useMemo(() => {
    const min = parseFloat(minRoas);
    if (minRoas === '' || Number.isNaN(min)) return campaigns;
    return campaigns.filter((c) => c.roas !== null && c.roas >= min);
  }, [campaigns, minRoas]);

  // Distinguish "no data at all" from "filter excluded everything".
  const emptyMessage =
    campaigns.length === 0
      ? 'No campaign data available.'
      : 'No campaigns match the current filter.';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Campaign Performance Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            ROAS and CPA across all advertising campaigns.
          </p>
        </header>

        {loading && (
          <p className="text-sm text-gray-500">Loading campaigns…</p>
        )}

        {error && !loading && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>Could not load data: {error}</p>
            <p className="mt-1 text-red-600">
              Is the backend running on port 3000?
            </p>
          </div>
        )}

        {!loading && !error && summary && (
          <div className="space-y-6">
            <SummaryBar summary={summary} />
            <RoasFilter
              value={minRoas}
              onChange={setMinRoas}
              matchCount={filtered.length}
              totalCount={campaigns.length}
            />
            <CampaignTable campaigns={filtered} emptyMessage={emptyMessage} />
            <RevenueChart campaigns={filtered} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

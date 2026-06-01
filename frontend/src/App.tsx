import { useEffect, useMemo, useState } from 'react';
import type { Campaign, Summary, Dataset } from './types';
import {
  fetchCampaigns,
  fetchSummary,
  uploadCampaignsCsv,
  resetCampaigns,
} from './lib/api';
import { SummaryBar } from './components/SummaryBar';
import { InsightsPanel } from './components/InsightsPanel';
import { RoasFilter } from './components/RoasFilter';
import { CampaignTable } from './components/CampaignTable';
import { RevenueChart } from './components/RevenueChart';
import { UploadButton } from './components/UploadButton';
import { ThemeToggle } from './theme/ThemeToggle';

// Keep the loading overlay up for at least this long so a near-instant local
// upload still gives clear visual feedback instead of flashing past.
const MIN_LOADING_MS = 500;

function withMinDuration<T>(work: Promise<T>): Promise<T> {
  return Promise.all([
    work,
    new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS)),
  ]).then(([result]) => result);
}

function App() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minRoas, setMinRoas] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [customLoaded, setCustomLoaded] = useState(false);
  // Bumped whenever the dataset changes, to remount the insights panel so it
  // discards a take generated for the previous data.
  const [datasetVersion, setDatasetVersion] = useState(0);

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

  function applyDataset(data: Dataset) {
    setCampaigns(data.campaigns);
    setSummary(data.summary);
    setMinRoas('');
    setDatasetVersion((v) => v + 1);
    // Return to the top so the revenue chart's fill animation replays as the
    // user scrolls back down to it.
    window.scrollTo({ top: 0 });
  }

  async function handleUpload(csvText: string) {
    setUploading(true);
    setUploadError(null);
    try {
      applyDataset(await withMinDuration(uploadCampaignsCsv(csvText)));
      setCustomLoaded(true);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleReset() {
    setUploading(true);
    setUploadError(null);
    try {
      applyDataset(await withMinDuration(resetCampaigns()));
      setCustomLoaded(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-page text-text">
      {/* Floating controls, pinned to the viewport corner so they stay out of
          the dashboard's own layout/alignment. */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <UploadButton onFile={handleUpload} disabled={uploading} />
        <ThemeToggle />
      </div>

      {uploading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-page/70 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-5 py-4 shadow-sm">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
            <span className="text-sm font-medium text-text">Loading data…</span>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-text-strong">
            Campaign Performance Dashboard
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            ROAS and CPA across all advertising campaigns.
          </p>
          {customLoaded && (
            <p className="mt-2 text-sm text-text-muted">
              Showing uploaded data.{' '}
              <button
                type="button"
                onClick={handleReset}
                disabled={uploading}
                className="cursor-pointer font-medium text-accent hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset to sample data
              </button>
            </p>
          )}
        </header>

        {uploadError && (
          <div className="mb-6 rounded-md border border-error-border bg-error-bg p-3 text-sm text-error-text">
            {uploadError}
          </div>
        )}

        {loading && (
          <p className="text-sm text-text-muted">Loading campaigns…</p>
        )}

        {error && !loading && (
          <div className="rounded-md border border-error-border bg-error-bg p-4 text-sm text-error-text">
            <p>Could not load data: {error}</p>
            <p className="mt-1 text-error-text-soft">
              Is the backend running on port 3000?
            </p>
          </div>
        )}

        {!loading && !error && summary && (
          <div className="space-y-6">
            <SummaryBar summary={summary} />
            <InsightsPanel key={`insights-${datasetVersion}`} />
            <RoasFilter
              value={minRoas}
              onChange={setMinRoas}
              matchCount={filtered.length}
              totalCount={campaigns.length}
            />
            <CampaignTable campaigns={filtered} emptyMessage={emptyMessage} />
            <RevenueChart key={`chart-${datasetVersion}`} campaigns={filtered} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

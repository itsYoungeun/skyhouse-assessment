import './config/env';
import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import cors from 'cors';
import path from 'path';
import { readCampaignCsv, parseCampaignCsv } from './services/data';
import { calculateMetrics, computeSummary } from './services/metrics';
import {
  createInsightStream,
  describeInsightsError,
  getInsightModel,
  INSIGHT_ANGLES,
  normalizeAngleIndex,
} from './services/insights';
import { Campaign, Summary, RawCampaign } from './types';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const CSV_PATH =
  process.env.CAMPAIGNS_CSV ?? path.join(__dirname, '..', 'data', 'campaigns.csv');

// Expose the insight metadata headers so the browser can read them even when
// the frontend calls the API cross-origin (i.e. without the dev proxy).
app.use(
  cors({
    exposedHeaders: [
      'X-Insight-Angle-Index',
      'X-Insight-Angle-Label',
      'X-Insight-Total-Angles',
      'X-Insight-Model',
      'X-Insight-Cached',
    ],
  }),
);
app.use(express.json());
// Uploaded CSVs arrive as a plain-text body.
app.use(express.text({ type: ['text/csv', 'text/plain'], limit: '2mb' }));

// The active dataset (sample at startup, or whatever was last uploaded) and its
// aggregate summary, computed once and cached rather than recomputed per request.
let campaigns: Campaign[] = [];
let summary: Summary = { totalSpend: 0, totalRevenue: 0, overallRoas: null };

// The original sample dataset, kept so the user can reset back to it.
let sampleCampaigns: Campaign[] = [];
let sampleSummary: Summary = { totalSpend: 0, totalRevenue: 0, overallRoas: null };

// Generated insight text, keyed by angle. Cleared whenever the dataset changes
// so insights always reflect the data currently shown.
const insightCache = new Map<string, string>();

// Columns an uploaded CSV must contain to be usable.
const REQUIRED_COLUMNS = [
  'campaign_id',
  'campaign_name',
  'spend',
  'revenue',
  'conversions',
  'platform',
];

// Recompute and cache campaigns + summary from raw rows; reset insights.
function applyDataset(rows: RawCampaign[]): void {
  campaigns = calculateMetrics(rows);
  summary = computeSummary(campaigns);
  insightCache.clear();
}

// Which required columns are absent from the parsed rows (all, if no rows).
function missingColumns(rows: RawCampaign[]): string[] {
  if (rows.length === 0) return [...REQUIRED_COLUMNS];
  const keys = Object.keys(rows[0]);
  return REQUIRED_COLUMNS.filter((column) => !keys.includes(column));
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// All campaigns, each with calculated ROAS and CPA.
app.get('/api/campaigns', (_req: Request, res: Response) => {
  res.json({ success: true, data: campaigns });
});

// Aggregate totals: total spend, total revenue, overall ROAS.
app.get('/api/summary', (_req: Request, res: Response) => {
  res.json({ success: true, data: summary });
});

// Replace the active dataset with an uploaded CSV (sent as a text/csv body).
// Validates the columns and returns the new campaigns + summary.
app.post('/api/upload', async (req: Request, res: Response) => {
  const csvText = typeof req.body === 'string' ? req.body : '';
  if (csvText.trim() === '') {
    res
      .status(400)
      .json({ success: false, error: 'No CSV content was uploaded.' });
    return;
  }

  try {
    const rows = await parseCampaignCsv(csvText);
    const missing = missingColumns(rows);
    if (missing.length > 0) {
      res.status(400).json({
        success: false,
        error: `CSV is missing required column(s): ${missing.join(', ')}.`,
      });
      return;
    }
    applyDataset(rows);
    res.json({ success: true, data: { campaigns, summary } });
  } catch {
    res.status(400).json({
      success: false,
      error: 'Could not parse the uploaded file as CSV.',
    });
  }
});

// Restore the original sample dataset.
app.post('/api/reset', (_req: Request, res: Response) => {
  campaigns = sampleCampaigns;
  summary = sampleSummary;
  insightCache.clear();
  res.json({ success: true, data: { campaigns, summary } });
});

// AI-generated insight, streamed token-by-token so the UI can type it out.
// ?angle=N selects the take (Overview / What to cut / Where to scale); the
// index wraps around so the client can loop. Metadata is returned in
// X-Insight-* headers; the response body is the plain-text insight.
app.post('/api/insights', async (req: Request, res: Response) => {
  const index = normalizeAngleIndex(Number(req.query.angle ?? 0) || 0);
  const angle = INSIGHT_ANGLES[index];
  const model = getInsightModel();

  const setMetaHeaders = (cached: boolean) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Insight-Angle-Index', String(index));
    res.setHeader('X-Insight-Angle-Label', angle.label);
    res.setHeader('X-Insight-Total-Angles', String(INSIGHT_ANGLES.length));
    res.setHeader('X-Insight-Model', model);
    res.setHeader('X-Insight-Cached', String(cached));
  };

  // Serve a previously generated angle instantly from cache.
  const cachedText = insightCache.get(angle.key);
  if (cachedText !== undefined) {
    setMetaHeaders(true);
    res.end(cachedText);
    return;
  }

  try {
    const { stream } = await createInsightStream(campaigns, index);
    setMetaHeaders(false);
    res.flushHeaders();
    let full = '';
    for await (const part of stream) {
      const token = part.choices[0]?.delta?.content ?? '';
      if (token) {
        full += token;
        res.write(token);
      }
    }
    insightCache.set(angle.key, full);
    res.end();
  } catch (err) {
    if (res.headersSent) {
      res.end();
    } else {
      const { status, message } = describeInsightsError(err);
      res.status(status).json({ success: false, error: message });
    }
  }
});

// Fallback error handler — return only the message, never the full Error/stack.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ success: false, error: err.message });
});

async function start(): Promise<void> {
  try {
    const rows = await readCampaignCsv(CSV_PATH);
    applyDataset(rows);
    // Remember the sample so it can be restored via /api/reset.
    sampleCampaigns = campaigns;
    sampleSummary = summary;
    app.listen(PORT, () => {
      console.log(`Campaign API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to load campaign data:', (err as Error).message);
    process.exit(1);
  }
}

start();

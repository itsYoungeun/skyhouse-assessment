import './config/env';
import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import cors from 'cors';
import path from 'path';
import { readCampaignCsv } from './services/data';
import { calculateMetrics, computeSummary } from './services/metrics';
import {
  createInsightStream,
  describeInsightsError,
  getInsightModel,
  INSIGHT_ANGLES,
  normalizeAngleIndex,
} from './services/insights';
import { Campaign, Summary } from './types';

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

// Campaign data is static, so the rows and their aggregate summary are computed
// once at startup and cached in memory rather than recomputed per request.
let campaigns: Campaign[] = [];
let summary: Summary = { totalSpend: 0, totalRevenue: 0, overallRoas: null };

// Each angle's generated text is cached (keyed by angle) since the data is
// static, so cycling back to a previously seen take is free and instant.
const insightCache = new Map<string, string>();

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
    campaigns = calculateMetrics(rows);
    summary = computeSummary(campaigns);
    app.listen(PORT, () => {
      console.log(`Campaign API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to load campaign data:', (err as Error).message);
    process.exit(1);
  }
}

start();

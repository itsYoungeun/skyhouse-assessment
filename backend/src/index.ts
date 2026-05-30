import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import cors from 'cors';
import path from 'path';
import { readCampaignCsv } from './data';
import { calculateMetrics, computeSummary } from './metrics';
import { Campaign, Summary } from './types';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const CSV_PATH =
  process.env.CAMPAIGNS_CSV ?? path.join(__dirname, '..', 'data', 'campaigns.csv');

app.use(cors());
app.use(express.json());

// Campaign data is static, so the rows and their aggregate summary are computed
// once at startup and cached in memory rather than recomputed per request.
let campaigns: Campaign[] = [];
let summary: Summary = { totalSpend: 0, totalRevenue: 0, overallRoas: null };

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

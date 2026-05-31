import OpenAI from 'openai';
import { Campaign } from '../types';

const DEFAULT_MODEL = 'gpt-4o-mini';
// Fail fast instead of the SDK's 10-minute default. The SDK retries transient
// errors (429 / 5xx) with exponential backoff up to this many times.
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

const SYSTEM_PROMPT =
  'You are a marketing analyst reviewing advertising campaign metrics. Reply in 2 to 3 sentences of plain English, referencing campaigns by name. Be concise and specific. Do not use markdown, lists, or headings.';

// Thrown when the feature is misconfigured (e.g. no API key) rather than the
// OpenAI request itself failing. Kept separate so the route can return a
// clear 503 instead of a generic 500.
export class InsightsConfigError extends Error {}

export interface InsightAngle {
  key: string;
  label: string;
  instruction: string;
}

// Clicking the button cycles through these angles so each click gives a
// genuinely different take on the same data rather than a reworded duplicate.
export const INSIGHT_ANGLES: InsightAngle[] = [
  {
    key: 'overview',
    label: 'Overview',
    instruction:
      'Give an overall read: which campaigns are performing well, which are underperforming, and one specific suggested action.',
  },
  {
    key: 'cut',
    label: 'What to cut',
    instruction:
      'Focus on waste: identify the weakest campaign(s) by ROAS and CPA, and recommend what to pause or cut first and why.',
  },
  {
    key: 'scale',
    label: 'Where to scale',
    instruction:
      'Focus on growth: identify the strongest campaign(s) and recommend a specific way to reallocate budget toward them for more return.',
  },
];

export function getInsightModel(): string {
  return process.env.OPENAI_MODEL || DEFAULT_MODEL;
}

// Normalize any integer to a valid angle index (wraps around, so looping works).
export function normalizeAngleIndex(angleIndex: number): number {
  const total = INSIGHT_ANGLES.length;
  return ((Math.trunc(angleIndex) % total) + total) % total;
}

function formatCampaignsForPrompt(campaigns: Campaign[]): string {
  const money = (n: number | null) => (n === null ? 'N/A' : `$${n.toFixed(2)}`);
  const ratio = (n: number | null) => (n === null ? 'N/A' : n.toFixed(2));
  const count = (n: number | null) => (n === null ? 'N/A' : String(n));

  return campaigns
    .map(
      (c) =>
        `- ${c.campaign_name} (${c.platform}): spend ${money(c.spend)}, ` +
        `revenue ${money(c.revenue)}, conversions ${count(c.conversions)}, ` +
        `ROAS ${ratio(c.roas)}, CPA ${money(c.cpa)}`,
    )
    .join('\n');
}

// Open a streaming OpenAI completion for the given angle. Returns the token
// stream plus metadata about the resolved angle. Throws (before any streaming)
// if the feature is unconfigured or OpenAI rejects the request.
export async function createInsightStream(
  campaigns: Campaign[],
  angleIndex: number,
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new InsightsConfigError(
      'OpenAI API key is not configured. Add OPENAI_API_KEY to backend/.env.',
    );
  }

  const index = normalizeAngleIndex(angleIndex);
  const angle = INSIGHT_ANGLES[index];
  const model = getInsightModel();
  const client = new OpenAI({
    apiKey,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
  });

  const stream = await client.chat.completions.create({
    model,
    temperature: 0.4,
    stream: true,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content:
          `${angle.instruction}\n\n` +
          'Campaign data (ROAS = revenue / spend, CPA = spend / conversions):\n\n' +
          formatCampaignsForPrompt(campaigns),
      },
    ],
  });

  return { stream, model, index, label: angle.label, key: angle.key };
}

// Map any insights error to a safe HTTP status + message (never leaks the key
// or a stack trace).
export function describeInsightsError(err: unknown): {
  status: number;
  message: string;
} {
  if (err instanceof InsightsConfigError) {
    return { status: 503, message: err.message };
  }
  if (err instanceof OpenAI.AuthenticationError) {
    return {
      status: 502,
      message: 'OpenAI rejected the API key. Check OPENAI_API_KEY in backend/.env.',
    };
  }
  if (err instanceof OpenAI.RateLimitError) {
    return {
      status: 429,
      message: 'OpenAI rate limit reached. Please wait a moment and try again.',
    };
  }
  if (err instanceof OpenAI.APIError) {
    return { status: 502, message: `OpenAI request failed: ${err.message}` };
  }
  return { status: 500, message: 'Failed to generate insights.' };
}

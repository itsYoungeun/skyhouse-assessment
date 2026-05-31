import type {
  ApiResponse,
  Campaign,
  Summary,
  InsightMeta,
  Dataset,
} from '../types';

// Send a request to an endpoint that returns the { success, data, error } envelope.
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    // Error responses still use the envelope; surface its message if present.
    let message = `Request to ${url} failed (HTTP ${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody && typeof errBody.error === 'string') {
        message = errBody.error;
      }
    } catch {
      // Body was not JSON; keep the generic message.
    }
    throw new Error(message);
  }

  const body = (await res.json()) as ApiResponse<T>;
  if (!body.success) {
    throw new Error(body.error || 'The API returned an error');
  }
  if (body.data === undefined || body.data === null) {
    throw new Error(`Response from ${url} was missing data`);
  }
  return body.data;
}

export function fetchCampaigns(): Promise<Campaign[]> {
  return request<Campaign[]>('/api/campaigns');
}

export function fetchSummary(): Promise<Summary> {
  return request<Summary>('/api/summary');
}

// Upload a CSV (raw text) to replace the active dataset; returns the new data.
export function uploadCampaignsCsv(csvText: string): Promise<Dataset> {
  return request<Dataset>('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'text/csv' },
    body: csvText,
  });
}

// Restore the original sample dataset.
export function resetCampaigns(): Promise<Dataset> {
  return request<Dataset>('/api/reset', { method: 'POST' });
}

// Stream an insight for the given angle, calling onToken as text arrives.
// Resolves with the angle metadata read from the response headers.
export async function streamInsights(
  angle: number,
  onToken: (token: string) => void,
  onMeta?: (meta: InsightMeta) => void,
): Promise<InsightMeta> {
  const res = await fetch(`/api/insights?angle=${angle}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    // Errors come back as the JSON { success, error } envelope (never streamed).
    let message = `Request to /api/insights failed (HTTP ${res.status})`;
    try {
      const body = await res.json();
      if (body && typeof body.error === 'string') message = body.error;
    } catch {
      // Body was not JSON; keep the generic message.
    }
    throw new Error(message);
  }

  const meta: InsightMeta = {
    index: Number(res.headers.get('X-Insight-Angle-Index') ?? angle),
    label: res.headers.get('X-Insight-Angle-Label') ?? '',
    total: Number(res.headers.get('X-Insight-Total-Angles') ?? 1),
    model: res.headers.get('X-Insight-Model') ?? '',
    cached: res.headers.get('X-Insight-Cached') === 'true',
  };
  onMeta?.(meta);

  const reader = res.body?.getReader();
  if (reader) {
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      onToken(decoder.decode(value, { stream: true }));
    }
  }

  return meta;
}

import type { ApiResponse, Campaign, Summary } from './types';

// Fetch JSON from an endpoint that returns the { success, data, error } envelope.
async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request to ${url} failed (HTTP ${res.status})`);
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
  return getJson<Campaign[]>('/api/campaigns');
}

export function fetchSummary(): Promise<Summary> {
  return getJson<Summary>('/api/summary');
}

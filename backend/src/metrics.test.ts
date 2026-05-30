import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCampaign, calculateMetrics, computeSummary } from './metrics';
import { RawCampaign } from './types';

// Build a valid raw row, overriding individual fields per test.
function raw(overrides: Partial<RawCampaign> = {}): RawCampaign {
  return {
    campaign_id: 'C1',
    campaign_name: 'Test Campaign',
    spend: '100',
    revenue: '300',
    conversions: '10',
    platform: 'Facebook',
    ...overrides,
  };
}

test('computes ROAS = revenue / spend and CPA = spend / conversions', () => {
  const c = toCampaign(raw());
  assert.equal(c.roas, 3);
  assert.equal(c.cpa, 10);
});

test('ROAS is null when spend is zero (no divide-by-zero)', () => {
  const c = toCampaign(raw({ spend: '0' }));
  assert.equal(c.roas, null);
});

test('CPA is null when conversions is zero (no divide-by-zero)', () => {
  const c = toCampaign(raw({ conversions: '0' }));
  assert.equal(c.cpa, null);
});

test('missing or blank fields parse to null, not 0', () => {
  const c = toCampaign(raw({ spend: '', revenue: '   ' }));
  assert.equal(c.spend, null);
  assert.equal(c.revenue, null);
  assert.equal(c.roas, null);
});

test('non-numeric values parse to null', () => {
  const c = toCampaign(raw({ spend: 'abc' }));
  assert.equal(c.spend, null);
  assert.equal(c.roas, null);
});

test('summary sums only valid numbers and computes overall ROAS', () => {
  const campaigns = calculateMetrics([
    raw({ campaign_id: 'A', spend: '100', revenue: '300' }),
    raw({ campaign_id: 'B', spend: '', revenue: '50' }), // spend missing -> skipped
  ]);
  const s = computeSummary(campaigns);
  assert.equal(s.totalSpend, 100);
  assert.equal(s.totalRevenue, 350);
  assert.equal(s.overallRoas, 3.5);
});

test('overall ROAS is null when there is no spend', () => {
  const campaigns = calculateMetrics([raw({ spend: '0', revenue: '100' })]);
  const s = computeSummary(campaigns);
  assert.equal(s.overallRoas, null);
});

test('empty input produces zero totals and null overall ROAS', () => {
  const s = computeSummary([]);
  assert.deepEqual(s, { totalSpend: 0, totalRevenue: 0, overallRoas: null });
});

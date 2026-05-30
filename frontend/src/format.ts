const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

// Money values. Null (missing in the source data) renders as "N/A".
export function formatCurrency(value: number | null): string {
  return value === null ? 'N/A' : usd.format(value);
}

// Whole counts (e.g. conversions). Null renders as "N/A".
export function formatCount(value: number | null): string {
  return value === null ? 'N/A' : value.toLocaleString();
}

// ROAS is a ratio shown like "4.50x". Null (uncomputable) renders as "N/A".
export function formatRoas(value: number | null): string {
  return value === null ? 'N/A' : `${value.toFixed(2)}x`;
}

// CPA is a dollar amount. Null (e.g. zero conversions) renders as "N/A".
export function formatCpa(value: number | null): string {
  return value === null ? 'N/A' : formatCurrency(value);
}

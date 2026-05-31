interface Props {
  value: string;
  onChange: (value: string) => void;
  matchCount: number;
  totalCount: number;
}

export function RoasFilter({ value, onChange, matchCount, totalCount }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="minRoas" className="text-sm font-medium text-text">
        Minimum ROAS
      </label>
      <input
        id="minRoas"
        type="number"
        min="0"
        step="0.1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. 3.0"
        className="w-32 rounded-md border border-border-input bg-surface px-3 py-1.5 text-sm text-text focus:border-accent-ring focus:ring-1 focus:ring-accent-ring focus:outline-none"
      />
      {value !== '' && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-sm text-accent hover:underline"
        >
          Clear
        </button>
      )}
      <span className="text-sm text-text-muted">
        Showing {matchCount} of {totalCount} campaigns
      </span>
    </div>
  );
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  matchCount: number;
  totalCount: number;
}

export function RoasFilter({ value, onChange, matchCount, totalCount }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="minRoas" className="text-sm font-medium text-gray-700">
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
        className="w-32 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
      />
      {value !== '' && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-sm text-blue-600 hover:underline"
        >
          Clear
        </button>
      )}
      <span className="text-sm text-gray-500">
        Showing {matchCount} of {totalCount} campaigns
      </span>
    </div>
  );
}

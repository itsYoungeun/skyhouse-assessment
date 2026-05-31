import { useEffect, useRef, useState } from 'react';
import { streamInsights } from '../lib/api';

// Milliseconds between revealed characters (20ms = ~50 chars/sec).
const TYPE_INTERVAL_MS = 20;

export function InsightsPanel() {
  const [text, setText] = useState('');
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which angle the next click requests; advances (and loops) after each take.
  const [nextAngle, setNextAngle] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear the reveal timer if the component unmounts mid-stream.
  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  async function generate() {
    setLoading(true);
    setError(null);
    setText('');

    // Tokens accumulate into `full` as they arrive; a steady timer reveals them
    // one character at a time, so the typing pace is independent of how fast the
    // API streams.
    let full = '';
    let shown = 0;
    let streamDone = false;

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (shown < full.length) {
        shown += 1;
        setText(full.slice(0, shown));
      } else if (streamDone) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setLoading(false);
      }
    }, TYPE_INTERVAL_MS);

    try {
      await streamInsights(
        nextAngle,
        (token) => {
          full += token;
        },
        (meta) => {
          setLabel(meta.label);
          setNextAngle(meta.total > 0 ? (meta.index + 1) % meta.total : 0);
        },
      );
      streamDone = true;
    } catch (err) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setError(
        err instanceof Error ? err.message : 'Failed to generate insights',
      );
      setLoading(false);
    }
  }

  const hasContent = text.length > 0 || label.length > 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            AI Analysis
          </h2>
          <p className="text-sm text-gray-500">
            An evaluation of what&apos;s working, what&apos;s underperforming, and where to reallocate budget.
          </p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="shrink-0 cursor-pointer rounded-md border border-blue-200 bg-blue-50 px-3 pt-1 pb-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Campaign Insights
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!error && hasContent && (
        <div className="mt-3">
          {label && (
            <span className="mb-2 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              {label}
            </span>
          )}
          <p className="text-sm leading-relaxed text-gray-800">
            {text}
            {loading && <span className="animate-pulse">▍</span>}
          </p>
        </div>
      )}
    </div>
  );
}

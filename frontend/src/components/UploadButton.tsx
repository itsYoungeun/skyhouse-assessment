import { useRef } from 'react';

function UploadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </svg>
  );
}

interface Props {
  onFile: (csvText: string) => void;
  disabled?: boolean;
}

export function UploadButton({ onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => onFile(String(reader.result ?? ''));
      reader.readAsText(file);
    }
    // Reset so selecting the same file again still fires onChange.
    event.target.value = '';
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        aria-label="Upload campaign CSV"
        title="Upload campaign CSV"
        className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-surface text-text-soft hover:bg-hairline disabled:cursor-not-allowed disabled:opacity-60"
      >
        <UploadIcon />
      </button>
    </>
  );
}

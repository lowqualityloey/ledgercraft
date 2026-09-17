"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      aria-label="Print receipt"
      className="no-print rounded bg-zinc-900 px-4 py-2 text-sm text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-zinc-100 dark:text-black dark:focus-visible:outline-zinc-100"
    >
      Print / Save as PDF
    </button>
  );
}

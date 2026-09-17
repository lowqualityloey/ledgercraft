"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reverseJournal } from "@/actions/ledger";
import { formatCents } from "@/lib/money";

interface EntryLine {
  id: string;
  debit: number;
  credit: number;
  account: { code: string; name: string };
}

export interface JournalListEntry {
  id: string;
  date: Date;
  description: string;
  reversesId: string | null;
  lines: EntryLine[];
  reversedBy: { id: string } | null;
}

export function JournalEntries({ entries }: { entries: JournalListEntry[] }) {
  const router = useRouter();
  const [reason, setReason] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function reverse(id: string) {
    setError(null);
    setPendingId(id);
    const res = await reverseJournal({ entryId: id, reason: reason[id] ?? "" });
    setPendingId(null);
    if (!res.ok) {
      setError(res.error ?? "Failed to reverse entry");
      return;
    }
    router.refresh();
  }

  if (entries.length === 0) {
    return <p className="text-sm text-zinc-500">No journal entries yet. Post the first one above.</p>;
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      {error && (
        <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {entries.map((e) => (
        <article
          key={e.id}
          className="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium">
              {new Date(e.date).toISOString().slice(0, 10)} — {e.description}
            </p>
            <div className="flex gap-2 text-xs">
              {e.reversesId && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  reversal
                </span>
              )}
              {e.reversedBy && (
                <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  reversed
                </span>
              )}
            </div>
          </div>
          <table className="mt-2 w-full font-mono tabular-nums">
            <tbody>
              {e.lines.map((l) => (
                <tr key={l.id} className="border-t border-zinc-100 dark:border-zinc-900">
                  <td className="py-1 pr-2 font-sans">
                    {l.account.code} — {l.account.name}
                  </td>
                  <td className="py-1 pr-2 text-right">{l.debit > 0 ? formatCents(l.debit) : ""}</td>
                  <td className="py-1 text-right">{l.credit > 0 ? formatCents(l.credit) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!e.reversedBy && !e.reversesId && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                aria-label={`Reversal reason for ${e.description}`}
                placeholder="Reason for reversal…"
                value={reason[e.id] ?? ""}
                onChange={(ev) => setReason((r) => ({ ...r, [e.id]: ev.target.value }))}
                className="flex-1 rounded border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700"
              />
              <button
                type="button"
                disabled={!(reason[e.id] ?? "").trim() || pendingId === e.id}
                onClick={() => void reverse(e.id)}
                className="rounded border border-zinc-300 px-2 py-1 text-sm disabled:opacity-40 dark:border-zinc-700"
              >
                {pendingId === e.id ? "Reversing…" : "Reverse"}
              </button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

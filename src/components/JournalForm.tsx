"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createJournal } from "@/actions/ledger";
import { formatCents, parseDollarsToCents } from "@/lib/money";

interface AccountOption {
  id: string;
  code: string;
  name: string;
}

interface FormLine {
  key: number;
  accountId: string;
  debit: string;
  credit: string;
}

let lineSeq = 0;
const newLine = (accountId = ""): FormLine => ({
  key: lineSeq++,
  accountId,
  debit: "",
  credit: "",
});

function centsOrNull(raw: string): number | null {
  if (raw.trim() === "") return 0;
  try {
    return parseDollarsToCents(raw);
  } catch {
    return null;
  }
}

export function JournalForm({ accounts }: { accounts: AccountOption[] }) {
  const router = useRouter();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<FormLine[]>([newLine(), newLine()]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const parsed = useMemo(
    () =>
      lines.map((l) => ({
        ...l,
        debitCents: centsOrNull(l.debit),
        creditCents: centsOrNull(l.credit),
      })),
    [lines],
  );

  const totals = useMemo(() => {
    let debits = 0;
    let credits = 0;
    let valid = true;
    for (const l of parsed) {
      if (!l.accountId) valid = false;
      if (l.debitCents === null || l.creditCents === null) {
        valid = false;
        continue;
      }
      // debit XOR credit per line
      if (!((l.debitCents > 0) !== (l.creditCents > 0))) valid = false;
      debits += l.debitCents;
      credits += l.creditCents;
    }
    return { debits, credits, valid, balanced: valid && debits > 0 && debits === credits };
  }, [parsed]);

  const patch = (key: number, field: keyof FormLine, value: string) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, [field]: value } : l)));

  async function submit() {
    setError(null);
    setPending(true);
    const res = await createJournal({
      date,
      description,
      lines: lines.map((l) => ({
        accountId: l.accountId,
        debit: l.debit,
        credit: l.credit,
      })),
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Failed to post journal");
      return;
    }
    setDescription("");
    setLines([newLine(), newLine()]);
    router.refresh();
  }

  return (
    <form
      aria-label="New journal entry"
      className="rounded border border-zinc-200 p-4 dark:border-zinc-800"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Date
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Description
          <input
            type="text"
            required
            maxLength={200}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Client payment — invoice #12"
            className="rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
          />
        </label>
      </div>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-zinc-500">
            <th className="py-1 pr-2">Account</th>
            <th className="py-1 pr-2 text-right">Debit ($)</th>
            <th className="py-1 pr-2 text-right">Credit ($)</th>
            <th className="w-10" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {parsed.map((l) => (
            <tr key={l.key} className="border-t border-zinc-200 dark:border-zinc-800">
              <td className="py-1 pr-2">
                <select
                  required
                  aria-label="Account"
                  value={l.accountId}
                  onChange={(e) => patch(l.key, "accountId", e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
                >
                  <option value="">Select…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} — {a.name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-1 pr-2">
                <input
                  inputMode="decimal"
                  aria-label="Debit amount"
                  placeholder="0.00"
                  value={l.debit}
                  onChange={(e) => patch(l.key, "debit", e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-transparent px-2 py-1 text-right font-mono dark:border-zinc-700"
                />
              </td>
              <td className="py-1 pr-2">
                <input
                  inputMode="decimal"
                  aria-label="Credit amount"
                  placeholder="0.00"
                  value={l.credit}
                  onChange={(e) => patch(l.key, "credit", e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-transparent px-2 py-1 text-right font-mono dark:border-zinc-700"
                />
              </td>
              <td className="py-1 text-right">
                <button
                  type="button"
                  aria-label="Remove line"
                  disabled={lines.length <= 2}
                  onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                  className="rounded px-2 py-1 text-zinc-500 hover:text-red-600 disabled:opacity-30"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-2 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => setLines((ls) => [...ls, newLine()])}
          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700"
        >
          + Add line
        </button>
        <p
          aria-live="polite"
          className={`font-mono tabular-nums ${totals.balanced ? "text-green-600" : "text-red-600"}`}
        >
          Dr {formatCents(totals.debits)} = Cr {formatCents(totals.credits)}{" "}
          {totals.balanced ? "✓ balanced" : "✗ unbalanced"}
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!totals.balanced || !description.trim() || pending}
        className="mt-4 rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-black"
      >
        {pending ? "Posting…" : "Post journal entry"}
      </button>
    </form>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createInvoiceAction } from "@/actions/invoicing";
import { formatCents, parseDollarsToCents } from "@/lib/money";

interface ClientOption {
  id: string;
  name: string;
  email: string;
}

interface FormLine {
  key: number;
  description: string;
  quantity: string;
  unit: string;
}

let lineSeq = 0;
const newLine = (): FormLine => ({
  key: lineSeq++,
  description: "",
  quantity: "1",
  unit: "",
});

function lineTotal(l: FormLine): number | null {
  const qty = Number.parseInt(l.quantity, 10);
  if (!Number.isInteger(qty) || qty <= 0) return null;
  if (l.unit.trim() === "") return null;
  try {
    return qty * parseDollarsToCents(l.unit);
  } catch {
    return null;
  }
}

export function InvoiceForm({
  clients,
  suggestedNumber,
}: {
  clients: ClientOption[];
  suggestedNumber: string;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [number, setNumber] = useState(suggestedNumber);
  const [issueDate, setIssueDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [lines, setLines] = useState<FormLine[]>([newLine()]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const totals = useMemo(() => {
    const amounts = lines.map(lineTotal);
    const valid =
      clientId !== "" &&
      number.trim() !== "" &&
      amounts.every((a) => a !== null && (a as number) > 0);
    const total = amounts.reduce<number>(
      (s, a) => s + (a ?? 0),
      0,
    );
    return { valid, total };
  }, [lines, clientId, number]);

  const patch = (key: number, field: keyof FormLine, value: string) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, [field]: value } : l)));

  async function submit() {
    setError(null);
    setPending(true);
    const res = await createInvoiceAction({
      clientId,
      number,
      issueDate,
      lines: lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
      })),
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Failed to post invoice");
      return;
    }
    setNumber(suggestedNumber);
    setLines([newLine()]);
    router.refresh();
  }

  return (
    <form
      aria-label="New invoice"
      className="rounded border border-zinc-200 p-4 dark:border-zinc-800"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Client
          <select
            required
            aria-label="Client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
          >
            <option value="">Select…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.email}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Number
          <input
            type="text"
            required
            maxLength={32}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="rounded border border-zinc-300 bg-transparent px-2 py-1 font-mono dark:border-zinc-700"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Issue date
          <input
            type="date"
            required
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
          />
        </label>
      </div>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-zinc-500">
            <th className="py-1 pr-2">Description</th>
            <th className="py-1 pr-2 text-right">Qty</th>
            <th className="py-1 pr-2 text-right">Unit ($)</th>
            <th className="w-10" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.key} className="border-t border-zinc-200 dark:border-zinc-800">
              <td className="py-1 pr-2">
                <input
                  type="text"
                  required
                  maxLength={200}
                  aria-label="Line description"
                  placeholder="Design work"
                  value={l.description}
                  onChange={(e) => patch(l.key, "description", e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
                />
              </td>
              <td className="py-1 pr-2">
                <input
                  inputMode="numeric"
                  aria-label="Quantity"
                  value={l.quantity}
                  onChange={(e) => patch(l.key, "quantity", e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-transparent px-2 py-1 text-right font-mono dark:border-zinc-700"
                />
              </td>
              <td className="py-1 pr-2">
                <input
                  inputMode="decimal"
                  aria-label="Unit amount"
                  placeholder="0.00"
                  value={l.unit}
                  onChange={(e) => patch(l.key, "unit", e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-transparent px-2 py-1 text-right font-mono dark:border-zinc-700"
                />
              </td>
              <td className="py-1 text-right">
                <button
                  type="button"
                  aria-label="Remove line"
                  disabled={lines.length <= 1}
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
        <p aria-live="polite" className="font-mono tabular-nums">
          Total {formatCents(totals.total)}
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!totals.valid || pending || clients.length === 0}
        className="mt-4 rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-black"
      >
        {pending ? "Posting…" : "Post invoice (Dr AR / Cr Revenue)"}
      </button>
      {clients.length === 0 && (
        <p className="mt-2 text-sm text-zinc-500">
          Add a client first on the <a href="/clients" className="underline">Clients</a> page.
        </p>
      )}
    </form>
  );
}

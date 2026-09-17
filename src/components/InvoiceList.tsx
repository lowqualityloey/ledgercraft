"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { payInvoiceAction, voidInvoiceAction } from "@/actions/invoicing";
import { formatCents } from "@/lib/money";

export interface InvoiceRow {
  id: string;
  number: string;
  status: string;
  totalDisplay: string;
  baseDisplay?: string;
  fxLabel?: string | null;
  currency?: string;
  client: { name: string; email: string };
  lines: { id: string; description: string; quantity: number; unitCents: number; lineTotal: number }[];
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  UNPAID: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  PAID: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  VOID: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function InvoiceList({ invoices }: { invoices: InvoiceRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function pay(id: string) {
    setError(null);
    setPendingId(id);
    const res = await payInvoiceAction({ invoiceId: id });
    setPendingId(null);
    if (!res.ok) setError(res.error ?? "Payment failed");
    else router.refresh();
  }

  async function voidIt(id: string) {
    const reason = window.prompt("Void reason:", "cancelled");
    if (!reason) return;
    setError(null);
    setPendingId(id);
    const res = await voidInvoiceAction({ invoiceId: id, reason });
    setPendingId(null);
    if (!res.ok) setError(res.error ?? "Void failed");
    else router.refresh();
  }

  if (invoices.length === 0) {
    return <p className="text-sm text-zinc-500">No invoices yet. Post the first one above.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {invoices.map((inv) => (
        <article
          key={inv.id}
          aria-label={`Invoice ${inv.number}`}
          className="rounded border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono font-medium">
              {inv.number}{" "}
              <span className="font-sans text-sm text-zinc-500">
                — {inv.client.name} ({inv.client.email})
              </span>
            </p>
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[inv.status] ?? ""}`}
            >
              {inv.status}
            </span>
          </div>
          <ul className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {inv.lines.map((l) => (
              <li key={l.id} className="font-mono tabular-nums">
                {l.description} × {l.quantity} — {formatCents(l.lineTotal)}
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-sm tabular-nums">
              {inv.fxLabel ? inv.fxLabel : `Total ${inv.totalDisplay}`}
              {inv.fxLabel && <span className="ml-2 text-xs text-zinc-500">({inv.currency})</span>}
            </p>
            <div className="no-print flex gap-2">
              <Link
                href={`/invoices/${inv.id}`}
                aria-label={`Open receipt ${inv.number}`}
                className="rounded border border-zinc-300 px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-zinc-700"
              >
                Receipt
              </Link>
              {inv.status === "UNPAID" && (
                <button
                  type="button"
                  disabled={pendingId === inv.id}
                  onClick={() => void pay(inv.id)}
                  className="rounded bg-zinc-900 px-3 py-1 text-sm text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-black"
                >
                  {pendingId === inv.id ? "Working…" : "Mark paid (Dr Cash / Cr AR)"}
                </button>
              )}
              {(inv.status === "UNPAID" || inv.status === "PAID") && (
                <button
                  type="button"
                  disabled={pendingId === inv.id}
                  onClick={() => void voidIt(inv.id)}
                  className="rounded border border-zinc-300 px-3 py-1 text-sm disabled:opacity-40 dark:border-zinc-700"
                >
                  Void
                </button>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

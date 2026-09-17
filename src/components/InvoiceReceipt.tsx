interface ReceiptLine {
  id: string;
  description: string;
  quantity: number;
  unitDisplay: string;
  lineDisplay: string;
}

export interface ReceiptInvoice {
  number: string;
  status: string;
  totalDisplay: string;
  subtotalDisplay: string;
  baseTotalDisplay?: string;
  baseSubtotalDisplay?: string;
  fxLabel?: string | null;
  currency?: string;
  createdAt: Date;
  client: { name: string; email: string };
  lines: ReceiptLine[];
}

// M4: presentational only — no business logic, no Prisma (INV-01–04 intact).
// Money arrives pre-formatted from integer cents via formatCents (INV-02).
export function InvoiceReceipt({ invoice }: { invoice: ReceiptInvoice }) {
  const issued = invoice.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return (
    <section
      aria-label={`Receipt ${invoice.number}`}
      className="print-receipt rounded border border-zinc-200 bg-white p-6 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
    >
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div>
          <p className="text-xl font-semibold">LedgerCraft</p>
          <p className="mt-1 text-sm text-zinc-500">Invoice receipt</p>
        </div>
        <div className="text-right">
          <p className="font-mono font-medium tabular-nums">{invoice.number}</p>
          <p className="mt-1 text-sm text-zinc-500">
            Issued {issued} · {invoice.status}
          </p>
        </div>
      </header>

      <div className="mt-4 text-sm">
        <p className="font-medium">Bill to</p>
        <p className="mt-1">{invoice.client.name}</p>
        <p className="text-zinc-500">{invoice.client.email}</p>
      </div>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
            <th scope="col" className="py-2 pr-2 font-medium">
              Description
            </th>
            <th scope="col" className="py-2 pr-2 text-right font-medium">
              Qty
            </th>
            <th scope="col" className="py-2 pr-2 text-right font-medium">
              Unit
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((l) => (
            <tr
              key={l.id}
              className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
            >
              <td className="py-2 pr-2">{l.description}</td>
              <td className="py-2 pr-2 text-right font-mono tabular-nums">
                {l.quantity}
              </td>
              <td className="py-2 pr-2 text-right font-mono tabular-nums">
                {l.unitDisplay}
              </td>
              <td className="py-2 text-right font-mono tabular-nums">
                {l.lineDisplay}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="pt-3 text-right text-sm text-zinc-500">
              Total {invoice.currency && invoice.currency !== "USD" ? `(${invoice.currency})` : ""}
            </td>
            <td className="pt-3 text-right font-mono font-semibold tabular-nums">
              {invoice.totalDisplay}
            </td>
          </tr>
          {invoice.fxLabel && (
            <tr>
              <td colSpan={3} className="pt-1 text-right text-xs text-zinc-500">
                {invoice.fxLabel}
              </td>
              <td className="pt-1 text-right font-mono text-xs tabular-nums">{invoice.baseTotalDisplay}</td>
            </tr>
          )}
        </tfoot>
      </table>

      <p className="mt-4 text-xs text-zinc-500">
        {invoice.currency && invoice.currency !== "USD"
          ? `Foreign ${invoice.currency} → base USD via integer cents. Corrections via reversing entries.`
          : "Amounts in USD from integer cents. Corrections via reversing entries."}
      </p>
    </section>
  );
}

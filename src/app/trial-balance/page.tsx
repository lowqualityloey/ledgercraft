import Link from "next/link";
import { getTrialBalance } from "@/actions/ledger";

export default async function TrialBalancePage() {
  const tb = await getTrialBalance();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-10">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← LedgerCraft
      </Link>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">Trial Balance</h1>
        <p
          aria-live="polite"
          className={`font-mono text-sm tabular-nums ${tb.balanced ? "text-green-600" : "text-red-600"}`}
        >
          {tb.balanced ? "✓ balanced" : "✗ out of balance"}
        </p>
      </div>
      {tb.rows.every((r) => r.debit === 0 && r.credit === 0) ? (
        <p className="text-sm text-zinc-500">
          No postings yet. <Link href="/journal" className="underline">Post the first journal entry</Link>.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="py-1 pr-2">Code</th>
              <th className="py-1 pr-2">Account</th>
              <th className="py-1 pr-2 text-right">Debit</th>
              <th className="py-1 text-right">Credit</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {tb.rows.map((r) => (
              <tr key={r.code} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="py-1 pr-2">{r.code}</td>
                <td className="py-1 pr-2 font-sans">{r.name}</td>
                <td className="py-1 pr-2 text-right">
                  {r.debit > 0 ? r.debitDisplay : ""}
                </td>
                <td className="py-1 text-right">
                  {r.credit > 0 ? r.creditDisplay : ""}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="font-mono tabular-nums">
            <tr className="border-t-2 border-zinc-400 font-semibold dark:border-zinc-600">
              <td className="py-1 pr-2" colSpan={2}>Totals</td>
              <td className="py-1 pr-2 text-right">{tb.totalDebitsDisplay}</td>
              <td className="py-1 text-right">{tb.totalCreditsDisplay}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </main>
  );
}

import Link from "next/link";
import { getProfitAndLoss } from "@/actions/ledger";

export default async function ProfitLossPage() {
  const pnl = await getProfitAndLoss();
  const empty = pnl.revenue === 0 && pnl.expenses === 0;
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-10">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← LedgerCraft
      </Link>
      <h1 className="text-xl font-semibold">Profit &amp; Loss</h1>
      {empty ? (
        <p className="text-sm text-zinc-500">
          No revenue or expenses posted yet.{" "}
          <Link href="/journal" className="underline">Post the first journal entry</Link>.
        </p>
      ) : (
        <table className="w-full text-sm">
          <tbody className="font-mono tabular-nums">
            <tr className="border-t border-zinc-200 dark:border-zinc-800">
              <td className="py-1 pr-2 font-sans">Revenue</td>
              <td className="py-1 text-right">{pnl.revenueDisplay}</td>
            </tr>
            <tr className="border-t border-zinc-200 dark:border-zinc-800">
              <td className="py-1 pr-2 font-sans">Expenses</td>
              <td className="py-1 text-right">{pnl.expensesDisplay}</td>
            </tr>
            <tr className="border-t-2 border-zinc-400 font-semibold dark:border-zinc-600">
              <td className="py-1 pr-2 font-sans">Net</td>
              <td className="py-1 text-right">{pnl.netDisplay}</td>
            </tr>
          </tbody>
        </table>
      )}
    </main>
  );
}

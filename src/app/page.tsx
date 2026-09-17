import Link from "next/link";
import { getTrialBalance } from "@/actions/ledger";

const NAV = [
  { href: "/accounts", title: "Chart of Accounts", blurb: "Assets, Liabilities, Equity, Revenue, Expenses" },
  { href: "/journal", title: "Journal", blurb: "Post balanced entries; correct via reversals" },
  { href: "/trial-balance", title: "Trial Balance", blurb: "Debits must equal credits" },
  { href: "/profit-loss", title: "Profit & Loss", blurb: "Revenue minus expenses" },
];

export default async function Home() {
  const tb = await getTrialBalance();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold">LedgerCraft</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Double-entry ledger. Every entry balances.{" "}
          <span className="font-mono tabular-nums">
            Dr {tb.totalDebitsDisplay} = Cr {tb.totalCreditsDisplay}{" "}
            {tb.balanced ? "✓" : "✗"}
          </span>
        </p>
      </header>
      <nav className="grid gap-3 sm:grid-cols-2">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="rounded border border-zinc-200 p-4 hover:border-zinc-400 dark:border-zinc-800"
          >
            <p className="font-medium">{n.title}</p>
            <p className="mt-1 text-sm text-zinc-500">{n.blurb}</p>
          </Link>
        ))}
      </nav>
    </main>
  );
}

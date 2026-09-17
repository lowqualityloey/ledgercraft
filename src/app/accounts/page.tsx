import Link from "next/link";
import { listAccounts } from "@/actions/ledger";

export default async function AccountsPage() {
  const accounts = await listAccounts();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-10">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← LedgerCraft
      </Link>
      <h1 className="text-xl font-semibold">Chart of Accounts</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-zinc-500">
            <th className="py-1 pr-2">Code</th>
            <th className="py-1 pr-2">Name</th>
            <th className="py-1">Type</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {accounts.map((a) => (
            <tr key={a.id} className="border-t border-zinc-200 dark:border-zinc-800">
              <td className="py-1 pr-2">{a.code}</td>
              <td className="py-1 pr-2 font-sans">{a.name}</td>
              <td className="py-1">{a.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

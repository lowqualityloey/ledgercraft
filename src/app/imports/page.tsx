import Link from "next/link";
import { listAccounts } from "@/actions/ledger";
import { listBatches } from "@/actions/imports";
import { ImportUploader } from "@/components/ImportUploader";

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  POSTED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export default async function ImportsPage() {
  const [accounts, batches] = await Promise.all([
    listAccounts(),
    listBatches(),
  ]);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-10">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← LedgerCraft
      </Link>
      <h1 className="text-xl font-semibold">Bank CSV Import</h1>
      <ImportUploader
        accounts={accounts.map((a) => ({ id: a.id, code: a.code, name: a.name }))}
      />
      <h2 className="mt-2 text-lg font-medium">Import history</h2>
      {batches.length === 0 ? (
        <p className="text-sm text-zinc-500">No imports yet. Upload a bank CSV above.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="py-1 pr-2">File</th>
              <th className="py-1 pr-2 text-right">Rows</th>
              <th className="py-1 pr-2 text-right">Posted</th>
              <th className="py-1 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {batches.map((b) => (
              <tr key={b.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="py-1 pr-2 font-sans">{b.filename}</td>
                <td className="py-1 pr-2 text-right">{b.rowCount}</td>
                <td className="py-1 pr-2 text-right">{b.postedCount}</td>
                <td className="py-1 text-right">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[b.status] ?? ""}`}>
                    {b.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

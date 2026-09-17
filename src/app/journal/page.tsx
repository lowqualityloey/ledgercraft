import Link from "next/link";
import { listAccounts, listRecentEntries } from "@/actions/ledger";
import { JournalEntries } from "@/components/JournalEntries";
import { JournalForm } from "@/components/JournalForm";

export default async function JournalPage() {
  const [accounts, entries] = await Promise.all([
    listAccounts(),
    listRecentEntries(),
  ]);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-10">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← LedgerCraft
      </Link>
      <h1 className="text-xl font-semibold">Journal</h1>
      <JournalForm
        accounts={accounts.map((a) => ({ id: a.id, code: a.code, name: a.name }))}
      />
      <h2 className="mt-2 text-lg font-medium">Recent entries</h2>
      <JournalEntries entries={entries} />
    </main>
  );
}

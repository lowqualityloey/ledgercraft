import Link from "next/link";
import { listClients } from "@/actions/invoicing";
import { ClientForm } from "@/components/ClientForm";
import { formatCents } from "@/lib/money";

export default async function ClientsPage() {
  const clients = await listClients();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-10">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← LedgerCraft
      </Link>
      <h1 className="text-xl font-semibold">Clients</h1>
      <ClientForm />
      <h2 className="mt-2 text-lg font-medium">All clients</h2>
      {clients.length === 0 ? (
        <p className="text-sm text-zinc-500">No clients yet. Add the first one above.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="py-1 pr-2">Name</th>
              <th className="py-1 pr-2">Email</th>
              <th className="py-1 pr-2 text-right">Invoices</th>
              <th className="py-1 text-right">Unpaid ($)</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {clients.map((c) => (
              <tr key={c.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="py-1 pr-2 font-sans">{c.name}</td>
                <td className="py-1 pr-2">{c.email}</td>
                <td className="py-1 pr-2 text-right">{c._count.invoices}</td>
                <td className="py-1 text-right">
                  {formatCents(c.invoices.reduce((s, i) => s + i.totalCents, 0))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

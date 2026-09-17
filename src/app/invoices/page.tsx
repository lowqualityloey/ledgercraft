import Link from "next/link";
import { listClients, listInvoices, suggestInvoiceNumber } from "@/actions/invoicing";
import { InvoiceForm } from "@/components/InvoiceForm";
import { InvoiceList } from "@/components/InvoiceList";

export default async function InvoicesPage() {
  const [clients, invoices, suggested] = await Promise.all([
    listClients(),
    listInvoices(),
    suggestInvoiceNumber(),
  ]);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-10">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← LedgerCraft
      </Link>
      <h1 className="text-xl font-semibold">Invoices</h1>
      <InvoiceForm
        clients={clients.map((c) => ({ id: c.id, name: c.name, email: c.email }))}
        suggestedNumber={suggested}
      />
      <h2 className="mt-2 text-lg font-medium">All invoices</h2>
      <InvoiceList invoices={invoices} />
    </main>
  );
}

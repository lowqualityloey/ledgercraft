import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoiceReceipt } from "@/actions/invoicing";
import { InvoiceReceipt } from "@/components/InvoiceReceipt";
import { PrintButton } from "@/components/PrintButton";

export default async function InvoiceReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoiceReceipt(id);
  if (!invoice) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-10">
      <nav className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/invoices"
          className="text-sm text-zinc-500 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          ← All invoices
        </Link>
        <PrintButton />
      </nav>
      <h1 className="no-print text-xl font-semibold">
        Receipt {invoice.number}
      </h1>
      <InvoiceReceipt invoice={invoice} />
    </main>
  );
}

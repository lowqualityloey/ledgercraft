import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoiceReceipt } from "@/actions/invoicing";
import { InvoiceReceipt } from "@/components/InvoiceReceipt";
import { PaymentConfirmation } from "@/components/PaymentConfirmation";
import { PrintButton } from "@/components/PrintButton";
import { StripePayButton } from "@/components/StripePayButton";

export default async function InvoiceReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { id } = await params;
  const { paid } = await searchParams;
  const invoice = await getInvoiceReceipt(id);
  if (!invoice) notFound();

  const showStripe = invoice.status === "UNPAID";
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
      {paid === "1" && (
        <PaymentConfirmation status={invoice.status} number={invoice.number} />
      )}
      <h1 className="no-print text-xl font-semibold">
        Receipt {invoice.number}
      </h1>
      {showStripe && (
        <div className="no-print">
          <StripePayButton invoiceId={invoice.id} />
          <p className="mt-1 text-xs text-zinc-500">Base USD {invoice.baseTotalDisplay} via Stripe Checkout</p>
        </div>
      )}
      <InvoiceReceipt invoice={invoice} />
    </main>
  );
}

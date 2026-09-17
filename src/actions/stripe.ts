"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { createCheckoutSession } from "@/lib/stripe";

const CreateCheckoutSchema = z.object({ invoiceId: z.string().cuid() });

export async function createCheckout(input: { invoiceId: string }): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireSession();
  const parsed = CreateCheckoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid invoice id" };
  const invoice = await db.invoice.findUnique({
    where: { id: parsed.data.invoiceId },
    include: { client: true },
  });
  if (!invoice) return { ok: false, error: "Invoice not found" };
  if (invoice.status !== "UNPAID") return { ok: false, error: "Invoice not payable" };
  const base = (invoice as unknown as { baseTotalCents: number }).baseTotalCents ?? invoice.totalCents;
  if (base <= 0) return { ok: false, error: "Invoice total must be positive" };
  try {
    const { url, sessionId } = await createCheckoutSession({
      invoiceId: invoice.id,
      number: invoice.number,
      clientName: invoice.client.name,
      baseTotalCents: base,
    });
    await db.invoice.update({ where: { id: invoice.id }, data: { stripeSessionId: sessionId } });
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Stripe error" };
  }
}

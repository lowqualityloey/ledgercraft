import { markPaid } from "@/lib/invoicing";
import { constructWebhookEvent } from "@/lib/stripe";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  if (!sig) return Response.json({ error: "Missing Stripe-Signature" }, { status: 400 });

  const raw = await request.text();
  let event: { id: string; type: string; data: { object: unknown } };
  try {
    event = constructWebhookEvent(raw, sig) as unknown as typeof event;
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Invalid signature" }, { status: 400 });
  }

  // Dedup: stripeId unique
  const existing = await db.stripeEvent.findUnique({ where: { stripeId: event.id } });
  if (existing?.processedAt) {
    return Response.json({ received: true, deduped: true }, { status: 200 });
  }
  if (!existing) {
    await db.stripeEvent.create({
      data: { stripeId: event.id, type: event.type, payload: raw },
    });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as { id: string; client_reference_id?: string; payment_intent?: string };
    const invoiceId = session.client_reference_id;
    if (!invoiceId) {
      return Response.json({ error: "Missing client_reference_id" }, { status: 400 });
    }
    // Validate cuid
    if (!/^c[a-z0-9]{24}$/.test(invoiceId)) {
      return Response.json({ error: "Invalid client_reference_id" }, { status: 400 });
    }
    try {
      const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) return Response.json({ error: "Invoice not found" }, { status: 404 });
      if (invoice.status === "PAID") {
        await db.stripeEvent.update({ where: { stripeId: event.id }, data: { processedAt: new Date() } });
        return Response.json({ received: true, alreadyPaid: true }, { status: 200 });
      }
      if (invoice.status !== "UNPAID") {
        return Response.json({ error: "Invoice not payable" }, { status: 400 });
      }
      // Idempotent via stripe event id
      const idem = `stripe-${event.id}`.slice(0, 56);
      await markPaid({ invoiceId, idempotencyKey: idem });
      // Optionally store paymentIntent
      if (session.payment_intent && typeof session.payment_intent === "string") {
        await db.invoice.update({ where: { id: invoiceId }, data: { stripePaymentIntentId: session.payment_intent } }).catch(() => {});
      }
      await db.stripeEvent.update({ where: { stripeId: event.id }, data: { processedAt: new Date() } });
      return Response.json({ received: true }, { status: 200 });
    } catch (e) {
      return Response.json({ error: e instanceof Error ? e.message : "Handler error" }, { status: 500 });
    }
  }

  // Unhandled event type: mark processed and ack
  await db.stripeEvent.update({ where: { stripeId: event.id }, data: { processedAt: new Date() } }).catch(() => {});
  return Response.json({ received: true, unhandled: event.type }, { status: 200 });
}

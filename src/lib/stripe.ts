import Stripe from "stripe";

function isStripeKeyConfigured(key: string | undefined): boolean {
  if (!key) return false;
  if (key === "sk_test_..." || key === "sk_test_...".replace("...", "")) return false;
  if (key.includes("change-me") || key.includes("...")) return false;
  return key.startsWith("sk_test_") || key.startsWith("sk_live_");
}

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!isStripeKeyConfigured(key)) {
    throw new Error(
      "Stripe not configured — set STRIPE_SECRET_KEY=sk_test_... and STRIPE_WEBHOOK_SECRET=whsec_... in .env (see .env.example) and restart :3000; hosted needs Vercel env",
    );
  }
  // apiVersion pinned to stripe@19.1.0 latest stable
  return new Stripe(key!, { apiVersion: "2024-12-18.acacia" as unknown as Stripe.LatestApiVersion });
}

export function getStripeClient(): Stripe {
  return getStripe();
}

export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

export async function createCheckoutSession(params: {
  invoiceId: string;
  number: string;
  clientName: string;
  baseTotalCents: number;
}): Promise<{ url: string; sessionId: string }> {
  if (params.baseTotalCents <= 0) throw new Error("baseTotalCents must be positive");
  const stripe = getStripe();
  const baseUrl = getBaseUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: params.baseTotalCents,
          product_data: { name: `Invoice ${params.number} — ${params.clientName}` },
        },
        quantity: 1,
      },
    ],
    client_reference_id: params.invoiceId,
    success_url: `${baseUrl}/invoices/${params.invoiceId}?paid=1`,
    cancel_url: `${baseUrl}/invoices/${params.invoiceId}`,
  });
  if (!session.url || !session.id) throw new Error("Stripe session missing url/id");
  return { url: session.url, sessionId: session.id };
}

export function constructWebhookEvent(payload: string, sig: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || secret === "whsec_..." || secret.includes("change-me") || secret.includes("...")) {
    throw new Error(
      "Stripe webhook not configured — set STRIPE_WEBHOOK_SECRET=whsec_... in .env (see .env.example)",
    );
  }
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(payload, sig, secret);
}

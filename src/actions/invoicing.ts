"use server";

import { revalidatePath } from "next/cache";
import { z, ZodError } from "zod";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/lib/ledger";
import {
  createClient,
  markPaid,
  postInvoice,
  voidInvoice,
} from "@/lib/invoicing";
import { db } from "@/lib/db";
import {
  CurrencySchema,
  formatCents,
  parseDollarsToCents,
  parseFxRateToBps,
} from "@/lib/money";
import { requireSession } from "@/lib/session";
import type { ActionResult } from "./ledger";

function toError(e: unknown): string {
  if (e instanceof ZodError) {
    return e.issues.map((i) => i.message).join("; ");
  }
  if (
    e instanceof NotFoundError ||
    e instanceof ConflictError ||
    e instanceof ValidationError ||
    e instanceof Error
  ) {
    return e.message;
  }
  return "Unexpected error";
}

function touch() {
  revalidatePath("/clients");
  revalidatePath("/invoices");
  revalidatePath("/trial-balance");
  revalidatePath("/profit-loss");
  revalidatePath("/");
}

export async function listClients() {
  await requireSession();
  return db.client.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { invoices: true } },
      invoices: { where: { status: "UNPAID" }, select: { totalCents: true } },
    },
  });
}

export async function createClientAction(input: {
  name: string;
  email: string;
  notes?: string;
}): Promise<ActionResult<{ clientId: string }>> {
  await requireSession();
  try {
    const c = await createClient({
      name: input.name.trim(),
      email: input.email.trim(),
      notes: input.notes?.trim() || undefined,
    });
    touch();
    return { ok: true, data: { clientId: c.id } };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}

export interface InvoiceFormLine {
  description: string;
  quantity: string; // typed as text, parsed to int
  unit: string; // dollars as typed, e.g. "250.00"
}

export async function suggestInvoiceNumber(): Promise<string> {
  await requireSession();
  const count = await db.invoice.count();
  return `INV-${String(count + 1).padStart(4, "0")}`;
}

export async function createInvoiceAction(input: {
  clientId: string;
  number: string;
  issueDate: string;
  currency?: string;
  fxRate?: string;
  lines: InvoiceFormLine[];
}): Promise<ActionResult<{ invoiceId: string }>> {
  await requireSession();
  try {
    const currency = input.currency ? CurrencySchema.parse(input.currency) : undefined;
    const fxRateBps = input.fxRate ? parseFxRateToBps(input.fxRate) : undefined;
    const inv = await postInvoice({
      clientId: input.clientId,
      number: input.number.trim(),
      currency: currency as never,
      fxRateBps: fxRateBps as never,
      issueDate: new Date(input.issueDate).toISOString(),
      idempotencyKey: crypto.randomUUID().replace(/-/g, "").slice(0, 32),
      lines: input.lines.map((l) => ({
        description: l.description.trim(),
        quantity: Number.parseInt(l.quantity, 10),
        unitCents:
          l.unit.trim() === "" ? 0 : parseDollarsToCents(l.unit),
      })),
    });
    touch();
    return { ok: true, data: { invoiceId: inv.id } };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}

export async function payInvoiceAction(input: {
  invoiceId: string;
}): Promise<ActionResult<{ invoiceId: string }>> {
  await requireSession();
  try {
    const inv = await markPaid({
      invoiceId: input.invoiceId,
      idempotencyKey: crypto.randomUUID().replace(/-/g, "").slice(0, 32),
    });
    touch();
    return { ok: true, data: { invoiceId: inv.id } };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}

export async function voidInvoiceAction(input: {
  invoiceId: string;
  reason: string;
}): Promise<ActionResult<{ invoiceId: string }>> {
  await requireSession();
  try {
    const inv = await voidInvoice({
      invoiceId: input.invoiceId,
      reason: input.reason.trim(),
      idempotencyKey: crypto.randomUUID().replace(/-/g, "").slice(0, 32),
    });
    touch();
    return { ok: true, data: { invoiceId: inv.id } };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}

export async function listInvoices() {
  await requireSession();
  const invoices = await db.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { name: true, email: true } },
      lines: true,
    },
  });
  return invoices.map((i) => ({
    ...i,
    totalDisplay: formatCents(i.totalCents),
    baseDisplay: formatCents((i as unknown as { baseTotalCents: number }).baseTotalCents ?? i.totalCents),
    fxLabel: (i as unknown as { currency: string; fxRateBps: number }).currency !== "USD"
      ? `${(i as unknown as { currency: string }).currency} ${formatCents(i.totalCents)} → USD ${formatCents((i as unknown as { baseTotalCents: number }).baseTotalCents ?? i.totalCents)}`
      : null,
  }));
}

// M4: read-only receipt fetch. Validates id at the boundary; money
// formatting stays in integer cents (INV-02). Returns null when missing
// so the route can call notFound(). M6: dual foreign→base when currency≠USD.
export async function getInvoiceReceipt(id: string) {
  await requireSession();
  const parsed = z.string().cuid().safeParse(id);
  if (!parsed.success) return null;
  const invoice = await db.invoice.findUnique({
    where: { id: parsed.data },
    include: {
      client: { select: { name: true, email: true } },
      lines: { orderBy: { description: "asc" } },
    },
  });
  if (!invoice) return null;
  const inv = invoice as unknown as {
    currency: string;
    fxRateBps: number;
    baseSubtotalCents: number;
    baseTotalCents: number;
  } & typeof invoice;
  const isForeign = inv.currency !== "USD";
  return {
    ...invoice,
    totalDisplay: formatCents(invoice.totalCents),
    subtotalDisplay: formatCents(invoice.subtotalCents),
    baseTotalDisplay: formatCents(inv.baseTotalCents ?? invoice.totalCents),
    baseSubtotalDisplay: formatCents(inv.baseSubtotalCents ?? invoice.subtotalCents),
    fxLabel: isForeign ? `${inv.currency} ${formatCents(invoice.totalCents)} → USD ${formatCents(inv.baseTotalCents ?? invoice.totalCents)} @${(inv.fxRateBps / 10000).toFixed(4)}` : null,
    lines: invoice.lines.map((l) => ({
      ...l,
      unitDisplay: formatCents(l.unitCents),
      lineDisplay: formatCents(l.lineTotal),
    })),
  };
}

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
import { formatCents, parseDollarsToCents } from "@/lib/money";
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
  const count = await db.invoice.count();
  return `INV-${String(count + 1).padStart(4, "0")}`;
}

export async function createInvoiceAction(input: {
  clientId: string;
  number: string;
  issueDate: string;
  lines: InvoiceFormLine[];
}): Promise<ActionResult<{ invoiceId: string }>> {
  try {
    const inv = await postInvoice({
      clientId: input.clientId,
      number: input.number.trim(),
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
  }));
}

// M4: read-only receipt fetch. Validates id at the boundary; money
// formatting stays in integer cents (INV-02). Returns null when missing
// so the route can call notFound().
export async function getInvoiceReceipt(id: string) {
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
  return {
    ...invoice,
    totalDisplay: formatCents(invoice.totalCents),
    subtotalDisplay: formatCents(invoice.subtotalCents),
    lines: invoice.lines.map((l) => ({
      ...l,
      unitDisplay: formatCents(l.unitCents),
      lineDisplay: formatCents(l.lineTotal),
    })),
  };
}

import {
  Prisma,
  type PrismaClient,
} from "@/generated/prisma/client";
import { z } from "zod";
import { db } from "./db";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "./ledger";
import { MoneyCentsSchema } from "./money";

// Milestone 2: Clients + Invoicing (accrual, full-pay only).
// All money movement goes through balanced journals (INV-01, INV-02);
// corrections are append-only reversals (INV-03). UI calls these
// functions via Server Actions; it never touches Prisma directly.

// CoA resolution by code (never hardcoded ids).
const AR_CODE = "1200";
const CASH_CODE = "1000";
const REVENUE_CODE = "4000";

export const ClientSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  notes: z.string().max(500).optional(),
});
export type CreateClientInput = z.infer<typeof ClientSchema>;

export const InvoiceLineSchema = z.object({
  description: z.string().min(1).max(200),
  quantity: z.number().int().positive(),
  unitCents: MoneyCentsSchema,
});

export const PostInvoiceSchema = z.object({
  clientId: z.string().cuid(),
  number: z.string().min(1).max(32),
  lines: z.array(InvoiceLineSchema).min(1),
  issueDate: z.string().datetime(),
  idempotencyKey: z.string().min(8).max(56),
});
export type PostInvoiceInput = z.infer<typeof PostInvoiceSchema>;

export const MarkPaidSchema = z.object({
  invoiceId: z.string().cuid(),
  idempotencyKey: z.string().min(8).max(56),
});
export type MarkPaidInput = z.infer<typeof MarkPaidSchema>;

export const VoidInvoiceSchema = z.object({
  invoiceId: z.string().cuid(),
  reason: z.string().min(1).max(200),
  idempotencyKey: z.string().min(8).max(56),
});
export type VoidInvoiceInput = z.infer<typeof VoidInvoiceSchema>;

type Client = PrismaClient;

function isUniqueViolation(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
  );
}

async function accountIdByCode(
  client: Client,
  code: string,
): Promise<string> {
  const account = await client.account.findUnique({ where: { code } });
  if (!account) throw new NotFoundError(`Account ${code} not seeded`);
  return account.id;
}

export async function createClient(
  input: CreateClientInput,
  client: Client = db,
) {
  const parsed = ClientSchema.parse(input);
  try {
    return await client.client.create({ data: parsed });
  } catch (e) {
    if (isUniqueViolation(e)) throw new ConflictError("Client email taken");
    throw e;
  }
}

export async function postInvoice(
  input: PostInvoiceInput,
  client: Client = db,
) {
  const parsed = PostInvoiceSchema.parse(input);

  const priced = parsed.lines.map((l) => ({
    ...l,
    lineTotal: l.quantity * l.unitCents,
  }));
  const total = priced.reduce((s, l) => s + l.lineTotal, 0);
  if (total <= 0) throw new ValidationError("Invoice total must be positive");

  const existing = await client.invoice.findUnique({
    where: { idempotencyKey: parsed.idempotencyKey },
    include: { lines: true },
  });
  if (existing) return existing;

  const customer = await client.client.findUnique({
    where: { id: parsed.clientId },
  });
  if (!customer) throw new NotFoundError("Client not found");
  if (await client.invoice.findUnique({ where: { number: parsed.number } })) {
    throw new ConflictError("Invoice number taken");
  }

  const [arId, revenueId] = await Promise.all([
    accountIdByCode(client, AR_CODE),
    accountIdByCode(client, REVENUE_CODE),
  ]);
  const issueKey = `i-${parsed.idempotencyKey}`;

  try {
    return await client.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          date: new Date(parsed.issueDate),
          description: `Invoice ${parsed.number} — ${customer.name}`,
          idempotencyKey: issueKey,
          lines: {
            create: [
              { accountId: arId, debit: total, credit: 0 },
              { accountId: revenueId, debit: 0, credit: total },
            ],
          },
        },
      });
      return tx.invoice.create({
        data: {
          clientId: parsed.clientId,
          number: parsed.number,
          status: "UNPAID",
          subtotalCents: total,
          totalCents: total,
          issueEntryId: entry.id,
          idempotencyKey: parsed.idempotencyKey,
          lines: {
            create: priced.map((l) => ({
              description: l.description,
              quantity: l.quantity,
              unitCents: l.unitCents,
              lineTotal: l.lineTotal,
            })),
          },
        },
        include: { lines: true },
      });
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      const retry = await client.invoice.findUnique({
        where: { idempotencyKey: parsed.idempotencyKey },
        include: { lines: true },
      });
      if (retry) return retry;
      throw new ConflictError("Invoice number taken");
    }
    throw e;
  }
}

export async function markPaid(
  input: MarkPaidInput,
  client: Client = db,
) {
  const parsed = MarkPaidSchema.parse(input);
  const payKey = `p-${parsed.idempotencyKey}`;

  const invoice = await client.invoice.findUnique({
    where: { id: parsed.invoiceId },
    include: { paymentEntry: true },
  });
  if (!invoice) throw new NotFoundError("Invoice not found");
  if (invoice.status === "VOID") throw new ConflictError("Invoice is void");
  if (invoice.status === "DRAFT") {
    throw new ConflictError("Invoice is not posted");
  }
  if (invoice.status === "PAID") {
    if (invoice.paymentEntry?.idempotencyKey === payKey) {
      return client.invoice.findUniqueOrThrow({
        where: { id: invoice.id },
        include: { lines: true },
      });
    }
    throw new ConflictError("Invoice is already paid");
  }

  const [cashId, arId] = await Promise.all([
    accountIdByCode(client, CASH_CODE),
    accountIdByCode(client, AR_CODE),
  ]);

  try {
    return await client.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          date: new Date(),
          description: `Payment ${invoice.number} — ${invoice.totalCents}c`,
          idempotencyKey: payKey,
          lines: {
            create: [
              { accountId: cashId, debit: invoice.totalCents, credit: 0 },
              { accountId: arId, debit: 0, credit: invoice.totalCents },
            ],
          },
        },
      });
      return tx.invoice.update({
        where: { id: invoice.id },
        data: { status: "PAID", paymentEntryId: entry.id },
        include: { lines: true },
      });
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      const byKey = await client.journalEntry.findUnique({
        where: { idempotencyKey: payKey },
      });
      if (byKey) {
        if (invoice.paymentEntryId && invoice.paymentEntryId !== byKey.id) {
          throw new ConflictError("Invoice is already paid");
        }
        return client.invoice.update({
          where: { id: invoice.id },
          data: { status: "PAID", paymentEntryId: byKey.id },
          include: { lines: true },
        });
      }
      throw new ConflictError("Invoice is already paid");
    }
    throw e;
  }
}

export async function voidInvoice(
  input: VoidInvoiceInput,
  client: Client = db,
) {
  const parsed = VoidInvoiceSchema.parse(input);
  const voidKey1 = `v1-${parsed.idempotencyKey}`;
  const voidKey2 = `v2-${parsed.idempotencyKey}`;

  const invoice = await client.invoice.findUnique({
    where: { id: parsed.invoiceId },
    include: {
      issueEntry: { include: { lines: true, reversedBy: true } },
      paymentEntry: { include: { lines: true, reversedBy: true } },
    },
  });
  if (!invoice) throw new NotFoundError("Invoice not found");
  if (invoice.status === "VOID") {
    const prior = await client.journalEntry.findUnique({
      where: { idempotencyKey: voidKey1 },
    });
    if (prior) {
      return client.invoice.findUniqueOrThrow({
        where: { id: invoice.id },
        include: { lines: true },
      });
    }
    throw new ConflictError("Invoice is already void");
  }
  if (invoice.status === "DRAFT") {
    return client.invoice.update({
      where: { id: invoice.id },
      data: { status: "VOID" },
      include: { lines: true },
    });
  }

  const issue = invoice.issueEntry;
  if (!issue) throw new ConflictError("Invoice has no issue entry");
  if (issue.reversedBy) throw new ConflictError("Invoice is already void");
  if (invoice.paymentEntry?.reversedBy) {
    throw new ConflictError("Invoice payment already reversed");
  }

  return client.$transaction(async (tx) => {
    await tx.journalEntry.create({
      data: {
        date: new Date(),
        description: `Void ${invoice.number}: ${parsed.reason}`,
        idempotencyKey: voidKey1,
        reversesId: issue.id,
        lines: {
          create: issue.lines.map((l) => ({
            accountId: l.accountId,
            debit: l.credit,
            credit: l.debit,
          })),
        },
      },
    });
    if (invoice.paymentEntry) {
      await tx.journalEntry.create({
        data: {
          date: new Date(),
          description: `Void payment ${invoice.number}: ${parsed.reason}`,
          idempotencyKey: voidKey2,
          reversesId: invoice.paymentEntry.id,
          lines: {
            create: invoice.paymentEntry.lines.map((l) => ({
              accountId: l.accountId,
              debit: l.credit,
              credit: l.debit,
            })),
          },
        },
      });
    }
    return tx.invoice.update({
      where: { id: invoice.id },
      data: { status: "VOID" },
      include: { lines: true },
    });
  });
}

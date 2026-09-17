import { $ } from "bun";
import { unlink } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";
import {
  createClient,
  markPaid,
  postInvoice,
  voidInvoice,
} from "./invoicing";
import { ConflictError, NotFoundError, profitAndLoss, trialBalance } from "./ledger";

const TEST_URL = "file:./prisma/invoicing.test.db";
let testDb: PrismaClient;
let keySeq = 0;
const key = () => `tinvkey000000000000000000${String(keySeq++).padStart(3, "0")}`;
let clientId = "";

async function seedClient(email = "sam@example.com") {
  const c = await createClient(
    { name: "Sam", email, notes: "retainer" },
    testDb,
  );
  return c.id;
}

function invoiceInput(overrides: Record<string, unknown> = {}) {
  return {
    clientId,
    number: `INV-${keySeq}-${Date.now()}`,
    lines: [
      { description: "Design", quantity: 2, unitCents: 50000 },
      { description: "Review", quantity: 1, unitCents: 25000 },
    ],
    issueDate: new Date().toISOString(),
    idempotencyKey: key(),
    ...overrides,
  };
}

beforeAll(async () => {
  await unlink("prisma/invoicing.test.db").catch(() => {});
  await unlink("prisma/invoicing.test.db-journal").catch(() => {});
  await $`bunx prisma db push --url ${TEST_URL}`.quiet();
  testDb = new PrismaClient({ adapter: new PrismaLibSql({ url: TEST_URL }) });
  await testDb.account.createMany({
    data: [
      { code: "1000", name: "Cash", type: "ASSET" },
      { code: "1200", name: "AR", type: "ASSET" },
      { code: "4000", name: "Income", type: "REVENUE" },
    ],
  });
  clientId = await seedClient();
}, 60_000);

afterAll(async () => {
  await testDb.$disconnect();
  await unlink("prisma/invoicing.test.db").catch(() => {});
  await unlink("prisma/invoicing.test.db-journal").catch(() => {});
});

describe("clients (AC-1)", () => {
  test("persists a client with unique email", async () => {
    const c = await createClient(
      { name: "Ana", email: `ana-${keySeq}@ex.com` },
      testDb,
    );
    expect(c.id).toBeString();
  });

  test("duplicate email is rejected", async () => {
    await expect(
      createClient({ name: "Sam2", email: "sam@example.com" }, testDb),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("postInvoice (AC-2)", () => {
  test("computes totals and posts a balanced AR/Revenue journal", async () => {
    const inv = await postInvoice(invoiceInput(), testDb);
    expect(inv.status).toBe("UNPAID");
    expect(inv.totalCents).toBe(125000);
    expect(inv.lines).toHaveLength(2);

    const entry = await testDb.journalEntry.findUniqueOrThrow({
      where: { id: inv.issueEntryId! },
      include: { lines: true },
    });
    const debits = entry.lines.reduce((s, l) => s + l.debit, 0);
    const credits = entry.lines.reduce((s, l) => s + l.credit, 0);
    expect(debits).toBe(credits);
    expect(debits).toBe(125000);

    const tb = await trialBalance(testDb);
    expect(tb.balanced).toBe(true);
  });

  test("unknown client fails with NotFoundError", async () => {
    await expect(
      postInvoice(
        invoiceInput({ clientId: "ckv0w0abcde000000000009999" }),
        testDb,
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("duplicate number is rejected", async () => {
    const first = await postInvoice(invoiceInput({ number: "INV-DUP-1" }), testDb);
    expect(first.number).toBe("INV-DUP-1");
    await expect(
      postInvoice(invoiceInput({ number: "INV-DUP-1" }), testDb),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  test("same idempotency key returns the original", async () => {
    const idem = key();
    const a = await postInvoice(invoiceInput({ idempotencyKey: idem }), testDb);
    const b = await postInvoice(
      invoiceInput({ idempotencyKey: idem, number: "INV-OTHER" }),
      testDb,
    );
    expect(b.id).toBe(a.id);
  });

  test("zero total is rejected", async () => {
    await expect(
      postInvoice(
        invoiceInput({
          lines: [{ description: "Free", quantity: 1, unitCents: 0 }],
        }),
        testDb,
      ),
    ).rejects.toThrow();
  });
});

describe("markPaid (AC-3)", () => {
  test("clears AR into cash and flips status", async () => {
    const inv = await postInvoice(invoiceInput(), testDb);
    const paid = await markPaid({ invoiceId: inv.id, idempotencyKey: key() }, testDb);
    expect(paid.status).toBe("PAID");

    const pay = await testDb.journalEntry.findUniqueOrThrow({
      where: { id: paid.paymentEntryId! },
      include: { lines: true },
    });
    expect(pay.lines.reduce((s, l) => s + l.debit, 0)).toBe(inv.totalCents);
  });

  test("double pay is rejected", async () => {
    const inv = await postInvoice(invoiceInput(), testDb);
    await markPaid({ invoiceId: inv.id, idempotencyKey: key() }, testDb);
    await expect(
      markPaid({ invoiceId: inv.id, idempotencyKey: key() }, testDb),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  test("same pay idempotency key is idempotent", async () => {
    const inv = await postInvoice(invoiceInput(), testDb);
    const idem = key();
    const a = await markPaid({ invoiceId: inv.id, idempotencyKey: idem }, testDb);
    const b = await markPaid({ invoiceId: inv.id, idempotencyKey: idem }, testDb);
    expect(b.paymentEntryId).toBe(a.paymentEntryId);
  });
});

describe("voidInvoice (AC-4) + reports (AC-5)", () => {
  test("void of unpaid appends a reversal and keeps the original", async () => {
    const inv = await postInvoice(invoiceInput(), testDb);
    const voided = await voidInvoice(
      { invoiceId: inv.id, reason: "cancelled", idempotencyKey: key() },
      testDb,
    );
    expect(voided.status).toBe("VOID");
    const rev = await testDb.journalEntry.findFirstOrThrow({
      where: { reversesId: inv.issueEntryId! },
    });
    expect(rev.id).toBeString();
  });

  test("void of paid reverses both legs", async () => {
    const inv = await postInvoice(invoiceInput(), testDb);
    const paid = await markPaid({ invoiceId: inv.id, idempotencyKey: key() }, testDb);
    const voided = await voidInvoice(
      { invoiceId: inv.id, reason: "refund", idempotencyKey: key() },
      testDb,
    );
    expect(voided.status).toBe("VOID");
    const reversals = await testDb.journalEntry.count({
      where: {
        OR: [
          { reversesId: inv.issueEntryId! },
          { reversesId: paid.paymentEntryId! },
        ],
      },
    });
    expect(reversals).toBe(2);
  });

  test("P&L recognizes revenue at issue (accrual)", async () => {
    const before = await profitAndLoss(testDb);
    const inv = await postInvoice(invoiceInput(), testDb);
    const after = await profitAndLoss(testDb);
    expect(after.revenue - before.revenue).toBe((inv as unknown as { baseTotalCents: number }).baseTotalCents ?? inv.totalCents);
  });
});

describe("multi-currency FX (M6 AC-1..AC-3)", () => {
  test("EUR invoice posts foreign and base, journal in base", async () => {
    const inv = await postInvoice(
      invoiceInput({ currency: "EUR", fxRateBps: 10800, lines: [{ description: "EUR work", quantity: 1, unitCents: 10000 }] }),
      testDb,
    );
    expect(inv.currency).toBe("EUR");
    expect(inv.fxRateBps).toBe(10800);
    expect(inv.totalCents).toBe(10000);
    expect((inv as unknown as { baseTotalCents: number }).baseTotalCents).toBe(10800);
    const entry = await testDb.journalEntry.findUniqueOrThrow({ where: { id: inv.issueEntryId! }, include: { lines: true } });
    const debits = entry.lines.reduce((s, l) => s + l.debit, 0);
    const credits = entry.lines.reduce((s, l) => s + l.credit, 0);
    expect(debits).toBe(10800);
    expect(credits).toBe(10800);
    const tb = await trialBalance(testDb);
    expect(tb.balanced).toBe(true);
  });

  test("USD with non-1.00 fxRate is rejected", async () => {
    await expect(
      postInvoice(invoiceInput({ currency: "USD", fxRateBps: 10800 }), testDb),
    ).rejects.toThrow();
  });

  test("fxRate out of range is rejected", async () => {
    await expect(postInvoice(invoiceInput({ currency: "EUR", fxRateBps: 999 }), testDb)).rejects.toThrow();
    await expect(postInvoice(invoiceInput({ currency: "EUR", fxRateBps: 50001 }), testDb)).rejects.toThrow();
  });

  test("same idempotency with FX returns original", async () => {
    const idem = key();
    const a = await postInvoice(invoiceInput({ idempotencyKey: idem, currency: "GBP", fxRateBps: 12500, lines: [{ description: "GBP", quantity: 1, unitCents: 20000 }] }), testDb);
    const b = await postInvoice(invoiceInput({ idempotencyKey: idem, number: "INV-OTHER-FX" }), testDb);
    expect(b.id).toBe(a.id);
  });
});

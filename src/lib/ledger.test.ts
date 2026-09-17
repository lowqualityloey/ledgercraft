import { $ } from "bun";
import { unlink } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";
import {
  ConflictError,
  NotFoundError,
  postJournal,
  profitAndLoss,
  reverseEntry,
  trialBalance,
} from "./ledger";

const TEST_URL = "file:./prisma/ledger.test.db";
let testDb: PrismaClient;
let CASH = "";
let INCOME = "";
let RENT = "";

let keySeq = 0;
const key = () => `ckv0w0abcde0001000000000${String(keySeq++).padStart(2, "0")}`;

beforeAll(async () => {
  await unlink("prisma/ledger.test.db").catch(() => {});
  await unlink("prisma/ledger.test.db-journal").catch(() => {});
  await $`bunx prisma db push --url ${TEST_URL}`.quiet();
  testDb = new PrismaClient({ adapter: new PrismaLibSql({ url: TEST_URL }) });

  const cash = await testDb.account.create({
    data: { code: "1000", name: "Cash", type: "ASSET" },
  });
  const income = await testDb.account.create({
    data: { code: "4000", name: "Income", type: "REVENUE" },
  });
  const rent = await testDb.account.create({
    data: { code: "5000", name: "Rent", type: "EXPENSE" },
  });
  CASH = cash.id;
  INCOME = income.id;
  RENT = rent.id;
}, 60_000);

afterAll(async () => {
  await testDb.$disconnect();
  await unlink("prisma/ledger.test.db").catch(() => {});
  await unlink("prisma/ledger.test.db-journal").catch(() => {});
});

describe("postJournal (INV-01, INV-02)", () => {
  test("persists a balanced entry atomically", async () => {
    const entry = await postJournal(
      {
        date: new Date().toISOString(),
        description: "Client payment",
        idempotencyKey: key(),
        lines: [
          { accountId: CASH, debit: 150000, credit: 0 },
          { accountId: INCOME, debit: 0, credit: 150000 },
        ],
      },
      testDb,
    );
    expect(entry.lines).toHaveLength(2);
    const count = await testDb.journalEntry.count();
    expect(count).toBeGreaterThan(0);
  });

  test("unbalanced input fails closed — zero rows written", async () => {
    const before = await testDb.journalEntry.count();
    await expect(
      postJournal(
        {
          date: new Date().toISOString(),
          description: "Bad entry",
          idempotencyKey: key(),
          lines: [
            { accountId: CASH, debit: 1000, credit: 0 },
            { accountId: INCOME, debit: 0, credit: 999 },
          ],
        },
        testDb,
      ),
    ).rejects.toThrow();
    expect(await testDb.journalEntry.count()).toBe(before);
  });

  test("unknown account fails with NotFoundError", async () => {
    await expect(
      postJournal(
        {
          date: new Date().toISOString(),
          description: "Ghost",
          idempotencyKey: key(),
          lines: [
            { accountId: CASH, debit: 100, credit: 0 },
            { accountId: "ckv0w0abcde000000000009999", debit: 0, credit: 100 },
          ],
        },
        testDb,
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("same idempotency key returns the original (no duplicate)", async () => {
    const idem = key();
    const input = {
      date: new Date().toISOString(),
      description: "Double click",
      idempotencyKey: idem,
      lines: [
        { accountId: CASH, debit: 500, credit: 0 },
        { accountId: INCOME, debit: 0, credit: 500 },
      ],
    };
    const first = await postJournal(input, testDb);
    const second = await postJournal(input, testDb);
    expect(second.id).toBe(first.id);
  });
});

describe("reverseEntry (INV-03)", () => {
  test("appends an inverted linked reversal; original untouched", async () => {
    const original = await postJournal(
      {
        date: new Date().toISOString(),
        description: "Wrong account",
        idempotencyKey: key(),
        lines: [
          { accountId: RENT, debit: 20000, credit: 0 },
          { accountId: CASH, debit: 0, credit: 20000 },
        ],
      },
      testDb,
    );

    const reversal = await reverseEntry(
      { entryId: original.id, reason: "Should be supplies", idempotencyKey: key() },
      testDb,
    );
    expect(reversal.reversesId).toBe(original.id);
    expect(reversal.lines).toHaveLength(2);

    const reloaded = await testDb.journalEntry.findUniqueOrThrow({
      where: { id: original.id },
      include: { lines: true },
    });
    expect(reloaded.description).toBe("Wrong account"); // never mutated
    expect(reloaded.lines).toHaveLength(2);
  });

  test("double reversal is rejected", async () => {
    const original = await postJournal(
      {
        date: new Date().toISOString(),
        description: "Once",
        idempotencyKey: key(),
        lines: [
          { accountId: RENT, debit: 1000, credit: 0 },
          { accountId: CASH, debit: 0, credit: 1000 },
        ],
      },
      testDb,
    );
    await reverseEntry(
      { entryId: original.id, reason: "First", idempotencyKey: key() },
      testDb,
    );
    await expect(
      reverseEntry(
        { entryId: original.id, reason: "Second", idempotencyKey: key() },
        testDb,
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("reports", () => {
  test("trial balance balances; P&L nets revenue minus expenses", async () => {
    const tb = await trialBalance(testDb);
    expect(tb.balanced).toBe(true);
    expect(tb.totalDebits).toBe(tb.totalCredits);
    expect(tb.totalDebits).toBeGreaterThan(0);

    const pnl = await profitAndLoss(testDb);
    expect(pnl.net).toBe(pnl.revenue - pnl.expenses);
  });
});

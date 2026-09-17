import { $ } from "bun";
import { unlink } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";
import {
  createBatch,
  fingerprint,
  parseCsv,
  postDrafts,
  rowKey,
} from "./csvImport";
import { ConflictError, NotFoundError, trialBalance } from "./ledger";

const TEST_URL = "file:./prisma/csvimport.test.db";
let testDb: PrismaClient;
let keySeq = 0;
const key = () => `tcsvkey000000000000000000${String(keySeq++).padStart(3, "0")}`;
let MISC = "";
let CASH = "";

const AMOUNT_CSV = `date,description,amount
2026-09-01,Acme retainer,1500.00
2026-09-02,"Office, supplies",-42.50
2026-09-03,Coffee,-3.25`;

// Unique-content variants (dedup is by exact bytes, so each
// createBatch call needs distinct content).
const uniqAmount = (tag: string) => AMOUNT_CSV.replace("Coffee", `Coffee ${tag}`);
const uniqSplit = (tag: string) => SPLIT_CSV.replace("Client pay", `Client pay ${tag}`);

const SPLIT_CSV = `date,description,debit,credit
2026-09-01,Client pay,,2000.00
2026-09-02,Rent,800.00,`;

beforeAll(async () => {
  await unlink("prisma/csvimport.test.db").catch(() => {});
  await unlink("prisma/csvimport.test.db-journal").catch(() => {});
  await $`bunx prisma db push --url ${TEST_URL}`.quiet();
  testDb = new PrismaClient({ adapter: new PrismaLibSql({ url: TEST_URL }) });
  const cash = await testDb.account.create({ data: { code: "1000", name: "Cash", type: "ASSET" } });
  await testDb.account.create({ data: { code: "4000", name: "Income", type: "REVENUE" } });
  const misc = await testDb.account.create({ data: { code: "5900", name: "Misc", type: "EXPENSE" } });
  CASH = cash.id;
  MISC = misc.id;
}, 60_000);

afterAll(async () => {
  await testDb.$disconnect();
  await unlink("prisma/csvimport.test.db").catch(() => {});
  await unlink("prisma/csvimport.test.db-journal").catch(() => {});
});

describe("parseCsv (AC-1)", () => {
  test("amount shape parses signs and quoted commas", () => {
    const rows = parseCsv(AMOUNT_CSV);
    expect(rows).toHaveLength(3);
    expect(rows[0].amountCents).toBe(150000);
    expect(rows[1].description).toBe("Office, supplies");
    expect(rows[1].amountCents).toBe(-4250);
  });

  test("debit/credit shape maps to signed cents", () => {
    const rows = parseCsv(SPLIT_CSV);
    expect(rows[0].amountCents).toBe(200000);
    expect(rows[1].amountCents).toBe(-80000);
  });

  test("MM/DD/YYYY dates parse", () => {
    const rows = parseCsv("date,description,amount\n09/05/2026,Pay,10.00");
    expect(rows[0].dateISO.startsWith("2026-09-05")).toBe(true);
  });
});

describe("parse failures (AC-2)", () => {
  test("bad amount names the row and persists nothing", async () => {
    const before = await testDb.importBatch.count();
    const bad = "date,description,amount\n2026-09-01,Ok,10.00\n2026-09-02,Bad,abc";
    expect(() => parseCsv(bad)).toThrow(/Row 3/);
    await expect(
      createBatch({ filename: "bad.csv", content: bad, idempotencyKey: key() }, testDb),
    ).rejects.toThrow(/Row 3/);
    expect(await testDb.importBatch.count()).toBe(before);
  });

  test("bad header is rejected", () => {
    expect(() => parseCsv("a,b,c\n1,2,3")).toThrow(/Row 1/);
  });

  test("zero amount is rejected", () => {
    expect(() => parseCsv("date,description,amount\n2026-09-01,Free,0.00")).toThrow(/zero/);
  });

  test("row cap is enforced", () => {
    const big = ["date,description,amount"];
    for (let i = 0; i < 501; i++) big.push(`2026-09-01,R${i},1.00`);
    expect(() => parseCsv(big.join("\n"))).toThrow(/Too many rows/);
  });
});

describe("batches + dedup (AC-4)", () => {
  test("same bytes twice → ConflictError, no duplicate batch", async () => {
    const content = `date,description,amount\n2026-09-01,Dedup,${keySeq}.00`;
    const first = await createBatch({ filename: "a.csv", content, idempotencyKey: key() }, testDb);
    expect(first.status).toBe("DRAFT");
    await expect(
      createBatch({ filename: "b.csv", content, idempotencyKey: key() }, testDb),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(await testDb.importBatch.count({ where: { fileHash: fingerprint(content) } })).toBe(1);
  });

  test("row keys are stable and short", () => {
    expect(rowKey("ab".repeat(32), 3)).toBe("imp-abababab:3");
  });
});

describe("postDrafts (AC-3)", () => {
  test("posts selected rows as balanced journals; skips unchecked", async () => {
    const csv = uniqAmount("post");
    const batch = await createBatch({ filename: "post.csv", content: csv, idempotencyKey: key() }, testDb);
    const before = await testDb.journalEntry.count();
    const updated = await postDrafts(
      {
        batchId: batch.id,
        content: csv,
        selections: [
          { index: 0, offsetAccountId: MISC, include: true },
          { index: 1, offsetAccountId: MISC, include: true },
          { index: 2, offsetAccountId: MISC, include: false },
        ],
      },
      testDb,
    );
    expect(updated.status).toBe("POSTED");
    expect(updated.postedCount).toBe(2);
    expect(await testDb.journalEntry.count()).toBe(before + 2);
    const tb = await trialBalance(testDb);
    expect(tb.balanced).toBe(true);
  });

  test("money-in debits cash; money-out credits cash", async () => {
    const csv = uniqAmount("legs");
    const batch = await createBatch({ filename: "legs.csv", content: csv, idempotencyKey: key() }, testDb);
    await postDrafts(
      {
        batchId: batch.id,
        content: csv,
        selections: [
          { index: 0, offsetAccountId: MISC, include: true },
          { index: 1, offsetAccountId: MISC, include: true },
          { index: 2, offsetAccountId: MISC, include: false },
        ],
      },
      testDb,
    );
    const entries = await testDb.journalEntry.findMany({
      where: { description: { startsWith: "Import legs.csv" } },
      include: { lines: true },
      orderBy: { description: "asc" },
    });
    expect(entries).toHaveLength(2);
    const cashLegIn = entries[0].lines.find((l) => l.accountId === CASH)!;
    expect(cashLegIn.debit).toBe(150000);
    const cashLegOut = entries[1].lines.find((l) => l.accountId === CASH)!;
    expect(cashLegOut.credit).toBe(4250);
  });

  test("double post is idempotent (entry count unchanged)", async () => {
    const csv = uniqSplit("twice");
    const batch = await createBatch({ filename: "twice.csv", content: csv, idempotencyKey: key() }, testDb);
    const sel = {
      batchId: batch.id,
      content: csv,
      selections: [
        { index: 0, offsetAccountId: MISC, include: true },
        { index: 1, offsetAccountId: MISC, include: true },
      ],
    };
    await postDrafts(sel, testDb);
    const after = await testDb.journalEntry.count();
    await postDrafts(sel, testDb);
    expect(await testDb.journalEntry.count()).toBe(after);
  });

  test("unknown offset account fails with NotFoundError", async () => {
    const csv = uniqAmount("ghost");
    const batch = await createBatch({ filename: "ghost.csv", content: csv, idempotencyKey: key() }, testDb);
    await expect(
      postDrafts(
        {
          batchId: batch.id,
          content: csv,
          selections: [{ index: 0, offsetAccountId: "ckv0w0abcde000000000009999", include: true }],
        },
        testDb,
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("changed content is rejected", async () => {
    const csv = uniqAmount("drift");
    const batch = await createBatch({ filename: "drift.csv", content: csv, idempotencyKey: key() }, testDb);
    await expect(
      postDrafts(
        {
          batchId: batch.id,
          content: SPLIT_CSV,
          selections: [{ index: 0, offsetAccountId: MISC, include: true }],
        },
        testDb,
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

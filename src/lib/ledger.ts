import {
  Prisma,
  type PrismaClient,
} from "@/generated/prisma/client";
import { db } from "./db";
import {
  type PostJournalInput,
  PostJournalSchema,
  type ReverseJournalInput,
  ReverseJournalSchema,
} from "./journal";

// Deep module: all balance, atomicity, and reversal rules live here.
// UI and Server Actions call these functions; they never touch Prisma directly.

export class ValidationError extends Error {}
export class NotFoundError extends Error {}
export class ConflictError extends Error {}

type Client = PrismaClient;

function isUniqueViolation(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
  );
}

// Post a balanced journal atomically. Throws on unbalanced/invalid input
// BEFORE opening a transaction — nothing persists on failure (INV-01).
// Retrying with the same idempotencyKey returns the original entry.
export async function postJournal(
  input: PostJournalInput,
  client: Client = db,
) {
  const parsed = PostJournalSchema.parse(input);

  const ids = [...new Set(parsed.lines.map((l) => l.accountId))];
  const found = await client.account.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  if (found.length !== ids.length) {
    throw new NotFoundError("Unknown account in journal lines");
  }

  try {
    return await client.$transaction((tx) =>
      tx.journalEntry.create({
        data: {
          date: new Date(parsed.date),
          description: parsed.description,
          idempotencyKey: parsed.idempotencyKey,
          lines: {
            create: parsed.lines.map((l) => ({
              accountId: l.accountId,
              debit: l.debit,
              credit: l.credit,
            })),
          },
        },
        include: { lines: true },
      }),
    );
  } catch (e) {
    if (isUniqueViolation(e)) {
      const existing = await client.journalEntry.findUnique({
        where: { idempotencyKey: parsed.idempotencyKey },
        include: { lines: true },
      });
      if (existing) return existing;
    }
    throw e;
  }
}

// Correct a posted entry by appending an inverted reversal (INV-03).
// The original is never updated or deleted. Double reversal is rejected.
export async function reverseEntry(
  input: ReverseJournalInput,
  client: Client = db,
) {
  const parsed = ReverseJournalSchema.parse(input);

  const original = await client.journalEntry.findUnique({
    where: { id: parsed.entryId },
    include: { lines: true, reversedBy: true },
  });
  if (!original) throw new NotFoundError("Journal entry not found");
  if (original.reversedBy) {
    throw new ConflictError("Entry has already been reversed");
  }

  try {
    return await client.$transaction((tx) =>
      tx.journalEntry.create({
        data: {
          date: new Date(),
          description: `Reversal of ${original.description}: ${parsed.reason}`,
          idempotencyKey: parsed.idempotencyKey,
          reversesId: original.id,
          lines: {
            create: original.lines.map((l) => ({
              accountId: l.accountId,
              debit: l.credit,
              credit: l.debit,
            })),
          },
        },
        include: { lines: true },
      }),
    );
  } catch (e) {
    if (isUniqueViolation(e)) {
      const existing = await client.journalEntry.findUnique({
        where: { idempotencyKey: parsed.idempotencyKey },
        include: { lines: true },
      });
      if (existing) return existing;
    }
    throw e;
  }
}

export interface TrialBalanceRow {
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
}

export async function trialBalance(client: Client = db) {
  const [accounts, lines] = await Promise.all([
    client.account.findMany({ orderBy: { code: "asc" } }),
    client.journalLine.findMany({
      select: { accountId: true, debit: true, credit: true },
    }),
  ]);

  const sums = new Map<string, { debit: number; credit: number }>();
  for (const l of lines) {
    const s = sums.get(l.accountId) ?? { debit: 0, credit: 0 };
    s.debit += l.debit;
    s.credit += l.credit;
    sums.set(l.accountId, s);
  }

  const rows: TrialBalanceRow[] = accounts.map((a) => ({
    code: a.code,
    name: a.name,
    type: a.type,
    debit: sums.get(a.id)?.debit ?? 0,
    credit: sums.get(a.id)?.credit ?? 0,
  }));

  const totalDebits = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredits = rows.reduce((s, r) => s + r.credit, 0);
  return { rows, totalDebits, totalCredits, balanced: totalDebits === totalCredits };
}

export async function profitAndLoss(client: Client = db) {
  const lines = await client.journalLine.findMany({
    select: { debit: true, credit: true, account: { select: { type: true } } },
  });

  let revenue = 0;
  let expenses = 0;
  for (const l of lines) {
    if (l.account.type === "REVENUE") revenue += l.credit - l.debit;
    else if (l.account.type === "EXPENSE") expenses += l.debit - l.credit;
  }
  return { revenue, expenses, net: revenue - expenses };
}

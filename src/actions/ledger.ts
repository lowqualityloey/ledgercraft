"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import {
  ConflictError,
  NotFoundError,
  postJournal,
  profitAndLoss,
  reverseEntry,
  trialBalance,
} from "@/lib/ledger";
import { db } from "@/lib/db";
import { formatCents, parseDollarsToCents } from "@/lib/money";
import { requireSession } from "@/lib/session";

export interface ActionResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

function toError(e: unknown): string {
  if (e instanceof ZodError) {
    return e.issues.map((i) => i.message).join("; ");
  }
  if (
    e instanceof NotFoundError ||
    e instanceof ConflictError ||
    e instanceof Error
  ) {
    return e.message;
  }
  return "Unexpected error";
}

export async function listAccounts() {
  await requireSession();
  return db.account.findMany({ orderBy: { code: "asc" } });
}

export interface JournalFormLine {
  accountId: string;
  debit: string; // dollars as typed, e.g. "1,500.00"
  credit: string;
}

export async function createJournal(input: {
  date: string;
  description: string;
  lines: JournalFormLine[];
}): Promise<ActionResult<{ entryId: string }>> {
  await requireSession();
  try {
    const entry = await postJournal({
      date: new Date(input.date).toISOString(),
      description: input.description.trim(),
      idempotencyKey: crypto.randomUUID(),
      lines: input.lines.map((l) => ({
        accountId: l.accountId,
        debit: l.debit.trim() === "" ? 0 : parseDollarsToCents(l.debit),
        credit: l.credit.trim() === "" ? 0 : parseDollarsToCents(l.credit),
      })),
    });
    revalidatePath("/journal");
    revalidatePath("/");
    return { ok: true, data: { entryId: entry.id } };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}

export async function reverseJournal(input: {
  entryId: string;
  reason: string;
}): Promise<ActionResult<{ entryId: string }>> {
  await requireSession();
  try {
    const reversal = await reverseEntry({
      entryId: input.entryId,
      reason: input.reason.trim(),
      idempotencyKey: crypto.randomUUID(),
    });
    revalidatePath("/journal");
    revalidatePath("/");
    return { ok: true, data: { entryId: reversal.id } };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}

export async function getTrialBalance() {
  await requireSession();
  const tb = await trialBalance();
  return {
    ...tb,
    rows: tb.rows.map((r) => ({
      ...r,
      debitDisplay: formatCents(r.debit),
      creditDisplay: formatCents(r.credit),
    })),
    totalDebitsDisplay: formatCents(tb.totalDebits),
    totalCreditsDisplay: formatCents(tb.totalCredits),
  };
}

export async function getProfitAndLoss() {
  await requireSession();
  const pnl = await profitAndLoss();
  return {
    ...pnl,
    revenueDisplay: formatCents(pnl.revenue),
    expensesDisplay: formatCents(pnl.expenses),
    netDisplay: formatCents(pnl.net),
  };
}

export async function listRecentEntries(limit = 20) {
  await requireSession();
  return db.journalEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      lines: { include: { account: true } },
      reversedBy: { select: { id: true } },
    },
  });
}

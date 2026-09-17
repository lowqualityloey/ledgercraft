"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/lib/ledger";
import {
  createBatch,
  fingerprint,
  parseCsv,
  postDrafts,
  type CsvDraft,
} from "@/lib/csvImport";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
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
  revalidatePath("/imports");
  revalidatePath("/trial-balance");
  revalidatePath("/profit-loss");
  revalidatePath("/");
}

export interface DraftView extends CsvDraft {
  totalDisplay: string;
}

export async function uploadCsvAction(input: {
  filename: string;
  content: string;
}): Promise<
  ActionResult<{ batchId: string; fileHash: string; drafts: DraftView[] }>
> {
  await requireSession();
  try {
    const batch = await createBatch({
      filename: input.filename,
      content: input.content,
      idempotencyKey: crypto.randomUUID().replace(/-/g, "").slice(0, 32),
    });
    const drafts = parseCsv(input.content).map((d) => ({
      ...d,
      totalDisplay: formatCents(d.amountCents),
    }));
    touch();
    return {
      ok: true,
      data: { batchId: batch.id, fileHash: fingerprint(input.content), drafts },
    };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}

export async function postImportAction(input: {
  batchId: string;
  content: string;
  selections: { index: number; offsetAccountId: string; include: boolean }[];
}): Promise<ActionResult<{ postedCount: number }>> {
  await requireSession();
  try {
    const batch = await postDrafts(
      {
        batchId: input.batchId,
        content: input.content,
        selections: input.selections,
      },
      db,
    );
    touch();
    return { ok: true, data: { postedCount: batch.postedCount } };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}

export async function listBatches() {
  await requireSession();
  return db.importBatch.findMany({ orderBy: { createdAt: "desc" } });
}

import { createHash } from "node:crypto";
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
  postJournal,
} from "./ledger";

// Milestone 3: Bank CSV import (drafts unpersisted; batch tracks counts).
// All money movement goes through postJournal (INV-01, INV-02).
// No new dependencies: hand-rolled quoted-field parser for the narrow
// subset (date, description, amount | debit,credit). UI calls these via
// Server Actions; it never touches Prisma directly.

const CASH_CODE = "1000";
const MAX_BYTES = 1_000_000;
const MAX_ROWS = 500;

export const CsvUploadSchema = z.object({
  filename: z.string().min(1).max(120),
  content: z.string().min(1).max(MAX_BYTES),
  idempotencyKey: z.string().min(8).max(56),
});
export type CsvUploadInput = z.infer<typeof CsvUploadSchema>;

export const DraftSelectionSchema = z.object({
  index: z.number().int().nonnegative(),
  offsetAccountId: z.string().cuid(),
  include: z.boolean(),
});

export const PostDraftsSchema = z.object({
  batchId: z.string().cuid(),
  content: z.string().min(1).max(MAX_BYTES),
  selections: z.array(DraftSelectionSchema).min(1).max(MAX_ROWS),
});
export type PostDraftsInput = z.infer<typeof PostDraftsSchema>;

export interface CsvDraft {
  index: number;
  dateISO: string;
  description: string;
  amountCents: number; // signed: >0 money in, <0 money out
}

type Client = PrismaClient;

function isUniqueViolation(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
  );
}

export function fingerprint(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

// Minimal quoted-field CSV splitter (RFC 4180 subset): handles
// `"a, b"`, `""` escapes, and \r\n. Throws on unterminated quotes.
function splitRow(line: string, rowNum: number): string[] {
  const fields: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (quoted) throw new ValidationError(`Row ${rowNum}: unterminated quote`);
  fields.push(cur);
  return fields;
}

// Signed dollars ("-1,234.56", "($12.00)" NOT supported — plain minus only)
// to integer cents. Never float (INV-02).
export function parseSignedCents(raw: string, rowNum: number): number {
  const t = raw.trim().replace(/[$,\s]/g, "");
  const m = /^(-)?(\d+)(\.(\d{1,2}))?$/.exec(t);
  if (!m) throw new ValidationError(`Row ${rowNum}: bad amount ${JSON.stringify(raw)}`);
  const cents =
    Number(m[2]) * 100 + Number((m[4] ?? "").padEnd(2, "0"));
  return m[1] ? -cents : cents;
}

function parseDate(raw: string, rowNum: number): string {
  const t = raw.trim();
  let d: Date | null = null;
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    d = new Date(t);
  } else {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t);
    if (m) d = new Date(`${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}T00:00:00Z`);
  }
  if (!d || Number.isNaN(d.getTime())) {
    throw new ValidationError(`Row ${rowNum}: bad date ${JSON.stringify(raw)}`);
  }
  return d.toISOString();
}

export function parseCsv(content: string): CsvDraft[] {
  const lines = content.split(/\r?\n/);
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  if (lines.length < 2) throw new ValidationError("CSV needs a header plus ≥1 row");
  if (lines.length - 1 > MAX_ROWS) {
    throw new ValidationError(`Too many rows (max ${MAX_ROWS})`);
  }

  const header = splitRow(lines[0], 1).map((h) => h.trim().toLowerCase());
  const isAmount =
    header.length === 3 && header[0] === "date" && header[1] === "description" && header[2] === "amount";
  const isSplit =
    header.length === 4 && header[0] === "date" && header[1] === "description" && header[2] === "debit" && header[3] === "credit";
  if (!isAmount && !isSplit) {
    throw new ValidationError(
      "Row 1: header must be date,description,amount or date,description,debit,credit",
    );
  }

  const drafts: CsvDraft[] = [];
  for (let r = 2; r <= lines.length; r++) {
    const fields = splitRow(lines[r - 1], r);
    const want = isAmount ? 3 : 4;
    if (fields.length !== want) {
      throw new ValidationError(`Row ${r}: expected ${want} fields, got ${fields.length}`);
    }
    const dateISO = parseDate(fields[0], r);
    const description = fields[1].trim();
    if (!description) throw new ValidationError(`Row ${r}: empty description`);
    let amountCents: number;
    if (isAmount) {
      amountCents = parseSignedCents(fields[2], r);
    } else {
      // Empty side means zero (e.g. `Rent,800.00,`).
      const debit = fields[2].trim() === "" ? 0 : parseSignedCents(fields[2], r);
      const credit = fields[3].trim() === "" ? 0 : parseSignedCents(fields[3], r);
      if (debit < 0 || credit < 0) {
        throw new ValidationError(`Row ${r}: debit/credit must be non-negative`);
      }
      if ((debit > 0) === (credit > 0)) {
        throw new ValidationError(`Row ${r}: exactly one of debit/credit must be positive`);
      }
      amountCents = credit - debit; // credit = money in, debit = money out
    }
    if (amountCents === 0) throw new ValidationError(`Row ${r}: zero amount`);
    drafts.push({ index: drafts.length, dateISO, description, amountCents });
  }
  return drafts;
}

export function rowKey(fileHash: string, index: number): string {
  return `imp-${fileHash.slice(0, 8)}:${index}`;
}

export async function createBatch(
  input: CsvUploadInput,
  client: Client = db,
) {
  const parsed = CsvUploadSchema.parse(input);
  const drafts = parseCsv(parsed.content); // fail closed BEFORE persisting
  const hash = fingerprint(parsed.content);

  if (await client.importBatch.findUnique({ where: { fileHash: hash } })) {
    throw new ConflictError("File already imported");
  }

  try {
    return await client.importBatch.create({
      data: {
        filename: parsed.filename,
        fileHash: hash,
        rowCount: drafts.length,
        status: "DRAFT",
        idempotencyKey: parsed.idempotencyKey,
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      const retry = await client.importBatch.findUnique({
        where: { idempotencyKey: parsed.idempotencyKey },
      });
      if (retry) return retry;
      throw new ConflictError("File already imported");
    }
    throw e;
  }
}

async function accountIdByCode(client: Client, code: string): Promise<string> {
  const account = await client.account.findUnique({ where: { code } });
  if (!account) throw new NotFoundError(`Account ${code} not seeded`);
  return account.id;
}

export async function postDrafts(
  input: PostDraftsInput,
  client: Client = db,
) {
  const parsed = PostDraftsSchema.parse(input);

  const batch = await client.importBatch.findUnique({
    where: { id: parsed.batchId },
  });
  if (!batch) throw new NotFoundError("Import batch not found");
  const hash = fingerprint(parsed.content);
  if (hash !== batch.fileHash) {
    throw new ConflictError("Content changed since upload — re-upload the file");
  }

  const drafts = parseCsv(parsed.content);
  const byIndex = new Map(drafts.map((d) => [d.index, d]));
  const chosen = parsed.selections.filter((s) => s.include);
  if (chosen.length === 0) throw new ValidationError("Select at least one row");

  const offsetIds = [...new Set(chosen.map((s) => s.offsetAccountId))];
  const found = await client.account.findMany({
    where: { id: { in: offsetIds } },
    select: { id: true },
  });
  if (found.length !== offsetIds.length) {
    throw new NotFoundError("Unknown offset account in selection");
  }

  const cashId = await accountIdByCode(client, CASH_CODE);
  let posted = 0;
  for (const sel of chosen) {
    const draft = byIndex.get(sel.index);
    if (!draft) throw new ValidationError(`Unknown row index ${sel.index}`);
    const abs = Math.abs(draft.amountCents);
    const legs =
      draft.amountCents > 0
        ? [
            { accountId: cashId, debit: abs, credit: 0 },
            { accountId: sel.offsetAccountId, debit: 0, credit: abs },
          ]
        : [
            { accountId: sel.offsetAccountId, debit: abs, credit: 0 },
            { accountId: cashId, debit: 0, credit: abs },
          ];
    await postJournal(
      {
        date: draft.dateISO,
        description: `Import ${batch.filename} row ${draft.index + 1}: ${draft.description}`,
        idempotencyKey: rowKey(hash, draft.index),
        lines: legs,
      },
      client,
    );
    posted++;
  }

  return client.importBatch.update({
    where: { id: batch.id },
    data: { status: "POSTED", postedCount: posted },
  });
}

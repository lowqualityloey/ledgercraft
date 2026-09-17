import { z } from "zod";
import { MoneyCentsSchema } from "./money";

// INV-01: every transaction balances (sum debits == sum credits).
// INV-03: entries are append-only; corrections link via reversesId.

export const JournalLineSchema = z
  .object({
    accountId: z.string().cuid(),
    debit: MoneyCentsSchema,
    credit: MoneyCentsSchema,
  })
  .refine((l) => (l.debit > 0) !== (l.credit > 0), {
    message: "Each line must be debit XOR credit (exactly one side positive)",
  });

// Idempotency keys are opaque client-generated tokens (UUIDs); only
// account/entry ids must be cuid (they reference real rows).
export const IdempotencyKeySchema = z.string().min(8).max(64);

export const PostJournalSchema = z
  .object({
    date: z.string().datetime(),
    description: z.string().min(1).max(200),
    idempotencyKey: IdempotencyKeySchema,
    lines: z.array(JournalLineSchema).min(2),
  })
  .superRefine((v, ctx) => {
    const debits = v.lines.reduce((s, l) => s + l.debit, 0);
    const credits = v.lines.reduce((s, l) => s + l.credit, 0);
    if (debits === 0 || debits !== credits) {
      ctx.addIssue({
        code: "custom",
        message: `Unbalanced journal: debits ${debits} != credits ${credits}`,
      });
    }
  });

export type PostJournalInput = z.infer<typeof PostJournalSchema>;

export const ReverseJournalSchema = z.object({
  entryId: z.string().cuid(),
  reason: z.string().min(1).max(200),
  idempotencyKey: IdempotencyKeySchema,
});

export type ReverseJournalInput = z.infer<typeof ReverseJournalSchema>;

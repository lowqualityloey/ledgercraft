import { describe, expect, test } from "bun:test";
import { PostJournalSchema, ReverseJournalSchema } from "./journal";

const A = "ckv0w0abcde000000000000001";
const B = "ckv0w0abcde000000000000002";

function balanced() {
  return {
    date: new Date().toISOString(),
    description: "Client payment",
    idempotencyKey: "ckv0w0abcde000000000000099",
    lines: [
      { accountId: A, debit: 150000, credit: 0 },
      { accountId: B, debit: 0, credit: 150000 },
    ],
  };
}

describe("PostJournalSchema (INV-01)", () => {
  test("accepts a balanced journal", () => {
    expect(PostJournalSchema.safeParse(balanced()).success).toBe(true);
  });

  test("rejects unbalanced totals with hard error", () => {
    const input = balanced();
    input.lines[1].credit = 149999;
    const res = PostJournalSchema.safeParse(input);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.message).toMatch(/Unbalanced/);
    }
  });

  test("rejects zero-total journals", () => {
    const input = balanced();
    input.lines = [
      { accountId: A, debit: 0, credit: 0 },
      { accountId: B, debit: 0, credit: 0 },
    ];
    expect(PostJournalSchema.safeParse(input).success).toBe(false);
  });

  test("rejects lines with both/neither side set", () => {
    const both = balanced();
    both.lines[0] = { accountId: A, debit: 100, credit: 100 };
    expect(PostJournalSchema.safeParse(both).success).toBe(false);

    const neither = balanced();
    neither.lines[0] = { accountId: A, debit: 0, credit: 0 };
    expect(PostJournalSchema.safeParse(neither).success).toBe(false);
  });

  test("rejects float cents and <2 lines", () => {
    const floats = balanced();
    floats.lines[0].debit = 10.1;
    expect(PostJournalSchema.safeParse(floats).success).toBe(false);

    const single = balanced();
    single.lines = [{ accountId: A, debit: 100, credit: 0 }];
    expect(PostJournalSchema.safeParse(single).success).toBe(false);
  });
});

describe("ReverseJournalSchema (INV-03)", () => {
  test("requires entry, reason, and fresh idempotency key", () => {
    const ok = ReverseJournalSchema.safeParse({
      entryId: A,
      reason: "Wrong account",
      idempotencyKey: B,
    });
    expect(ok.success).toBe(true);
    expect(
      ReverseJournalSchema.safeParse({ entryId: A, reason: "", idempotencyKey: B })
        .success,
    ).toBe(false);
  });
});

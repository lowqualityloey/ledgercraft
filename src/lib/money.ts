import { z } from "zod";

// INV-02: money is integer minor units only. $10.00 = 1000. Never float.

export const MoneyCentsSchema = z.number().int().min(0);
export type MoneyCents = z.infer<typeof MoneyCentsSchema>;

// Parse user-entered dollars ("10.10", "1,234.56") to cents.
// Rejects floats-as-numbers, NaN, negatives, >2 decimals, and non-numeric junk.
export function parseDollarsToCents(input: string): number {
  const normalized = input.trim().replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`Invalid dollar amount: ${JSON.stringify(input)}`);
  }
  const [dollars, cents = ""] = normalized.split(".");
  return Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
}

// Cents back to display string ("1010" -> "10.10"). No float math.
export function formatCents(cents: number): string {
  if (!Number.isInteger(cents)) throw new Error("Cents must be an integer");
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.trunc(abs / 100);
  const rest = String(abs % 100).padStart(2, "0");
  return `${sign}${dollars}.${rest}`;
}

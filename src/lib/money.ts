import { z } from "zod";

// INV-02: money is integer minor units only. $10.00 = 1000. Never float.

export const MoneyCentsSchema = z.number().int().min(0);
export type MoneyCents = z.infer<typeof MoneyCentsSchema>;

// M6: currency + FX basis-points (10000 = 1.00, 4 decimals)
export const CurrencySchema = z.enum(["USD", "EUR", "GBP", "JPY", "CAD", "AUD"]);
export type Currency = z.infer<typeof CurrencySchema>;
export const CURRENCY_CODES = CurrencySchema.options as readonly string[];

export const FxRateBpsSchema = z.number().int().min(1000).max(50000); // 0.10 .. 5.00

export function convertCents(foreignCents: number, fxRateBps: number): number {
  if (!Number.isInteger(foreignCents) || foreignCents < 0) throw new Error("foreignCents must be integer >=0");
  if (!Number.isInteger(fxRateBps)) throw new Error("fxRateBps must be integer");
  FxRateBpsSchema.parse(fxRateBps);
  return Math.round((foreignCents * fxRateBps) / 10000);
}

export function parseFxRateToBps(input: string): number {
  const s = input.trim();
  if (!/^\d+(\.\d{1,4})?$/.test(s)) throw new Error(`Invalid FX rate: ${JSON.stringify(input)}`);
  const [whole, frac = ""] = s.split(".");
  const bps = Number(whole) * 10000 + Number(frac.padEnd(4, "0").slice(0, 4));
  return FxRateBpsSchema.parse(bps);
}

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

import { describe, expect, test } from "bun:test";
import {
  convertCents,
  CurrencySchema,
  MoneyCentsSchema,
  formatCents,
  parseDollarsToCents,
  parseFxRateToBps,
} from "./money";

describe("parseDollarsToCents", () => {
  test("parses exact decimal strings to cents", () => {
    expect(parseDollarsToCents("10.10")).toBe(1010);
    expect(parseDollarsToCents("10.00")).toBe(1000);
    expect(parseDollarsToCents("0.99")).toBe(99);
    expect(parseDollarsToCents("1,234.56")).toBe(123456);
    expect(parseDollarsToCents("$25")).toBe(2500);
  });

  test("rejects floats-as-numbers and junk (INV-02)", () => {
    // classic float trap: 10.10 + 20.20 !== 30.30 in binary FP
    expect(10.1 + 20.2 === 30.3).toBe(false);
    expect(() => parseDollarsToCents("10.123")).toThrow();
    expect(() => parseDollarsToCents("-5.00")).toThrow();
    expect(() => parseDollarsToCents("abc")).toThrow();
    expect(() => parseDollarsToCents("")).toThrow();
  });
});

describe("MoneyCentsSchema", () => {
  test("accepts non-negative integers only", () => {
    expect(MoneyCentsSchema.safeParse(1010).success).toBe(true);
    expect(MoneyCentsSchema.safeParse(0).success).toBe(true);
    expect(MoneyCentsSchema.safeParse(10.1).success).toBe(false);
    expect(MoneyCentsSchema.safeParse(-1).success).toBe(false);
    expect(MoneyCentsSchema.safeParse(NaN).success).toBe(false);
  });
});

describe("formatCents", () => {
  test("formats without float math", () => {
    expect(formatCents(1010)).toBe("10.10");
    expect(formatCents(99)).toBe("0.99");
    expect(formatCents(-250)).toBe("-2.50");
    expect(() => formatCents(10.5)).toThrow();
  });
});

describe("CurrencySchema / convertCents (M6)", () => {
  test("Currency enum 6 codes, USD default", () => {
    expect(CurrencySchema.safeParse("USD").success).toBe(true);
    expect(CurrencySchema.safeParse("EUR").success).toBe(true);
    expect(CurrencySchema.safeParse("JPY").success).toBe(true);
    expect(CurrencySchema.safeParse("CHF").success).toBe(false);
  });

  test("convertCents 10000 * 1.08 -> 10800", () => {
    expect(convertCents(10000, 10800)).toBe(10800);
    expect(convertCents(50000, 10800)).toBe(54000);
    expect(convertCents(0, 10800)).toBe(0);
  });

  test("convertCents rounding 1c * 1.005 (10050 bps) -> 1c", () => {
    expect(convertCents(1, 10050)).toBe(1); // 1*10050/10000=1.005 ->1
    expect(convertCents(100, 10050)).toBe(101); // 1.005*100=100.5 ->101
  });

  test("convertCents rejects bad FxRateBps", () => {
    expect(() => convertCents(10000, 999)).toThrow();
    expect(() => convertCents(10000, 50001)).toThrow();
    expect(() => convertCents(10000, 10.5 as unknown as number)).toThrow();
  });

  test("parseFxRateToBps", () => {
    expect(parseFxRateToBps("1.08")).toBe(10800);
    expect(parseFxRateToBps("1")).toBe(10000);
    expect(parseFxRateToBps("0.10")).toBe(1000);
    expect(parseFxRateToBps("1.0000")).toBe(10000);
    expect(() => parseFxRateToBps("abc")).toThrow();
    expect(() => parseFxRateToBps("1.12345")).toThrow();
  });
});

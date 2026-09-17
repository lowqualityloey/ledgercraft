import { describe, expect, test } from "bun:test";
import {
  MoneyCentsSchema,
  formatCents,
  parseDollarsToCents,
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

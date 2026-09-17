import { describe, expect, test } from "bun:test";
import {
  generateSessionToken,
  hashPassword,
  invalidateSession,
  createSession,
  sessionCookieOptions,
  sessionExpiresAt,
  validateSession,
  verifyPassword,
} from "./auth";
import { db } from "./db";

// Helper: isolated user per test via unique email
function emailFor(n: string) {
  return `auth-test-${n}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@ledgercraft.local`;
}

describe("auth hashing", () => {
  test("hash and verify round-trip", () => {
    const h = hashPassword("acct-pass-12345");
    expect(h).not.toBe("acct-pass-12345");
    expect(verifyPassword("acct-pass-12345", h)).toBe(true);
    expect(verifyPassword("wrong-pass", h)).toBe(false);
  });

  test("different passwords produce different hashes", () => {
    const h1 = hashPassword("password-a-123");
    const h2 = hashPassword("password-b-123");
    expect(h1).not.toBe(h2);
  });
});

describe("session token", () => {
  test("generateSessionToken is 64 hex", () => {
    const t = generateSessionToken();
    expect(t).toMatch(/^[0-9a-f]{64}$/);
    expect(generateSessionToken()).not.toBe(t);
  });

  test("sessionExpiresAt is ~7 days", () => {
    const base = new Date("2026-01-01T00:00:00.000Z");
    const exp = sessionExpiresAt(base);
    expect(exp.getTime() - base.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  test("sessionCookieOptions attrs", () => {
    const o = sessionCookieOptions();
    expect(o.httpOnly).toBe(true);
    expect(o.sameSite).toBe("lax");
    expect(o.path).toBe("/");
    expect(o.maxAge).toBe(7 * 24 * 60 * 60);
    // secure depends on NODE_ENV; just assert boolean
    expect(typeof o.secure).toBe("boolean");
  });
});

describe("session lifecycle (DB)", () => {
  test("create → validate → invalidate", async () => {
    const email = emailFor("lifecycle");
    const user = await db.user.create({
      data: { email, passwordHash: hashPassword("valid-pass-123"), role: "OWNER" },
    });
    const s = await createSession(user.id);
    expect(s.token).toMatch(/^[0-9a-f]{64}$/);

    const v = await validateSession(s.token);
    expect(v?.user.email).toBe(email);
    expect(v?.user.id).toBe(user.id);

    await invalidateSession(s.token);
    const v2 = await validateSession(s.token);
    expect(v2).toBeNull();

    // idempotent second invalidate
    await invalidateSession(s.token);
    await db.user.delete({ where: { id: user.id } });
  });

  test("expired session is treated as null", async () => {
    const email = emailFor("expired");
    const user = await db.user.create({
      data: { email, passwordHash: hashPassword("valid-pass-123"), role: "ACCOUNTANT" },
    });
    const token = generateSessionToken();
    await db.session.create({
      data: { token, userId: user.id, expiresAt: new Date(Date.now() - 1000) },
    });
    const v = await validateSession(token);
    expect(v).toBeNull();
    await db.session.deleteMany({ where: { token } });
    await db.user.delete({ where: { id: user.id } });
  });

  test("unknown token returns null", async () => {
    const v = await validateSession("0".repeat(64));
    expect(v).toBeNull();
  });

  test("empty token returns null", async () => {
    const v = await validateSession("");
    expect(v).toBeNull();
  });
});

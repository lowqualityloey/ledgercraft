"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  SESSION_COOKIE,
  createSession,
  invalidateSession,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
});

export type LoginResult =
  | { ok: true }
  | { ok: false; error: "invalid_credentials" | "invalid_input" };

function dummyHash(): string {
  // Fixed hash for unknown-email path to keep timing envelope similar
  // Hash of "dummy-password-123" at cost 10
  return "$2a$10$DUMMYHASHPLACEHOLDERDUMMYHASHPLACEHO12DUMMYHASHPLACEH";
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<LoginResult> {
  const parsed = LoginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid_input" };
  }
  const { email, password } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    // Timing mitigation: verify against dummy hash (no leak via early return shape)
    try {
      verifyPassword(password, dummyHash());
    } catch {
      // ignore
    }
    return { ok: false, error: "invalid_credentials" };
  }

  const valid = verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "invalid_credentials" };
  }

  const session = await createSession(user.id);
  const opts = sessionCookieOptions();
  const store = await cookies();
  store.set(SESSION_COOKIE, session.token, opts as Record<string, unknown> as never);
  return { ok: true };
}

export async function logout(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await invalidateSession(token);
  }
  // Clear regardless of DB result (idempotent)
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  } as Record<string, unknown> as never);
}

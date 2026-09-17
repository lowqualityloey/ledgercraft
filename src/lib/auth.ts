import { randomBytes } from "node:crypto";
import * as bcrypt from "bcryptjs";
import type { PrismaClient } from "@/generated/prisma/client";
import { db } from "./db";

const BCRYPT_COST = 10;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Client = PrismaClient;

export function hashPassword(password: string): string {
  // Synchronous bcryptjs to avoid native async quirks in Bun
  return bcrypt.hashSync(password, BCRYPT_COST);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex"); // 64 hex, 256-bit
}

export function sessionExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + SESSION_TTL_MS);
}

export const SESSION_COOKIE = "ledgercraft_session" as const;

export function sessionCookieOptions(): {
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}

// Opaque session lifecycle

export async function createSession(userId: string, client: Client = db) {
  const token = generateSessionToken();
  const expiresAt = sessionExpiresAt();
  const session = await client.session.create({
    data: { token, userId, expiresAt },
  });
  return session;
}

export async function validateSession(
  token: string,
  client: Client = db,
): Promise<{ user: { id: string; email: string; role: string } } | null> {
  if (!token) return null;
  const session = await client.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    // Lazy expiry: treat as invalid (caller may delete)
    return null;
  }
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
    },
  };
}

export async function invalidateSession(token: string, client: Client = db) {
  if (!token) return;
  await client.session.deleteMany({ where: { token } });
}

export async function invalidateUserSessions(userId: string, client: Client = db) {
  await client.session.deleteMany({ where: { userId } });
}

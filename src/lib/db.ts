import { existsSync, copyFileSync } from "node:fs";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown & { prisma?: PrismaClient };

function createClient(): PrismaClient {
  let url = process.env.DATABASE_URL ?? "file:./ledger.db";
  // Vercel: file:./ledger.db is read-only and not included (gitignored) → use /tmp
  // If /tmp/ledger.db missing but ./ledger.db exists (committed), copy it at runtime
  if (url === "file:/tmp/ledger.db" && !existsSync("/tmp/ledger.db") && existsSync("./ledger.db")) {
    try {
      copyFileSync("./ledger.db", "/tmp/ledger.db");
    } catch {
      // ignore, adapter will create empty file
    }
  }
  const adapter = new PrismaLibSql({ url });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

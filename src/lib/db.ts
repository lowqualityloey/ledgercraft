import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";
import { resolveDatasource } from "./datasource";

const globalForPrisma = globalThis as unknown & { prisma?: PrismaClient };

function createClient(): PrismaClient {
  // Local: SQLite file. Hosted: remote libSQL + auth token, so writes persist
  // across serverless instances (the container FS is ephemeral). See ./datasource.ts
  const adapter = new PrismaLibSql(resolveDatasource());
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

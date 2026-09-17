// LedgerCraft CoA seed — intake codes (idempotent via code upsert)
import { db } from "../src/lib/db";

const ACCOUNTS = [
  { code: "1000", name: "Cash / Bank", type: "ASSET" },
  { code: "1200", name: "Accounts Receivable", type: "ASSET" },
  { code: "1500", name: "Equipment", type: "ASSET" },
  { code: "2000", name: "Accounts Payable", type: "LIABILITY" },
  { code: "2100", name: "Credit Card Payable", type: "LIABILITY" },
  { code: "3000", name: "Owner Capital", type: "EQUITY" },
  { code: "3100", name: "Owner Draw", type: "EQUITY" },
  { code: "3900", name: "Retained Earnings", type: "EQUITY" },
  { code: "4000", name: "Client Income", type: "REVENUE" },
  { code: "4900", name: "Other Income", type: "REVENUE" },
  { code: "5000", name: "Rent", type: "EXPENSE" },
  { code: "5100", name: "Software", type: "EXPENSE" },
  { code: "5200", name: "Supplies", type: "EXPENSE" },
  { code: "5300", name: "Travel", type: "EXPENSE" },
  { code: "5900", name: "Miscellaneous", type: "EXPENSE" },
] as const;

for (const a of ACCOUNTS) {
  await db.account.upsert({
    where: { code: a.code },
    update: { name: a.name, type: a.type },
    create: { code: a.code, name: a.name, type: a.type },
  });
}

const count = await db.account.count();
console.log(`Seeded CoA: ${count} accounts`);
await db.$disconnect();

// LedgerCraft CoA seed — intake codes + M5 auth users (idempotent)
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";

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

// M5: seed owner + accountant (idempotent upsert, hash once)
const ownerEmail = process.env.SEED_OWNER_EMAIL ?? "owner@ledgercraft.local";
const ownerPass = process.env.SEED_OWNER_PASSWORD ?? "owner-pass-123";
const acctEmail = process.env.SEED_ACCOUNTANT_EMAIL ?? "accountant@ledgercraft.local";
const acctPass = process.env.SEED_ACCOUNTANT_PASSWORD ?? "acct-pass-12345";

await db.user.upsert({
  where: { email: ownerEmail },
  update: {},
  create: {
    email: ownerEmail,
    passwordHash: hashPassword(ownerPass),
    name: "Owner",
    role: "OWNER",
  },
});
await db.user.upsert({
  where: { email: acctEmail },
  update: {},
  create: {
    email: acctEmail,
    passwordHash: hashPassword(acctPass),
    name: "Accountant",
    role: "ACCOUNTANT",
  },
});
const uCount = await db.user.count();
console.log(`Seeded users: ${uCount} (owner=${ownerEmail}, accountant=${acctEmail})`);

await db.$disconnect();

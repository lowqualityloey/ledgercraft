-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "subtotalCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "fxRateBps" INTEGER NOT NULL DEFAULT 10000,
    "baseSubtotalCents" INTEGER NOT NULL DEFAULT 0,
    "baseTotalCents" INTEGER NOT NULL DEFAULT 0,
    "issueEntryId" TEXT,
    "paymentEntryId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_issueEntryId_fkey" FOREIGN KEY ("issueEntryId") REFERENCES "JournalEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_paymentEntryId_fkey" FOREIGN KEY ("paymentEntryId") REFERENCES "JournalEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("clientId", "createdAt", "id", "idempotencyKey", "issueEntryId", "number", "paymentEntryId", "status", "subtotalCents", "totalCents") SELECT "clientId", "createdAt", "id", "idempotencyKey", "issueEntryId", "number", "paymentEntryId", "status", "subtotalCents", "totalCents" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");
CREATE UNIQUE INDEX "Invoice_issueEntryId_key" ON "Invoice"("issueEntryId");
CREATE UNIQUE INDEX "Invoice_paymentEntryId_key" ON "Invoice"("paymentEntryId");
CREATE UNIQUE INDEX "Invoice_idempotencyKey_key" ON "Invoice"("idempotencyKey");
CREATE INDEX "Invoice_clientId_status_idx" ON "Invoice"("clientId", "status");
CREATE INDEX "Invoice_currency_idx" ON "Invoice"("currency");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "stripeSessionId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "stripePaymentIntentId" TEXT;

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stripeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_stripeSessionId_key" ON "Invoice"("stripeSessionId");
CREATE UNIQUE INDEX "StripeEvent_stripeId_key" ON "StripeEvent"("stripeId");
CREATE INDEX "StripeEvent_type_idx" ON "StripeEvent"("type");
CREATE INDEX "StripeEvent_createdAt_idx" ON "StripeEvent"("createdAt");

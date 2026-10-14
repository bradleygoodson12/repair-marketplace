-- CreateEnum
CREATE TYPE "BillingMode" AS ENUM ('PAY_PER_LEAD', 'SUBSCRIPTION');

-- AlterTable
ALTER TABLE "ProProfile" ADD COLUMN     "billingMode" "BillingMode" NOT NULL DEFAULT 'PAY_PER_LEAD';

-- CreateTable
CREATE TABLE "LeadUnlock" (
    "id" TEXT NOT NULL,
    "proProfileId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "stripeSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadUnlock_proProfileId_idx" ON "LeadUnlock"("proProfileId");

-- CreateIndex
CREATE INDEX "LeadUnlock_requestId_idx" ON "LeadUnlock"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadUnlock_proProfileId_requestId_key" ON "LeadUnlock"("proProfileId", "requestId");

-- AddForeignKey
ALTER TABLE "LeadUnlock" ADD CONSTRAINT "LeadUnlock_proProfileId_fkey" FOREIGN KEY ("proProfileId") REFERENCES "ProProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadUnlock" ADD CONSTRAINT "LeadUnlock_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: any pro who has ever had a subscription (active, past due,
-- or cancelled) is already on the subscription track — don't silently drop
-- them onto pay-per-lead just because this column didn't exist before.
UPDATE "ProProfile" SET "billingMode" = 'SUBSCRIPTION' WHERE "subscriptionStatus" != 'NONE';


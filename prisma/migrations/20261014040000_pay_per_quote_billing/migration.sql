-- AlterEnum
BEGIN;
CREATE TYPE "BillingMode_new" AS ENUM ('PAY_PER_QUOTE', 'SUBSCRIPTION');
ALTER TABLE "ProProfile" ALTER COLUMN "billingMode" DROP DEFAULT;
ALTER TABLE "ProProfile" ALTER COLUMN "billingMode" TYPE "BillingMode_new" USING (
  (CASE WHEN "billingMode"::text = 'PAY_PER_LEAD' THEN 'PAY_PER_QUOTE' ELSE "billingMode"::text END)::"BillingMode_new"
);
ALTER TYPE "BillingMode" RENAME TO "BillingMode_old";
ALTER TYPE "BillingMode_new" RENAME TO "BillingMode";
DROP TYPE "BillingMode_old";
ALTER TABLE "ProProfile" ALTER COLUMN "billingMode" SET DEFAULT 'PAY_PER_QUOTE';
COMMIT;

-- DropForeignKey
ALTER TABLE "LeadUnlock" DROP CONSTRAINT "LeadUnlock_proProfileId_fkey";

-- DropForeignKey
ALTER TABLE "LeadUnlock" DROP CONSTRAINT "LeadUnlock_requestId_fkey";

-- AlterTable
ALTER TABLE "ProProfile" ALTER COLUMN "billingMode" SET DEFAULT 'PAY_PER_QUOTE';

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "quoteFeePaidAt" TIMESTAMP(3),
ADD COLUMN     "quoteFeeRequiredCents" INTEGER,
ADD COLUMN     "stripeSessionId" TEXT;

-- DropTable
DROP TABLE "LeadUnlock";


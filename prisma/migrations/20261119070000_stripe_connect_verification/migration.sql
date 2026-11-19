-- AlterTable
ALTER TABLE "ProProfile" ADD COLUMN     "stripeConnectAccountId" TEXT,
ADD COLUMN     "stripeConnectDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeConnectVerifiedAt" TIMESTAMP(3);


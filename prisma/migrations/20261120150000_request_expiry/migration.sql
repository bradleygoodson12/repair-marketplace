-- AlterEnum
ALTER TYPE "RequestStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "expiryReminderSentAt" TIMESTAMP(3);


-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "ccEmails" TEXT[] DEFAULT ARRAY[]::TEXT[];


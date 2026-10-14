-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "clientEmail" TEXT,
ADD COLUMN     "clientName" TEXT,
ADD COLUMN     "clientPhone" TEXT,
ADD COLUMN     "postedAsAgent" BOOLEAN NOT NULL DEFAULT false;

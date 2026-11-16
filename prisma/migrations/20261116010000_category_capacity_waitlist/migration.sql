-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'OFFERED', 'EXPIRED', 'CLAIMED', 'DECLINED');

-- AlterTable
ALTER TABLE "ProProfile" ADD COLUMN     "serviceCity" TEXT,
ADD COLUMN     "serviceState" TEXT;

-- CreateTable
CREATE TABLE "CategoryWaitlistEntry" (
    "id" TEXT NOT NULL,
    "proProfileId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "offeredAt" TIMESTAMP(3),
    "offerExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryWaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryWaitlistEntry_categoryId_city_state_status_createdA_idx" ON "CategoryWaitlistEntry"("categoryId", "city", "state", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryWaitlistEntry_proProfileId_categoryId_city_state_key" ON "CategoryWaitlistEntry"("proProfileId", "categoryId", "city", "state");

-- CreateIndex
CREATE INDEX "ProProfile_serviceCity_serviceState_idx" ON "ProProfile"("serviceCity", "serviceState");

-- AddForeignKey
ALTER TABLE "CategoryWaitlistEntry" ADD CONSTRAINT "CategoryWaitlistEntry_proProfileId_fkey" FOREIGN KEY ("proProfileId") REFERENCES "ProProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryWaitlistEntry" ADD CONSTRAINT "CategoryWaitlistEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;


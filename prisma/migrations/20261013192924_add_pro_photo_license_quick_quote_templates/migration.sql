-- AlterTable
ALTER TABLE "ProProfile" ADD COLUMN     "licenseNumber" TEXT,
ADD COLUMN     "photoUrl" TEXT;

-- CreateTable
CREATE TABLE "QuickQuoteTemplate" (
    "id" TEXT NOT NULL,
    "proProfileId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "durationDays" INTEGER,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuickQuoteTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuickQuoteTemplate_proProfileId_idx" ON "QuickQuoteTemplate"("proProfileId");

-- AddForeignKey
ALTER TABLE "QuickQuoteTemplate" ADD CONSTRAINT "QuickQuoteTemplate_proProfileId_fkey" FOREIGN KEY ("proProfileId") REFERENCES "ProProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

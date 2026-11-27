-- AlterTable
ALTER TABLE "RepairDocument" ADD COLUMN     "referredByInspectorId" TEXT;

-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "referredByInspectorId" TEXT;

-- CreateTable
CREATE TABLE "InspectorPartner" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "logoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectorPartner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InspectorPartner_slug_key" ON "InspectorPartner"("slug");

-- CreateIndex
CREATE INDEX "RepairDocument_referredByInspectorId_idx" ON "RepairDocument"("referredByInspectorId");

-- CreateIndex
CREATE INDEX "ServiceRequest_referredByInspectorId_idx" ON "ServiceRequest"("referredByInspectorId");

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_referredByInspectorId_fkey" FOREIGN KEY ("referredByInspectorId") REFERENCES "InspectorPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairDocument" ADD CONSTRAINT "RepairDocument_referredByInspectorId_fkey" FOREIGN KEY ("referredByInspectorId") REFERENCES "InspectorPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

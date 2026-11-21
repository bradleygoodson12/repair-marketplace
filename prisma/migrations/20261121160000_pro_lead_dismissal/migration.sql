-- CreateTable
CREATE TABLE "ProLeadDismissal" (
    "id" TEXT NOT NULL,
    "proProfileId" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProLeadDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProLeadDismissal_serviceRequestId_idx" ON "ProLeadDismissal"("serviceRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "ProLeadDismissal_proProfileId_serviceRequestId_key" ON "ProLeadDismissal"("proProfileId", "serviceRequestId");

-- AddForeignKey
ALTER TABLE "ProLeadDismissal" ADD CONSTRAINT "ProLeadDismissal_proProfileId_fkey" FOREIGN KEY ("proProfileId") REFERENCES "ProProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProLeadDismissal" ADD CONSTRAINT "ProLeadDismissal_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "licenseRequired" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProProfile" ADD COLUMN     "licenseDocumentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "licenseRequired";

-- AlterTable
ALTER TABLE "ProProfile" ADD COLUMN     "isInsured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isLicensed" BOOLEAN NOT NULL DEFAULT false;


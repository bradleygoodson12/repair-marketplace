-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "invoiceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "warrantyUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];


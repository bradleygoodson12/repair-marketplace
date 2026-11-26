-- AlterTable
ALTER TABLE "ProProfile" ADD COLUMN     "lastReviewQualityAlertAt" TIMESTAMP(3),
ADD COLUMN     "lastDeclineRateAlertAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "proReply" TEXT,
ADD COLUMN     "proReplyAt" TIMESTAMP(3);

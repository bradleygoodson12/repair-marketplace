-- CreateEnum
CREATE TYPE "ChangeOrderStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- CreateTable
CREATE TABLE "ChangeOrder" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "additionalPriceCents" INTEGER NOT NULL,
    "status" "ChangeOrderStatus" NOT NULL DEFAULT 'PENDING',
    "feeRequiredCents" INTEGER,
    "feePaidAt" TIMESTAMP(3),
    "stripeSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChangeOrder_bookingId_idx" ON "ChangeOrder"("bookingId");

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CreateTable
CREATE TABLE "PortfolioPhoto" (
    "id" TEXT NOT NULL,
    "proProfileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortfolioPhoto_proProfileId_idx" ON "PortfolioPhoto"("proProfileId");

-- AddForeignKey
ALTER TABLE "PortfolioPhoto" ADD CONSTRAINT "PortfolioPhoto_proProfileId_fkey" FOREIGN KEY ("proProfileId") REFERENCES "ProProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry over any existing portfolioUrls into the new table before dropping
-- the column, preserving their original order.
INSERT INTO "PortfolioPhoto" ("id", "proProfileId", "url", "order")
SELECT gen_random_uuid()::text, "ProProfile"."id", url, (ordinality - 1)::int
FROM "ProProfile", unnest("ProProfile"."portfolioUrls") WITH ORDINALITY AS t(url, ordinality);

-- AlterTable
ALTER TABLE "ProProfile" DROP COLUMN "portfolioUrls";

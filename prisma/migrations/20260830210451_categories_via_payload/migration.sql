-- DropForeignKey
ALTER TABLE "AdSpaceAssetCategory" DROP CONSTRAINT "AdSpaceAssetCategory_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "BusinessCategory" DROP CONSTRAINT "BusinessCategory_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "CampaignCategory" DROP CONSTRAINT "CampaignCategory_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_parentId_fkey";

-- DropForeignKey
ALTER TABLE "CreatorCategory" DROP CONSTRAINT "CreatorCategory_categoryId_fkey";

-- DropIndex
DROP INDEX "AdSpaceAssetCategory_categoryId_idx";

-- DropIndex
DROP INDEX "BusinessCategory_categoryId_idx";

-- DropIndex
DROP INDEX "CampaignCategory_categoryId_idx";

-- DropIndex
DROP INDEX "CreatorCategory_categoryId_idx";

-- AlterTable
ALTER TABLE "AdSpaceAssetCategory" DROP CONSTRAINT "AdSpaceAssetCategory_pkey",
DROP COLUMN "categoryId",
ADD COLUMN     "categorySlug" TEXT NOT NULL,
ADD CONSTRAINT "AdSpaceAssetCategory_pkey" PRIMARY KEY ("adSpaceAssetId", "categorySlug");

-- AlterTable
ALTER TABLE "BusinessCategory" DROP CONSTRAINT "BusinessCategory_pkey",
DROP COLUMN "categoryId",
ADD COLUMN     "categorySlug" TEXT NOT NULL,
ADD CONSTRAINT "BusinessCategory_pkey" PRIMARY KEY ("businessId", "categorySlug");

-- AlterTable
ALTER TABLE "CampaignCategory" DROP CONSTRAINT "CampaignCategory_pkey",
DROP COLUMN "categoryId",
ADD COLUMN     "categorySlug" TEXT NOT NULL,
ADD CONSTRAINT "CampaignCategory_pkey" PRIMARY KEY ("campaignId", "categorySlug");

-- AlterTable
ALTER TABLE "CreatorCategory" DROP CONSTRAINT "CreatorCategory_pkey",
DROP COLUMN "categoryId",
ADD COLUMN     "categorySlug" TEXT NOT NULL,
ADD CONSTRAINT "CreatorCategory_pkey" PRIMARY KEY ("creatorId", "categorySlug");

-- DropTable
DROP TABLE "Category";

-- DropEnum
DROP TYPE "CategoryScope";

-- CreateIndex
CREATE INDEX "AdSpaceAssetCategory_categorySlug_idx" ON "AdSpaceAssetCategory"("categorySlug");

-- CreateIndex
CREATE INDEX "BusinessCategory_categorySlug_idx" ON "BusinessCategory"("categorySlug");

-- CreateIndex
CREATE INDEX "CampaignCategory_categorySlug_idx" ON "CampaignCategory"("categorySlug");

-- CreateIndex
CREATE INDEX "CreatorCategory_categorySlug_idx" ON "CreatorCategory"("categorySlug");


-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "briefAssetsUrl" TEXT,
ADD COLUMN     "deliverables" "DeliverableType"[];

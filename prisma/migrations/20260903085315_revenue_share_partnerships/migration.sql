-- CreateEnum
CREATE TYPE "CompensationModel" AS ENUM ('FIXED_FEE', 'REVENUE_SHARE', 'HYBRID');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "CommissionBasis" AS ENUM ('PRE_DISCOUNT', 'POST_DISCOUNT');

-- CreateEnum
CREATE TYPE "CommissionScope" AS ENUM ('PRODUCT_ONLY', 'WHOLE_CART');

-- CreateEnum
CREATE TYPE "AttributionMode" AS ENUM ('LINK', 'COUPON', 'LINK_AND_COUPON');

-- CreateEnum
CREATE TYPE "AttributionMethod" AS ENUM ('COUPON', 'COOKIE', 'MANUAL');

-- CreateEnum
CREATE TYPE "TopUpMode" AS ENUM ('MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('PENDING_DEPOSIT', 'ACTIVE', 'GATE_80', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SitePlatform" AS ENUM ('WOOCOMMERCE');

-- CreateEnum
CREATE TYPE "SiteStatus" AS ENUM ('ACTIVE', 'STALE', 'OFFLINE', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "OrderCommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REVERSED', 'PAID');

-- CreateEnum
CREATE TYPE "CheckpointStatus" AS ENUM ('SCHEDULED', 'PAID', 'SHORTFALL');

-- CreateEnum
CREATE TYPE "PluginAlertType" AS ENUM ('DEACTIVATED', 'HEARTBEAT_ABSENT', 'WEBHOOK_MISMATCH');

-- CreateEnum
CREATE TYPE "EnforcementType" AS ENUM ('WARNING', 'FINE', 'SUSPENSION', 'BAN');

-- AlterEnum
ALTER TYPE "ConsentDocumentType" ADD VALUE 'PARTNERSHIP_AGREEMENT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DisputeReason" ADD VALUE 'UNDERREPORTED_SALES';
ALTER TYPE "DisputeReason" ADD VALUE 'FRAUDULENT_ORDERS';
ALTER TYPE "DisputeReason" ADD VALUE 'ATTRIBUTION_DISPUTE';
ALTER TYPE "DisputeReason" ADD VALUE 'PLUGIN_NOT_REPORTING';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'TRACKING_OFFLINE';
ALTER TYPE "NotificationType" ADD VALUE 'DEPOSIT_LOW';
ALTER TYPE "NotificationType" ADD VALUE 'PARTNERSHIP_PAUSED';
ALTER TYPE "NotificationType" ADD VALUE 'COMMISSION_ACCRUED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'PARTNERSHIP_DEPOSIT';
ALTER TYPE "TransactionType" ADD VALUE 'COMMISSION_ACCRUAL';
ALTER TYPE "TransactionType" ADD VALUE 'COMMISSION_PAYOUT';
ALTER TYPE "TransactionType" ADD VALUE 'COMMISSION_REVERSAL';
ALTER TYPE "TransactionType" ADD VALUE 'DEPOSIT_REFUND';

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "compensationModel" "CompensationModel" NOT NULL DEFAULT 'FIXED_FEE';

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "compensationModel" "CompensationModel" NOT NULL DEFAULT 'FIXED_FEE';

-- CreateTable
CREATE TABLE "CampaignPartnerTerms" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "commissionType" "CommissionType" NOT NULL,
    "commissionValue" DECIMAL(12,2) NOT NULL,
    "commissionBasis" "CommissionBasis" NOT NULL DEFAULT 'PRE_DISCOUNT',
    "commissionScope" "CommissionScope" NOT NULL DEFAULT 'PRODUCT_ONLY',
    "estimatedPurchases" INTEGER NOT NULL,
    "assumedAovILS" DECIMAL(12,2) NOT NULL,
    "attributionMode" "AttributionMode" NOT NULL DEFAULT 'LINK_AND_COUPON',
    "destinationUrl" TEXT NOT NULL,
    "couponDiscountPct" DECIMAL(5,2),
    "payoutCheckpoints" TIMESTAMP(3)[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignPartnerTerms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerProgram" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "commissionType" "CommissionType" NOT NULL,
    "commissionValue" DECIMAL(12,2) NOT NULL,
    "commissionBasis" "CommissionBasis" NOT NULL,
    "commissionScope" "CommissionScope" NOT NULL,
    "estimatedPurchases" INTEGER NOT NULL,
    "assumedAovILS" DECIMAL(12,2) NOT NULL,
    "requiredDepositILS" DECIMAL(12,2) NOT NULL,
    "depositHoldId" TEXT,
    "attributionMode" "AttributionMode" NOT NULL,
    "refCode" TEXT NOT NULL,
    "couponCode" TEXT,
    "couponDiscountPct" DECIMAL(5,2),
    "destinationUrl" TEXT NOT NULL,
    "platformFeePct" DECIMAL(5,2) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "payoutCheckpoints" TIMESTAMP(3)[],
    "topUpMode" "TopUpMode" NOT NULL DEFAULT 'MANUAL',
    "status" "ProgramStatus" NOT NULL DEFAULT 'PENDING_DEPOSIT',
    "pausedAt" TIMESTAMP(3),
    "pauseReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackedSite" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "platform" "SitePlatform" NOT NULL DEFAULT 'WOOCOMMERCE',
    "apiKeyHash" TEXT NOT NULL,
    "status" "SiteStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastHeartbeatAt" TIMESTAMP(3),
    "pluginVersion" TEXT,
    "wooVersion" TEXT,
    "pairedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackedSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateClick" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "landingUrl" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributedOrder" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "orderPlacedAt" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "commissionableAmount" DECIMAL(12,2) NOT NULL,
    "couponCodes" TEXT[],
    "attributionMethod" "AttributionMethod" NOT NULL,
    "customerHash" TEXT NOT NULL,
    "isNewCustomer" BOOLEAN NOT NULL DEFAULT true,
    "status" "OrderCommissionStatus" NOT NULL DEFAULT 'PENDING',
    "commissionAmount" DECIMAL(12,2) NOT NULL,
    "platformFeeAmount" DECIMAL(12,2) NOT NULL,
    "reversedAt" TIMESTAMP(3),
    "reversalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttributedOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutCheckpoint" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "CheckpointStatus" NOT NULL DEFAULT 'SCHEDULED',
    "grossCommissionILS" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reversalsILS" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidILS" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceWindow" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "declaredByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PluginAlert" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "programId" TEXT,
    "type" "PluginAlertType" NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "autoPausedAt" TIMESTAMP(3),

    CONSTRAINT "PluginAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnforcementAction" (
    "id" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "type" "EnforcementType" NOT NULL,
    "reason" TEXT NOT NULL,
    "disputeId" TEXT,
    "amountILS" DECIMAL(12,2),
    "issuedByAdminId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnforcementAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignPartnerTerms_campaignId_key" ON "CampaignPartnerTerms"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerProgram_contractId_key" ON "PartnerProgram"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerProgram_refCode_key" ON "PartnerProgram"("refCode");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerProgram_couponCode_key" ON "PartnerProgram"("couponCode");

-- CreateIndex
CREATE INDEX "PartnerProgram_status_idx" ON "PartnerProgram"("status");

-- CreateIndex
CREATE INDEX "TrackedSite_status_idx" ON "TrackedSite"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedSite_businessId_siteUrl_key" ON "TrackedSite"("businessId", "siteUrl");

-- CreateIndex
CREATE INDEX "AffiliateClick_programId_occurredAt_idx" ON "AffiliateClick"("programId", "occurredAt");

-- CreateIndex
CREATE INDEX "AttributedOrder_programId_status_idx" ON "AttributedOrder"("programId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AttributedOrder_siteId_externalOrderId_key" ON "AttributedOrder"("siteId", "externalOrderId");

-- CreateIndex
CREATE INDEX "PayoutCheckpoint_programId_idx" ON "PayoutCheckpoint"("programId");

-- CreateIndex
CREATE INDEX "PayoutCheckpoint_status_scheduledFor_idx" ON "PayoutCheckpoint"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "MaintenanceWindow_siteId_startsAt_idx" ON "MaintenanceWindow"("siteId", "startsAt");

-- CreateIndex
CREATE INDEX "PluginAlert_siteId_idx" ON "PluginAlert"("siteId");

-- CreateIndex
CREATE INDEX "PluginAlert_type_idx" ON "PluginAlert"("type");

-- CreateIndex
CREATE INDEX "EnforcementAction_targetUserId_idx" ON "EnforcementAction"("targetUserId");

-- CreateIndex
CREATE INDEX "EnforcementAction_type_idx" ON "EnforcementAction"("type");

-- AddForeignKey
ALTER TABLE "CampaignPartnerTerms" ADD CONSTRAINT "CampaignPartnerTerms_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerProgram" ADD CONSTRAINT "PartnerProgram_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedSite" ADD CONSTRAINT "TrackedSite_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_programId_fkey" FOREIGN KEY ("programId") REFERENCES "PartnerProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributedOrder" ADD CONSTRAINT "AttributedOrder_programId_fkey" FOREIGN KEY ("programId") REFERENCES "PartnerProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributedOrder" ADD CONSTRAINT "AttributedOrder_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "TrackedSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutCheckpoint" ADD CONSTRAINT "PayoutCheckpoint_programId_fkey" FOREIGN KEY ("programId") REFERENCES "PartnerProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceWindow" ADD CONSTRAINT "MaintenanceWindow_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "TrackedSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceWindow" ADD CONSTRAINT "MaintenanceWindow_declaredByUserId_fkey" FOREIGN KEY ("declaredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PluginAlert" ADD CONSTRAINT "PluginAlert_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "TrackedSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PluginAlert" ADD CONSTRAINT "PluginAlert_programId_fkey" FOREIGN KEY ("programId") REFERENCES "PartnerProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnforcementAction" ADD CONSTRAINT "EnforcementAction_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnforcementAction" ADD CONSTRAINT "EnforcementAction_issuedByAdminId_fkey" FOREIGN KEY ("issuedByAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnforcementAction" ADD CONSTRAINT "EnforcementAction_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE SET NULL ON UPDATE CASCADE;


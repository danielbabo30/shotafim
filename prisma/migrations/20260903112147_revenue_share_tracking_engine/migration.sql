-- CreateEnum
CREATE TYPE "GateChoice" AS ENUM ('CONTINUE', 'STOP');

-- CreateEnum
CREATE TYPE "AnomalyType" AS ENUM ('CLICK_ORDER_RATIO_DROP', 'RETURN_RATE_SPIKE', 'VELOCITY_SPIKE', 'VELOCITY_DROP', 'SELF_PURCHASE', 'POST_CHECKPOINT_RETURN');

-- CreateEnum
CREATE TYPE "AnomalySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterEnum
ALTER TYPE "OrderCommissionStatus" ADD VALUE 'ON_HOLD';

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'PLATFORM_ABSORPTION';

-- AlterTable
ALTER TABLE "AffiliateClick" ADD COLUMN     "uaHash" TEXT,
ADD COLUMN     "unverifiable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AttributedOrder" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "heldAt" TIMESTAMP(3),
ADD COLUMN     "holdReason" TEXT,
ADD COLUMN     "lateFromDigest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "orderStatusRaw" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "payoutCheckpointId" TEXT,
ADD COLUMN     "refundedAmountILS" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "BusinessProfile" ADD COLUMN     "partnershipDebtILS" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PartnerProgram" ADD COLUMN     "drainedILS" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PayoutCheckpoint" ADD COLUMN     "carryInILS" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "isFinal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "sequence" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "PluginAlert" ADD COLUMN     "detail" TEXT,
ADD COLUMN     "graceEndsAt" TIMESTAMP(3),
ADD COLUMN     "notifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TrackedSite" ADD COLUMN     "apiKeyEnc" TEXT NOT NULL,
ADD COLUMN     "offlineAt" TIMESTAMP(3),
ADD COLUMN     "phpVersion" TEXT,
ADD COLUMN     "staleAt" TIMESTAMP(3),
ADD COLUMN     "wpVersion" TEXT;

-- CreateTable
CREATE TABLE "PartnerGateEvent" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "thresholdPct" INTEGER NOT NULL DEFAULT 80,
    "drainedAtOpenILS" DECIMAL(12,2) NOT NULL,
    "depositAtOpenILS" DECIMAL(12,2) NOT NULL,
    "brandChoice" "GateChoice",
    "providerChoice" "GateChoice",
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,

    CONSTRAINT "PartnerGateEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnomalyFlag" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "type" "AnomalyType" NOT NULL,
    "severity" "AnomalySeverity" NOT NULL,
    "detail" TEXT NOT NULL,
    "metricValue" DECIMAL(14,4),
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "AnomalyFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnerGateEvent_programId_idx" ON "PartnerGateEvent"("programId");

-- CreateIndex
CREATE INDEX "PartnerGateEvent_resolvedAt_idx" ON "PartnerGateEvent"("resolvedAt");

-- CreateIndex
CREATE INDEX "AnomalyFlag_programId_idx" ON "AnomalyFlag"("programId");

-- CreateIndex
CREATE INDEX "AnomalyFlag_resolvedAt_idx" ON "AnomalyFlag"("resolvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnomalyFlag_programId_type_detectedAt_key" ON "AnomalyFlag"("programId", "type", "detectedAt");

-- CreateIndex
CREATE INDEX "AttributedOrder_payoutCheckpointId_idx" ON "AttributedOrder"("payoutCheckpointId");

-- CreateIndex
CREATE INDEX "PluginAlert_resolvedAt_idx" ON "PluginAlert"("resolvedAt");

-- AddForeignKey
ALTER TABLE "AttributedOrder" ADD CONSTRAINT "AttributedOrder_payoutCheckpointId_fkey" FOREIGN KEY ("payoutCheckpointId") REFERENCES "PayoutCheckpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerGateEvent" ADD CONSTRAINT "PartnerGateEvent_programId_fkey" FOREIGN KEY ("programId") REFERENCES "PartnerProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnomalyFlag" ADD CONSTRAINT "AnomalyFlag_programId_fkey" FOREIGN KEY ("programId") REFERENCES "PartnerProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;


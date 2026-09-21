-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('BRAND', 'CREATOR', 'AD_SPACE_OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_ONBOARDING', 'ACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LegalEntityType" AS ENUM ('LTD', 'LICENSED_DEALER', 'EXEMPT_DEALER', 'PARTNERSHIP');

-- CreateEnum
CREATE TYPE "BusinessModel" AS ENUM ('PHYSICAL', 'ONLINE', 'HYBRID');

-- CreateEnum
CREATE TYPE "CreatorTaxStatus" AS ENUM ('EXEMPT_DEALER', 'LICENSED_DEALER', 'COMPANY', 'INDIVIDUAL_WITHHOLDING');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'FACEBOOK', 'LINKEDIN');

-- CreateEnum
CREATE TYPE "DeliverableType" AS ENUM ('IG_REEL', 'IG_STORY', 'TIKTOK_VIDEO', 'YOUTUBE_INTEGRATION', 'EVENT_ATTENDANCE');

-- CreateEnum
CREATE TYPE "AdSpaceType" AS ENUM ('DIGITAL_BILLBOARD', 'STATIC_BILLBOARD', 'TRANSIT', 'NEWSLETTER', 'PODCAST_SPONSORSHIP');

-- CreateEnum
CREATE TYPE "AdPricingModel" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'PER_CPM', 'PER_BROADCAST');

-- CreateEnum
CREATE TYPE "ProofRequirement" AS ENUM ('PHOTO_CONFIRMATION', 'ANALYTICS_REPORT', 'SYSTEM_LOG');

-- CreateEnum
CREATE TYPE "CampaignTargetType" AS ENUM ('CREATOR', 'AD_SPACE', 'BOTH');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'OPEN_FOR_PITCHES', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('AWAITING_ESCROW', 'ACTIVE', 'SUBMITTED_FOR_REVIEW', 'APPROVED', 'DISPUTED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('RESERVED', 'CONFIRMED', 'BROADCASTING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('HELD', 'RELEASED_TO_PROVIDER', 'REFUNDED_TO_BRAND', 'SPLIT_DISPUTE');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('ESCROW_DEPOSIT', 'ESCROW_RELEASE', 'WITHDRAWAL', 'PLATFORM_FEE', 'REFUND');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "InvoiceDocumentType" AS ENUM ('TAX_INVOICE', 'RECEIPT', 'CREDIT_INVOICE');

-- CreateEnum
CREATE TYPE "InvoiceProvider" AS ENUM ('LOCAL_MOCK', 'GREEN_INVOICE', 'MORNING');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING_REVIEW', 'REVISION_REQUESTED', 'APPROVED');

-- CreateEnum
CREATE TYPE "ProofType" AS ENUM ('PHOTO_PROOF', 'SYSTEM_LOG', 'ANALYTICS_EXPORT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ESCROW_LOCKED', 'SUBMISSION_RECEIVED', 'REVISION_NEEDED', 'PAYMENT_RELEASED');

-- CreateEnum
CREATE TYPE "DisputeReason" AS ENUM ('MISSED_DEADLINE', 'LOW_QUALITY', 'BRIEF_DEVIATION', 'NON_RESPONSIVE');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_ARBITRATION', 'RESOLVED_REFUND', 'RESOLVED_PAYOUT', 'SPLIT');

-- CreateEnum
CREATE TYPE "ReviewSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "ConsentDocumentType" AS ENUM ('TERMS_OF_SERVICE', 'ESCROW_AGREEMENT', 'PRIVACY_POLICY');

-- CreateEnum
CREATE TYPE "MediaFileType" AS ENUM ('VIDEO_DRAFT', 'IMAGE_ASSET', 'INVOICE_PDF', 'PROOF_OF_PLAY');

-- CreateEnum
CREATE TYPE "BlockReportReason" AS ENUM ('OFF_PLATFORM_PAYMENT_ATTEMPT', 'HARASSMENT', 'SPAM', 'COPYRIGHT_INFRINGEMENT');

-- CreateEnum
CREATE TYPE "BlockReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "IsraelDistrict" AS ENUM ('TEL_AVIV', 'CENTRAL', 'NORTH', 'SOUTH', 'JERUSALEM', 'HAIFA', 'JUDEA_SAMARIA');

-- CreateEnum
CREATE TYPE "CategoryScope" AS ENUM ('BRAND', 'CREATOR', 'AD_SPACE');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "activeRole" "UserRole",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "phoneVerified" TIMESTAMP(3),
ADD COLUMN     "roles" "UserRole"[] DEFAULT ARRAY[]::"UserRole"[],
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'PENDING_ONBOARDING',
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "BusinessProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "companyId" TEXT NOT NULL,
    "entityType" "LegalEntityType" NOT NULL,
    "description" TEXT NOT NULL,
    "businessModel" "BusinessModel" NOT NULL,
    "status" "ProfileStatus" NOT NULL DEFAULT 'ACTIVE',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "socialLinks" JSONB,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "billingEmail" TEXT NOT NULL,
    "billingAddress" TEXT NOT NULL,
    "billingCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessLocation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT,
    "cityId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "legalFullName" TEXT NOT NULL,
    "idNumber" TEXT NOT NULL,
    "taxStatus" "CreatorTaxStatus" NOT NULL,
    "bio" TEXT NOT NULL,
    "primaryCityId" TEXT,
    "avatarUrl" TEXT,
    "coverImageUrl" TEXT,
    "status" "ProfileStatus" NOT NULL DEFAULT 'ACTIVE',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reliabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payoutBankDetails" JSONB,
    "billingAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CreatorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorChannel" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "handle" TEXT NOT NULL,
    "channelUrl" TEXT NOT NULL,
    "followersCount" INTEGER NOT NULL DEFAULT 0,
    "avgViews" INTEGER,
    "engagementRate" DOUBLE PRECISION,
    "isChannelVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorPricingPackage" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "deliverableType" "DeliverableType" NOT NULL,
    "title" TEXT NOT NULL,
    "priceILS" DECIMAL(12,2) NOT NULL,
    "turnaroundDays" INTEGER NOT NULL,
    "revisionsIncluded" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorPricingPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdSpaceOwnerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entityType" "LegalEntityType" NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "billingEmail" TEXT NOT NULL,
    "billingAddress" TEXT NOT NULL,
    "payoutBankDetails" JSONB,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "status" "ProfileStatus" NOT NULL DEFAULT 'ACTIVE',
    "reliabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AdSpaceOwnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdSpaceAsset" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "AdSpaceType" NOT NULL,
    "description" TEXT NOT NULL,
    "cityId" TEXT,
    "address" TEXT,
    "dimensions" TEXT,
    "technicalSpecs" JSONB,
    "estimatedReach" INTEGER,
    "pricingModel" "AdPricingModel" NOT NULL,
    "basePriceILS" DECIMAL(12,2) NOT NULL,
    "images" TEXT[],
    "proofRequirement" "ProofRequirement" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AdSpaceAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,
    "nameEn" TEXT,
    "district" "IsraelDistrict" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "iconName" TEXT,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "scopes" "CategoryScope"[],

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorCategory" (
    "creatorId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "CreatorCategory_pkey" PRIMARY KEY ("creatorId","categoryId")
);

-- CreateTable
CREATE TABLE "BusinessCategory" (
    "businessId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "BusinessCategory_pkey" PRIMARY KEY ("businessId","categoryId")
);

-- CreateTable
CREATE TABLE "CampaignCategory" (
    "campaignId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "CampaignCategory_pkey" PRIMARY KEY ("campaignId","categoryId")
);

-- CreateTable
CREATE TABLE "AdSpaceAssetCategory" (
    "adSpaceAssetId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "AdSpaceAssetCategory_pkey" PRIMARY KEY ("adSpaceAssetId","categoryId")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetType" "CampaignTargetType" NOT NULL,
    "targetPlatforms" TEXT[],
    "totalBudgetILS" DECIMAL(12,2) NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignApplication" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "pricingPackageId" TEXT,
    "adSpaceAssetId" TEXT,
    "proposedPriceILS" DECIMAL(12,2) NOT NULL,
    "coverLetter" TEXT,
    "estimatedDeliveryDays" INTEGER NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "applicationId" TEXT,
    "businessId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "pricingPackageId" TEXT,
    "adSpaceAssetId" TEXT,
    "agreedPriceILS" DECIMAL(12,2) NOT NULL,
    "platformFeeILS" DECIMAL(12,2) NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'AWAITING_ESCROW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdSpaceBooking" (
    "id" TEXT NOT NULL,
    "adSpaceAssetId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdSpaceBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowHold" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "amountILS" DECIMAL(12,2) NOT NULL,
    "status" "EscrowStatus" NOT NULL DEFAULT 'HELD',
    "fundedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscrowHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contractId" TEXT,
    "type" "TransactionType" NOT NULL,
    "amountILS" DECIMAL(12,2) NOT NULL,
    "feeAmountILS" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT,
    "recipientUserId" TEXT NOT NULL,
    "documentType" "InvoiceDocumentType" NOT NULL,
    "amountBeforeTax" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerTaxId" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "externalProvider" "InvoiceProvider" NOT NULL DEFAULT 'LOCAL_MOCK',
    "externalDocumentId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliverableSubmission" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "notes" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliverableSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentFeedback" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "timestampSeconds" INTEGER,
    "feedbackText" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofOfPlay" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "proofType" "ProofType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "notes" TEXT,
    "verifiedByBrand" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProofOfPlay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT,
    "contractId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("conversationId","userId")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "actionUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "reason" "DisputeReason" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "arbitratorId" TEXT,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeMessage" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "sentiment" "ReviewSentiment" NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedbackText" TEXT NOT NULL,
    "punctualityRating" INTEGER,
    "communicationRating" INTEGER,
    "paymentRating" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentType" "ConsentDocumentType" NOT NULL,
    "version" TEXT NOT NULL,
    "ipAddress" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAttachment" (
    "id" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" "MediaFileType" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" BIGINT NOT NULL,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBlockReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedUserId" TEXT NOT NULL,
    "reason" "BlockReportReason" NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "status" "BlockReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBlockReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessProfile_userId_key" ON "BusinessProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessProfile_companyId_key" ON "BusinessProfile"("companyId");

-- CreateIndex
CREATE INDEX "BusinessProfile_verificationStatus_idx" ON "BusinessProfile"("verificationStatus");

-- CreateIndex
CREATE INDEX "BusinessProfile_status_idx" ON "BusinessProfile"("status");

-- CreateIndex
CREATE INDEX "BusinessLocation_businessId_idx" ON "BusinessLocation"("businessId");

-- CreateIndex
CREATE INDEX "BusinessLocation_cityId_idx" ON "BusinessLocation"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorProfile_userId_key" ON "CreatorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorProfile_idNumber_key" ON "CreatorProfile"("idNumber");

-- CreateIndex
CREATE INDEX "CreatorProfile_verificationStatus_idx" ON "CreatorProfile"("verificationStatus");

-- CreateIndex
CREATE INDEX "CreatorProfile_status_idx" ON "CreatorProfile"("status");

-- CreateIndex
CREATE INDEX "CreatorProfile_primaryCityId_idx" ON "CreatorProfile"("primaryCityId");

-- CreateIndex
CREATE INDEX "CreatorChannel_creatorId_idx" ON "CreatorChannel"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorChannel_creatorId_platform_key" ON "CreatorChannel"("creatorId", "platform");

-- CreateIndex
CREATE INDEX "CreatorPricingPackage_creatorId_idx" ON "CreatorPricingPackage"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "AdSpaceOwnerProfile_userId_key" ON "AdSpaceOwnerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AdSpaceOwnerProfile_companyId_key" ON "AdSpaceOwnerProfile"("companyId");

-- CreateIndex
CREATE INDEX "AdSpaceOwnerProfile_verificationStatus_idx" ON "AdSpaceOwnerProfile"("verificationStatus");

-- CreateIndex
CREATE INDEX "AdSpaceOwnerProfile_status_idx" ON "AdSpaceOwnerProfile"("status");

-- CreateIndex
CREATE INDEX "AdSpaceAsset_ownerId_idx" ON "AdSpaceAsset"("ownerId");

-- CreateIndex
CREATE INDEX "AdSpaceAsset_cityId_idx" ON "AdSpaceAsset"("cityId");

-- CreateIndex
CREATE INDEX "AdSpaceAsset_type_isActive_idx" ON "AdSpaceAsset"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "City_nameHe_key" ON "City"("nameHe");

-- CreateIndex
CREATE INDEX "City_district_idx" ON "City"("district");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "CreatorCategory_categoryId_idx" ON "CreatorCategory"("categoryId");

-- CreateIndex
CREATE INDEX "BusinessCategory_categoryId_idx" ON "BusinessCategory"("categoryId");

-- CreateIndex
CREATE INDEX "CampaignCategory_categoryId_idx" ON "CampaignCategory"("categoryId");

-- CreateIndex
CREATE INDEX "AdSpaceAssetCategory_categoryId_idx" ON "AdSpaceAssetCategory"("categoryId");

-- CreateIndex
CREATE INDEX "Campaign_businessId_idx" ON "Campaign"("businessId");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "CampaignApplication_applicantId_idx" ON "CampaignApplication"("applicantId");

-- CreateIndex
CREATE INDEX "CampaignApplication_status_idx" ON "CampaignApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignApplication_campaignId_applicantId_key" ON "CampaignApplication"("campaignId", "applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_applicationId_key" ON "Contract"("applicationId");

-- CreateIndex
CREATE INDEX "Contract_campaignId_idx" ON "Contract"("campaignId");

-- CreateIndex
CREATE INDEX "Contract_businessId_idx" ON "Contract"("businessId");

-- CreateIndex
CREATE INDEX "Contract_providerId_idx" ON "Contract"("providerId");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

-- CreateIndex
CREATE INDEX "AdSpaceBooking_adSpaceAssetId_startDate_endDate_idx" ON "AdSpaceBooking"("adSpaceAssetId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "AdSpaceBooking_contractId_idx" ON "AdSpaceBooking"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "EscrowHold_contractId_key" ON "EscrowHold"("contractId");

-- CreateIndex
CREATE INDEX "EscrowHold_status_idx" ON "EscrowHold"("status");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_contractId_idx" ON "Transaction"("contractId");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Invoice_transactionId_idx" ON "Invoice"("transactionId");

-- CreateIndex
CREATE INDEX "Invoice_recipientUserId_idx" ON "Invoice"("recipientUserId");

-- CreateIndex
CREATE INDEX "DeliverableSubmission_contractId_idx" ON "DeliverableSubmission"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliverableSubmission_contractId_version_key" ON "DeliverableSubmission"("contractId", "version");

-- CreateIndex
CREATE INDEX "ContentFeedback_submissionId_idx" ON "ContentFeedback"("submissionId");

-- CreateIndex
CREATE INDEX "ProofOfPlay_contractId_idx" ON "ProofOfPlay"("contractId");

-- CreateIndex
CREATE INDEX "Conversation_campaignId_idx" ON "Conversation"("campaignId");

-- CreateIndex
CREATE INDEX "Conversation_contractId_idx" ON "Conversation"("contractId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_contractId_key" ON "Dispute"("contractId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE INDEX "DisputeMessage_disputeId_idx" ON "DisputeMessage"("disputeId");

-- CreateIndex
CREATE INDEX "Review_targetId_idx" ON "Review"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_contractId_authorId_key" ON "Review"("contractId", "authorId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "LegalConsent_userId_idx" ON "LegalConsent"("userId");

-- CreateIndex
CREATE INDEX "MediaAttachment_uploaderId_idx" ON "MediaAttachment"("uploaderId");

-- CreateIndex
CREATE INDEX "UserBlockReport_reportedUserId_idx" ON "UserBlockReport"("reportedUserId");

-- CreateIndex
CREATE INDEX "UserBlockReport_status_idx" ON "UserBlockReport"("status");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- AddForeignKey
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessLocation" ADD CONSTRAINT "BusinessLocation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessLocation" ADD CONSTRAINT "BusinessLocation_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorProfile" ADD CONSTRAINT "CreatorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorProfile" ADD CONSTRAINT "CreatorProfile_primaryCityId_fkey" FOREIGN KEY ("primaryCityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorChannel" ADD CONSTRAINT "CreatorChannel_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorPricingPackage" ADD CONSTRAINT "CreatorPricingPackage_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdSpaceOwnerProfile" ADD CONSTRAINT "AdSpaceOwnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdSpaceAsset" ADD CONSTRAINT "AdSpaceAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "AdSpaceOwnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdSpaceAsset" ADD CONSTRAINT "AdSpaceAsset_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorCategory" ADD CONSTRAINT "CreatorCategory_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorCategory" ADD CONSTRAINT "CreatorCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessCategory" ADD CONSTRAINT "BusinessCategory_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessCategory" ADD CONSTRAINT "BusinessCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignCategory" ADD CONSTRAINT "CampaignCategory_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignCategory" ADD CONSTRAINT "CampaignCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdSpaceAssetCategory" ADD CONSTRAINT "AdSpaceAssetCategory_adSpaceAssetId_fkey" FOREIGN KEY ("adSpaceAssetId") REFERENCES "AdSpaceAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdSpaceAssetCategory" ADD CONSTRAINT "AdSpaceAssetCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BusinessLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignApplication" ADD CONSTRAINT "CampaignApplication_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignApplication" ADD CONSTRAINT "CampaignApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignApplication" ADD CONSTRAINT "CampaignApplication_pricingPackageId_fkey" FOREIGN KEY ("pricingPackageId") REFERENCES "CreatorPricingPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignApplication" ADD CONSTRAINT "CampaignApplication_adSpaceAssetId_fkey" FOREIGN KEY ("adSpaceAssetId") REFERENCES "AdSpaceAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "CampaignApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_pricingPackageId_fkey" FOREIGN KEY ("pricingPackageId") REFERENCES "CreatorPricingPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_adSpaceAssetId_fkey" FOREIGN KEY ("adSpaceAssetId") REFERENCES "AdSpaceAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdSpaceBooking" ADD CONSTRAINT "AdSpaceBooking_adSpaceAssetId_fkey" FOREIGN KEY ("adSpaceAssetId") REFERENCES "AdSpaceAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdSpaceBooking" ADD CONSTRAINT "AdSpaceBooking_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowHold" ADD CONSTRAINT "EscrowHold_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliverableSubmission" ADD CONSTRAINT "DeliverableSubmission_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentFeedback" ADD CONSTRAINT "ContentFeedback_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "DeliverableSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentFeedback" ADD CONSTRAINT "ContentFeedback_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofOfPlay" ADD CONSTRAINT "ProofOfPlay_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_arbitratorId_fkey" FOREIGN KEY ("arbitratorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeMessage" ADD CONSTRAINT "DisputeMessage_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeMessage" ADD CONSTRAINT "DisputeMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalConsent" ADD CONSTRAINT "LegalConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAttachment" ADD CONSTRAINT "MediaAttachment_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlockReport" ADD CONSTRAINT "UserBlockReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlockReport" ADD CONSTRAINT "UserBlockReport_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- CreateTable
CREATE TABLE "CreatorSocialConsent" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorSocialConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreatorSocialConsent_creatorId_idx" ON "CreatorSocialConsent"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorSocialConsent_creatorId_platform_key" ON "CreatorSocialConsent"("creatorId", "platform");

-- AddForeignKey
ALTER TABLE "CreatorSocialConsent" ADD CONSTRAINT "CreatorSocialConsent_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

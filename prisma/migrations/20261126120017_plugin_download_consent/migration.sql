-- CreateTable
CREATE TABLE "PluginDownloadConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT,
    "userName" TEXT,
    "userEmail" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "termsVersion" TEXT NOT NULL,
    "pluginVersion" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "downloadedAt" TIMESTAMP(3),

    CONSTRAINT "PluginDownloadConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PluginDownloadConsent_userId_termsVersion_idx" ON "PluginDownloadConsent"("userId", "termsVersion");

-- CreateIndex
CREATE INDEX "PluginDownloadConsent_acceptedAt_idx" ON "PluginDownloadConsent"("acceptedAt");

-- AddForeignKey
ALTER TABLE "PluginDownloadConsent" ADD CONSTRAINT "PluginDownloadConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PluginDownloadConsent" ADD CONSTRAINT "PluginDownloadConsent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

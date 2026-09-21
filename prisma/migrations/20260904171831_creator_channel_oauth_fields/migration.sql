-- AlterTable
ALTER TABLE "CreatorChannel" ADD COLUMN     "externalAccountId" TEXT,
ADD COLUMN     "oauthRefreshTokenEnc" TEXT,
ADD COLUMN     "oauthScope" TEXT,
ADD COLUMN     "oauthTokenUpdatedAt" TIMESTAMP(3);

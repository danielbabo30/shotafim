-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE 'INVITED';

-- AlterTable
ALTER TABLE "CampaignApplication" ADD COLUMN     "invitedByUserId" TEXT,
ADD COLUMN     "requestedEndDate" TIMESTAMP(3),
ADD COLUMN     "requestedStartDate" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "CampaignApplication" ADD CONSTRAINT "CampaignApplication_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


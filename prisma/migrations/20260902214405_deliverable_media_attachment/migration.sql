-- AlterTable
ALTER TABLE "DeliverableSubmission" ADD COLUMN     "mediaAttachmentId" TEXT;

-- AlterTable
ALTER TABLE "MediaAttachment" ADD COLUMN     "originalFilename" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DeliverableSubmission_mediaAttachmentId_key" ON "DeliverableSubmission"("mediaAttachmentId");

-- AddForeignKey
ALTER TABLE "DeliverableSubmission" ADD CONSTRAINT "DeliverableSubmission_mediaAttachmentId_fkey" FOREIGN KEY ("mediaAttachmentId") REFERENCES "MediaAttachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;


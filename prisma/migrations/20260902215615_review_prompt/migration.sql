-- CreateTable
CREATE TABLE "ReviewPrompt" (
    "contractId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL,
    "dismissCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReviewPrompt_pkey" PRIMARY KEY ("contractId","userId")
);

-- CreateIndex
CREATE INDEX "ReviewPrompt_userId_idx" ON "ReviewPrompt"("userId");

-- AddForeignKey
ALTER TABLE "ReviewPrompt" ADD CONSTRAINT "ReviewPrompt_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewPrompt" ADD CONSTRAINT "ReviewPrompt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


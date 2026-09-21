-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "hasPhysicalProduct" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ContractShipping" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "cityId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractShipping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractShipping_contractId_key" ON "ContractShipping"("contractId");

-- CreateIndex
CREATE INDEX "ContractShipping_cityId_idx" ON "ContractShipping"("cityId");

-- AddForeignKey
ALTER TABLE "ContractShipping" ADD CONSTRAINT "ContractShipping_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractShipping" ADD CONSTRAINT "ContractShipping_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;


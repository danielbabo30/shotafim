-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "revisionRoundsMax" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "revisionRoundsUsed" INTEGER NOT NULL DEFAULT 0;

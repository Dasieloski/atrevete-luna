/*
  Warnings:

  - You are about to drop the column `productionId` on the `Debt` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Debt" DROP CONSTRAINT "Debt_productionId_fkey";

-- AlterTable
ALTER TABLE "Debt" DROP COLUMN "productionId",
ADD COLUMN     "transferId" TEXT;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

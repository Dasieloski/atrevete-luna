-- DropIndex
DROP INDEX "Debt_saleId_key";

-- AlterTable
ALTER TABLE "Debt" ADD COLUMN     "productionId" TEXT;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Debt" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "Debt" ADD COLUMN "saleId" TEXT;

-- AlterTable
ALTER TABLE "DebtPayment" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'partial';
ALTER TABLE "DebtPayment" ALTER COLUMN "debtId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Debt_saleId_key" ON "Debt"("saleId");

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

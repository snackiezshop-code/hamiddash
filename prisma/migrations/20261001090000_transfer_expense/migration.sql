-- AlterTable
ALTER TABLE "Recipient" ADD COLUMN "monthlyAmount" INTEGER;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "transferCheckId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Expense_transferCheckId_key" ON "Expense"("transferCheckId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_transferCheckId_fkey" FOREIGN KEY ("transferCheckId") REFERENCES "TransferCheck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

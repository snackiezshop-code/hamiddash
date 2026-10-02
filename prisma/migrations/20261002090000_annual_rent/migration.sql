-- AlterTable
ALTER TABLE "Room" ADD COLUMN "annualRent" INTEGER;

-- AlterTable
ALTER TABLE "AdditionalIncome" ADD COLUMN "annualRoomId" TEXT,
ADD COLUMN "annualTermEnd" TIMESTAMP(3);

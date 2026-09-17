-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('LUNAS', 'KOSONG', 'RUSAK', 'TAHUNAN', 'TUNDA_BAYAR');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('LISTRIK', 'PDAM', 'CLEANING_SERVICE', 'KEBERSIHAN', 'PERBAIKAN', 'INTERNET', 'PERLENGKAPAN', 'ADMINISTRASI', 'PENGURUS', 'BAGI_HASIL', 'LAINNYA');

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "monthlyRent" INTEGER NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'KOSONG',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "reminderDay" INTEGER,
    "moveInDate" TIMESTAMP(3),
    "leaseEndDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashPeriod" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "openingBalance" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomIncome" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomIncome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdditionalIncome" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdditionalIncome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "accountHolder" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferCheck" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "amount" INTEGER,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "TransferCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "roomId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_number_key" ON "Room"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_roomId_key" ON "Tenant"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "CashPeriod_year_month_key" ON "CashPeriod"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "RoomIncome_periodId_roomId_key" ON "RoomIncome"("periodId", "roomId");

-- CreateIndex
CREATE UNIQUE INDEX "TransferCheck_periodId_recipientId_key" ON "TransferCheck"("periodId", "recipientId");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomIncome" ADD CONSTRAINT "RoomIncome_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "CashPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomIncome" ADD CONSTRAINT "RoomIncome_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdditionalIncome" ADD CONSTRAINT "AdditionalIncome_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "CashPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "CashPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferCheck" ADD CONSTRAINT "TransferCheck_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "CashPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferCheck" ADD CONSTRAINT "TransferCheck_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Recipient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

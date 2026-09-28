-- Per-reminder alert lead time (1 day before, as before, unless set) and a typed-in name for "Other" expenses.

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "categoryLabel" TEXT;

-- AlterTable
ALTER TABLE "Reminder" ADD COLUMN "remindBefore" INTEGER NOT NULL DEFAULT 1;

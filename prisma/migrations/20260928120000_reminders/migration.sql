-- Reminders replace the checklist and the recurring bills; the view-only link is dropped.

-- CreateEnum
CREATE TYPE "Repeat" AS ENUM ('NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tag" TEXT,
    "roomId" TEXT,
    "dueDate" TIMESTAMP(3),
    "repeat" "Repeat" NOT NULL DEFAULT 'NONE',
    "amount" INTEGER,
    "category" "ExpenseCategory",
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- Carry the cleaning service bill over as a reminder that repeats every 14 days.
INSERT INTO "Reminder" ("id", "title", "dueDate", "repeat", "amount", "category", "isDone", "createdAt", "updatedAt")
SELECT "id", "name", "nextDueDate", 'BIWEEKLY', "amount", "category", NOT "isActive", "createdAt", CURRENT_TIMESTAMP
FROM "RecurringPayment";

-- Every checklist task (done ones too) becomes a one-off reminder.
INSERT INTO "Reminder" ("id", "title", "tag", "roomId", "dueDate", "isDone", "doneAt", "createdAt", "updatedAt")
SELECT "id", "title", "category", "roomId", "dueDate", "isDone", "completedAt", "createdAt", CURRENT_TIMESTAMP
FROM "ChecklistItem";

-- DropTable
DROP TABLE "RecurringPayment";
DROP TABLE "ChecklistItem";
DROP TABLE "ShareLink";

import "dotenv/config";
import { writeFileSync } from "node:fs";
import { db } from "../src/lib/db";

// One-off dump of every table, in FK-safe order, for the SQLite → Postgres move.
// Re-import with prisma/import-data.ts against the new database.
async function main() {
  const dump = {
    rooms: await db.room.findMany(),
    tenants: await db.tenant.findMany(),
    recipients: await db.recipient.findMany(),
    cashPeriods: await db.cashPeriod.findMany(),
    roomIncomes: await db.roomIncome.findMany(),
    additionalIncomes: await db.additionalIncome.findMany(),
    expenses: await db.expense.findMany(),
    transferChecks: await db.transferCheck.findMany(),
    checklistItems: await db.checklistItem.findMany(),
  };
  writeFileSync("prisma/data-export.json", JSON.stringify(dump, null, 2));
  console.log(Object.fromEntries(Object.entries(dump).map(([k, v]) => [k, v.length])));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

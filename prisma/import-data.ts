import "dotenv/config";
import { readFileSync } from "node:fs";
import { db } from "../src/lib/db";

// Restores prisma/export-data.ts's dump into a fresh database (used for the SQLite → Postgres move).
// Run `prisma migrate deploy` against the target DATABASE_URL first so the tables exist.
async function main() {
  if ((await db.room.count()) > 0) {
    console.log("Database already has data — skipping to avoid duplicates.");
    return;
  }

  const dump = JSON.parse(readFileSync("prisma/data-export.json", "utf8"));

  await db.room.createMany({ data: dump.rooms });
  await db.tenant.createMany({ data: dump.tenants });
  await db.recipient.createMany({ data: dump.recipients });
  await db.cashPeriod.createMany({ data: dump.cashPeriods });
  await db.roomIncome.createMany({ data: dump.roomIncomes });
  await db.additionalIncome.createMany({ data: dump.additionalIncomes });
  await db.expense.createMany({ data: dump.expenses });
  await db.transferCheck.createMany({ data: dump.transferChecks });
  await db.checklistItem.createMany({ data: dump.checklistItems });

  console.log(Object.fromEntries(Object.entries(dump).map(([k, v]) => [k, (v as unknown[]).length])));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

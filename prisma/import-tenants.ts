import "dotenv/config";
import { readFileSync } from "node:fs";
import { db } from "../src/lib/db";

// One-off import from "Data Penghuni Kost - Sheet1.csv" (Room, Nama, Phone Number, Reminding date every month).
// That file is gitignored (contains tenant phone numbers) — re-run this whenever it's updated.
const CSV_PATH = "Data Penghuni Kost - Sheet1.csv";

function parseCsv(text: string) {
  const [, ...lines] = text.trim().split(/\r?\n/); // skip header
  return lines.map((line) => {
    const [room, name, phone, reminderDay] = line.split(",").map((c) => c.trim());
    return { roomNumber: Number(room.replace(/\D/g, "")), name, phone, reminderDay };
  });
}

async function main() {
  const rows = parseCsv(readFileSync(CSV_PATH, "utf8"));
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.name) {
      skipped++;
      continue;
    }
    const room = await db.room.findUnique({ where: { number: row.roomNumber } });
    if (!room) {
      console.warn(`No room ${row.roomNumber} in database, skipping`);
      continue;
    }
    await db.tenant.upsert({
      where: { roomId: room.id },
      create: {
        roomId: room.id,
        name: row.name,
        phone: row.phone || null,
        reminderDay: row.reminderDay ? Number(row.reminderDay) : null,
      },
      update: {
        name: row.name,
        phone: row.phone || null,
        reminderDay: row.reminderDay ? Number(row.reminderDay) : null,
      },
    });
    updated++;
  }

  console.log(`Imported ${updated} tenants, skipped ${skipped} empty rows.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

import "dotenv/config";
import { readFileSync } from "node:fs";
import { db } from "../src/lib/db";

// Imports "Data Penghuni Kost - Copy of Sheet1-2.csv" (Name, Bank, Rekening, real name) onto transfer recipients, matched by name.
const CSV_PATH = process.argv[2] ?? "Data Penghuni Kost - Copy of Sheet1-2.csv";

async function main() {
  const [, ...lines] = readFileSync(CSV_PATH, "utf8").trim().split(/\r?\n/);
  const recipients = await db.recipient.findMany();

  for (const line of lines) {
    const [name, bank, account, holder] = line.split(",").map((c) => c.trim());
    if (!name) continue;
    const match = recipients.find((r) => r.name.toLowerCase() === name.toLowerCase());
    if (!match) {
      console.warn(`No recipient named "${name}" — skipped`);
      continue;
    }
    await db.recipient.update({
      where: { id: match.id },
      data: { bankName: bank || null, accountNumber: account?.replace(/\s/g, "") || null, accountHolder: holder || null },
    });
    console.log(`${match.name}: ${bank} ${account} (${holder ?? "-"})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

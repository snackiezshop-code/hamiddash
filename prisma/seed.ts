import "dotenv/config";
import { PrismaClient, RoomStatus, ExpenseCategory } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

// From "Laporan Bulanan Kost Mujair 12.xlsx" (Agustus 2026 sheet, Juli 2026 where Agustus shows "-").
const rooms: { number: number; rent: number; july: RoomStatus; august: RoomStatus }[] = [
  { number: 1, rent: 500000, july: "LUNAS", august: "RUSAK" },
  { number: 2, rent: 500000, july: "LUNAS", august: "LUNAS" },
  { number: 3, rent: 500000, july: "LUNAS", august: "LUNAS" },
  { number: 4, rent: 500000, july: "LUNAS", august: "LUNAS" },
  { number: 5, rent: 500000, july: "LUNAS", august: "LUNAS" },
  { number: 6, rent: 500000, july: "LUNAS", august: "LUNAS" },
  { number: 7, rent: 500000, july: "LUNAS", august: "LUNAS" },
  { number: 8, rent: 500000, july: "LUNAS", august: "LUNAS" },
  { number: 9, rent: 500000, july: "LUNAS", august: "LUNAS" },
  { number: 10, rent: 500000, july: "LUNAS", august: "LUNAS" },
  { number: 11, rent: 400000, july: "LUNAS", august: "LUNAS" },
  { number: 12, rent: 250000, july: "LUNAS", august: "LUNAS" },
  { number: 13, rent: 500000, july: "LUNAS", august: "KOSONG" },
  { number: 14, rent: 500000, july: "LUNAS", august: "LUNAS" },
  { number: 15, rent: 500000, july: "TAHUNAN", august: "TAHUNAN" },
  { number: 16, rent: 500000, july: "LUNAS", august: "LUNAS" },
];

// Kamar 5 was billed Rp600.000 in Juli 2026.
const julyAmount = (n: number, rent: number, s: RoomStatus) =>
  s === "LUNAS" ? (n === 5 ? 600000 : rent) : 0;

const recipients = [
  { name: "Pengurus", role: "Pengurus" },
  { name: "Mimi", role: "Pewaris" },
  { name: "Bunda", role: "Pewaris" },
  { name: "Cecek", role: "Pewaris" },
  { name: "Mama", role: "Pewaris" },
  { name: "BNI", role: "Bank" },
];

type E = [ExpenseCategory, string, number];
const julyExpenses: E[] = [
  ["LISTRIK", "Listrik", 363000],
  ["PDAM", "PDAM", 448000],
  ["CLEANING_SERVICE", "Cleaning Service", 700000],
  ["KEBERSIHAN", "Sapu Ijok dan Pel", 50000],
  ["PERLENGKAPAN", "Bohlam 9 Watt Krisbow", 260000],
  ["ADMINISTRASI", "Bank adm.", 50000],
  ["PENGURUS", "Pengurus", 700000],
  ["BAGI_HASIL", "Mama", 1500000],
];
const augustExpenses: E[] = [
  ["LISTRIK", "Listrik", 380000],
  ["PDAM", "PDAM", 435000],
  ["CLEANING_SERVICE", "Cleaning Service", 700000],
  ["KEBERSIHAN", "Vixal/Pel, Sapu/Kemoceng", 200000],
  ["PERBAIKAN", "Perbaikan Mesin air 2 unit", 200000],
  ["PERLENGKAPAN", "Gembok + Pacok", 100000],
  ["ADMINISTRASI", "Administrasi", 50000],
  ["PENGURUS", "Pengurus", 700000],
  ["BAGI_HASIL", "Bagi Hasil", 1500000],
];

async function main() {
  if ((await prisma.room.count()) > 0) {
    console.log("Database already seeded — skipping.");
    return;
  }

  const roomIds = new Map<number, string>();
  for (const r of rooms) {
    const room = await prisma.room.create({
      data: { number: r.number, monthlyRent: r.rent, status: r.august },
    });
    roomIds.set(r.number, room.id);
  }

  const recipientIds: string[] = [];
  for (const r of recipients) {
    recipientIds.push((await prisma.recipient.create({ data: r })).id);
  }

  await prisma.cashPeriod.create({
    data: {
      year: 2026,
      month: 7,
      openingBalance: 8600000,
      roomIncomes: {
        create: rooms.map((r) => ({
          roomId: roomIds.get(r.number)!,
          status: r.july,
          amount: julyAmount(r.number, r.rent, r.july),
        })),
      },
      expenses: {
        create: julyExpenses.map(([category, description, amount]) => ({ category, description, amount })),
      },
    },
  });

  await prisma.cashPeriod.create({
    data: {
      year: 2026,
      month: 8,
      openingBalance: 11779000,
      roomIncomes: {
        create: rooms.map((r) => ({
          roomId: roomIds.get(r.number)!,
          status: r.august,
          amount: r.august === "LUNAS" ? r.rent : 0,
        })),
      },
      additionalIncomes: {
        create: [{ description: "Pemasukan Tambahan 1", amount: 500000 }],
      },
      expenses: {
        create: augustExpenses.map(([category, description, amount]) => ({ category, description, amount })),
      },
      transferChecks: {
        create: recipientIds.map((recipientId) => ({ recipientId })),
      },
    },
  });

  await prisma.checklistItem.createMany({
    data: [
      { title: "Perbaiki Kamar 1 (status Rusak)", category: "Perawatan", roomId: roomIds.get(1) },
      { title: "Cari penyewa Kamar 13", category: "Admin", roomId: roomIds.get(13) },
    ],
  });

  console.log("Seeded 16 rooms, 6 recipients, Juli & Agustus 2026 cash books.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

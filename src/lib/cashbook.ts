import "server-only";
import { db } from "./db";
import { shiftMonth } from "./format";

type PeriodTotalsInput = {
  openingBalance: number;
  roomIncomes: { amount: number }[];
  additionalIncomes: { amount: number }[];
  expenses: { amount: number }[];
};

export function summarize(p: PeriodTotalsInput) {
  const roomTotal = p.roomIncomes.reduce((s, r) => s + r.amount, 0);
  const additionalTotal = p.additionalIncomes.reduce((s, r) => s + r.amount, 0);
  const incomeTotal = roomTotal + additionalTotal;
  const expenseTotal = p.expenses.reduce((s, r) => s + r.amount, 0);
  const netFlow = incomeTotal - expenseTotal;
  return {
    roomTotal,
    additionalTotal,
    incomeTotal,
    expenseTotal,
    netFlow,
    openingBalance: p.openingBalance,
    closingBalance: p.openingBalance + netFlow,
  };
}

export const periodInclude = {
  roomIncomes: { include: { room: { include: { tenant: true } } }, orderBy: { room: { number: "asc" } } },
  additionalIncomes: { orderBy: { createdAt: "asc" } },
  expenses: { orderBy: { createdAt: "asc" } },
  transferChecks: { include: { recipient: true }, orderBy: { recipient: { createdAt: "asc" } } },
} as const;

export async function getPeriod(year: number, month: number) {
  return db.cashPeriod.findUnique({ where: { year_month: { year, month } }, include: periodInclude });
}

export async function getLatestPeriod() {
  return db.cashPeriod.findFirst({ orderBy: [{ year: "desc" }, { month: "desc" }], include: periodInclude });
}

export async function closingBalanceOf(year: number, month: number) {
  const p = await db.cashPeriod.findUnique({
    where: { year_month: { year, month } },
    include: { roomIncomes: true, additionalIncomes: true, expenses: true },
  });
  return p ? summarize(p).closingBalance : null;
}

// Saldo Kas Awal is stored per period but must always equal the previous period's Saldo Kas Akhir.
// Re-sync every later period whenever an earlier one changes.
export async function recarryBalances(fromYear: number, fromMonth: number) {
  const later = await db.cashPeriod.findMany({
    where: { OR: [{ year: { gt: fromYear } }, { year: fromYear, month: { gt: fromMonth } }] },
    orderBy: [{ year: "asc" }, { month: "asc" }],
    select: { id: true, year: true, month: true },
  });
  for (const p of later) {
    const prev = shiftMonth(p.year, p.month, -1);
    const closing = await closingBalanceOf(prev.year, prev.month);
    if (closing !== null) await db.cashPeriod.update({ where: { id: p.id }, data: { openingBalance: closing } });
  }
}

export async function createPeriod(year: number, month: number) {
  const prev = shiftMonth(year, month, -1);
  const opening = (await closingBalanceOf(prev.year, prev.month)) ?? 0;
  const [rooms, recipients] = await Promise.all([
    db.room.findMany({ orderBy: { number: "asc" } }),
    db.recipient.findMany({ where: { isActive: true } }),
  ]);
  // New months start with the room's current status; paid-up rooms start as unpaid until collected.
  return db.cashPeriod.create({
    data: {
      year,
      month,
      openingBalance: opening,
      roomIncomes: {
        create: rooms.map((r) => ({
          roomId: r.id,
          status: r.status === "LUNAS" ? "TUNDA_BAYAR" : r.status,
          amount: 0,
        })),
      },
      transferChecks: { create: recipients.map((r) => ({ recipientId: r.id })) },
    },
  });
}

export async function isLatestPeriod(periodId: string) {
  const latest = await db.cashPeriod.findFirst({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    select: { id: true },
  });
  return latest?.id === periodId;
}

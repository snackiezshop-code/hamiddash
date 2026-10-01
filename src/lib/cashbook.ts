import "server-only";
import { cache } from "react";
import { db } from "./db";
import { shiftMonth, todayJakarta } from "./format";

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

// A new month starts by itself: once the Jakarta calendar passes into a month with no cash book,
// every missing month up to now is created and paid rooms switch back to unpaid.
// Called from the app layout, the pages that show room status, and the daily cron; cached per request.
export const ensureCurrentPeriod = cache(async () => {
  const today = todayJakarta();
  const now = { year: today.getUTCFullYear(), month: today.getUTCMonth() + 1 };
  const latest = await db.cashPeriod.findFirst({ orderBy: [{ year: "desc" }, { month: "desc" }], select: { year: true, month: true } });
  if (!latest) return;
  let next = shiftMonth(latest.year, latest.month, 1);
  while (next.year * 12 + next.month <= now.year * 12 + now.month) {
    try {
      await createPeriod(next.year, next.month);
      await db.room.updateMany({ where: { status: "LUNAS" }, data: { status: "TUNDA_BAYAR" } });
    } catch (e) {
      // Another request created this month first (unique year+month); carry on.
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
    next = shiftMonth(next.year, next.month, 1);
  }
});

export async function isLatestPeriod(periodId: string) {
  const latest = await db.cashPeriod.findFirst({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    select: { id: true },
  });
  return latest?.id === periodId;
}

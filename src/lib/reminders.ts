import "server-only";
import { db } from "./db";
import { daysBetween, dueDateOf, reminderText, shiftMonth, todayJakarta, waLink } from "./format";

// Days before the due date that a reminder is flagged: 3 days ahead, then on the day itself.
export const REMINDER_OFFSETS = [3, 0] as const;
// Once late: nudge the day after the due date, then every 3 days until the room is marked paid.
export const OVERDUE_EVERY = 3;
// How many past cash books to look back through for unpaid rent.
const OVERDUE_LOOKBACK_MONTHS = 3;

export type DueReminder = {
  tenantName: string;
  roomNumber: number;
  amount: number;
  year: number;
  month: number;
  daysUntilDue: number; // negative once overdue
  alertToday: boolean; // include in today's push alert
  text: string;
  waHref: string | null;
};

const ym = (year: number, month: number) => year * 12 + month;

export function isOverdueAlertDay(daysLate: number) {
  return daysLate >= 1 && (daysLate - 1) % OVERDUE_EVERY === 0;
}

// Every tenant with a reminder day who still owes rent for a month whose due date is at most
// 3 days away or already past. "Still owes": the month's cash-book row is Unpaid; if that cash
// book hasn't been started yet, every monthly payer owes (room status Paid/Unpaid).
export async function dueReminders(today: Date = todayJakarta()): Promise<DueReminder[]> {
  const curYear = today.getUTCFullYear();
  const curMonth = today.getUTCMonth() + 1;
  const months = Array.from({ length: OVERDUE_LOOKBACK_MONTHS + 2 }, (_, i) =>
    shiftMonth(curYear, curMonth, i - OVERDUE_LOOKBACK_MONTHS)); // past months … this month, next month

  const [tenants, periods, latest] = await Promise.all([
    db.tenant.findMany({ where: { reminderDay: { not: null } }, include: { room: true } }),
    db.cashPeriod.findMany({
      where: { OR: months.map((m) => ({ year: m.year, month: m.month })) },
      include: { roomIncomes: { select: { roomId: true, status: true } } },
    }),
    db.cashPeriod.findFirst({ orderBy: [{ year: "desc" }, { month: "desc" }], select: { year: true, month: true } }),
  ]);
  const latestYm = latest ? ym(latest.year, latest.month) : 0;

  const out: DueReminder[] = [];
  for (const m of months) {
    const period = periods.find((p) => p.year === m.year && p.month === m.month);
    const started = latestYm >= ym(m.year, m.month);
    if (started && !period) continue; // a gap in the cash book: nothing to go on
    for (const tenant of tenants) {
      const days = daysBetween(today, dueDateOf(m.year, m.month, tenant.reminderDay!));
      if (days > REMINDER_OFFSETS[0]) continue;
      // Tenants who moved in after this month's due date never owed it.
      if (tenant.moveInDate && tenant.moveInDate > dueDateOf(m.year, m.month, tenant.reminderDay!)) continue;
      const room = tenant.room;
      const owes = started
        ? period!.roomIncomes.find((i) => i.roomId === room.id)?.status === "TUNDA_BAYAR"
        : room.status === "LUNAS" || room.status === "TUNDA_BAYAR";
      if (!owes) continue;

      const text = reminderText({
        name: tenant.name, roomNumber: room.number, amount: room.monthlyRent,
        year: m.year, month: m.month, dueDay: tenant.reminderDay,
      }, today);
      out.push({
        tenantName: tenant.name, roomNumber: room.number, amount: room.monthlyRent,
        year: m.year, month: m.month, daysUntilDue: days,
        alertToday: (REMINDER_OFFSETS as readonly number[]).includes(days) || isOverdueAlertDay(-days),
        text, waHref: waLink(tenant.phone, text),
      });
    }
  }
  // Most overdue first, then due today, then upcoming.
  return out.sort((a, b) => a.daysUntilDue - b.daysUntilDue || a.roomNumber - b.roomNumber);
}

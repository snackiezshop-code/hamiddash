import "server-only";
import { db } from "./db";
import { annualText, daysBetween, dueDateOf, reminderText, shiftMonth, todayJakarta, waLink } from "./format";
import { annualStates } from "./annual";
import { openPromises } from "./promises";
import { PROMISE_TAG } from "./reminder-items";

// Days before the due date that a reminder is flagged: 3 days ahead, then on the day itself.
export const REMINDER_OFFSETS = [3, 0] as const;
// Once late: nudge the day after the due date, then every 3 days until the room is marked paid.
export const OVERDUE_EVERY = 3;
// How many past cash books to look back through for unpaid rent.
const OVERDUE_LOOKBACK_MONTHS = 3;

export type DueReminder = {
  kind: "monthly" | "annual";
  tenantName: string;
  roomId: string;
  roomNumber: number;
  phone: string | null;
  amount: number; // still owed: the rest of a part-paid month, or the full rent
  paid: number; // already received toward it (bayar sebagian), 0 if nothing yet
  incomeId: string | null; // the cash-book row, so a part payment can be recorded against it
  year: number;
  month: number;
  daysUntilDue: number; // negative once overdue
  alertToday: boolean; // include in today's push alert
  text: string;
  waHref: string | null;
  // Set when the promised date has passed and the rent is still unpaid ("janji lewat").
  lapsedPromise: { id: string; date: Date } | null;
  // Yearly rent only: the term being paid and whether part of it is already in.
  annual: { termLabel: string; partial: boolean; paid: number; rent: number } | null;
};

// Yearly rent alerts 7 days before it's due, on the day, then every 3 days while late.
export const ANNUAL_LEAD_DAYS = 7;

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

  const [tenants, periods, latest, promises, annual] = await Promise.all([
    db.tenant.findMany({ where: { reminderDay: { not: null } }, include: { room: true } }),
    db.cashPeriod.findMany({
      where: { OR: months.map((m) => ({ year: m.year, month: m.month })) },
      include: { roomIncomes: { select: { id: true, roomId: true, status: true, amount: true } } },
    }),
    db.cashPeriod.findFirst({ orderBy: [{ year: "desc" }, { month: "desc" }], select: { year: true, month: true } }),
    openPromises(today),
    annualStates(today),
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
      const income = started ? period!.roomIncomes.find((i) => i.roomId === room.id) : undefined;
      const owes = started ? income?.status === "TUNDA_BAYAR" : room.status === "LUNAS" || room.status === "TUNDA_BAYAR";
      if (!owes) continue;
      const paid = Math.min(income?.amount ?? 0, room.monthlyRent);
      // A promise to pay by a date that hasn't passed yet: don't chase this room until then.
      const promise = promises.get(room.id);
      if (promise && daysBetween(today, promise.date) >= 0) continue;

      // Past a promised date, the message is about the broken promise for the month it covered.
      const text = promise?.text && !promise.annual && promise.year === m.year && promise.month === m.month
        ? promise.text
        : reminderText({
          name: tenant.name, roomNumber: room.number, amount: room.monthlyRent, paid,
          year: m.year, month: m.month, dueDay: tenant.reminderDay,
        }, today);
      out.push({
        kind: "monthly", annual: null,
        tenantName: tenant.name, roomId: room.id, roomNumber: room.number, phone: tenant.phone,
        amount: room.monthlyRent - paid, paid, incomeId: income?.id ?? null,
        year: m.year, month: m.month, daysUntilDue: days,
        // A lapsed promise alerts through its own reminder, so the rent alert stays quiet (no double alert).
        alertToday: !promise && ((REMINDER_OFFSETS as readonly number[]).includes(days) || isOverdueAlertDay(-days)),
        text, waHref: waLink(tenant.phone, text),
        lapsedPromise: promise ? { id: promise.id, date: promise.date } : null,
      });
    }
  }
  for (const a of annual.values()) {
    const days = a.daysUntilDue;
    if (days > ANNUAL_LEAD_DAYS) continue;
    const promise = promises.get(a.roomId);
    if (promise && daysBetween(today, promise.date) >= 0) continue;
    const text = promise?.text ?? annualText({ name: a.tenantName, roomNumber: a.roomNumber, amount: a.remaining, paid: a.paid, partial: a.partial, dueDate: a.dueDate, daysUntilDue: days, termLabel: a.termLabel });
    out.push({
      kind: "annual", tenantName: a.tenantName, roomId: a.roomId, roomNumber: a.roomNumber, phone: a.phone, amount: a.remaining, paid: a.paid, incomeId: null,
      year: a.payTermStart.getUTCFullYear(), month: a.payTermStart.getUTCMonth() + 1, daysUntilDue: days,
      alertToday: !promise && (days === ANNUAL_LEAD_DAYS || days === 0 || isOverdueAlertDay(-days)),
      text, waHref: waLink(a.phone, text),
      lapsedPromise: promise ? { id: promise.id, date: promise.date } : null,
      annual: { termLabel: a.termLabel, partial: a.partial, paid: a.paid, rent: a.rent },
    });
  }
  // Most overdue first, then due today, then upcoming.
  return out.sort((a, b) => a.daysUntilDue - b.daysUntilDue || a.roomNumber - b.roomNumber);
}

// ---------- Your own reminders (bills, repairs, admin) ----------

export type DueItem = {
  id: string;
  title: string;
  amount: number | null;
  dueDate: Date;
  daysUntilDue: number; // negative once overdue
  alertToday: boolean; // include in today's push alert
};

// Open reminders due within 3 days (or their own alert lead time, if longer) or already late,
// most overdue first. Undated ones never alert.
export async function dueItems(today: Date = todayJakarta()): Promise<DueItem[]> {
  const rows = await db.reminder.findMany({ where: { isDone: false, dueDate: { not: null } }, orderBy: { dueDate: "asc" } });
  return rows
    // A payment promise only comes up on its date (and after, while unpaid), never ahead of it.
    .filter((r) => daysBetween(today, r.dueDate!) <= (r.tag === PROMISE_TAG ? 0 : Math.max(REMINDER_OFFSETS[0], r.remindBefore)))
    .map((r) => {
      const days = daysBetween(today, r.dueDate!);
      return {
        id: r.id, title: r.title, amount: r.amount, dueDate: r.dueDate!, daysUntilDue: days,
        alertToday: (r.tag !== PROMISE_TAG && days === r.remindBefore) || days === 0 || isOverdueAlertDay(-days),
      };
    });
}

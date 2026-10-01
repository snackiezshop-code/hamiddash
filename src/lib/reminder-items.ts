import type { Repeat } from "@/generated/prisma/enums";
import { daysBetween } from "./format";

// Your own reminders (bills, repairs, admin), as opposed to rent reminders, which come from tenants.
// Client-safe: no database access here, so the reminder sheet can use the same labels and date maths.

// A tenant's promise to pay rent by a date ("janji bayar") is stored as a reminder with this tag and
// the room's id. While it's open and not yet due, that room's rent isn't chased; marking the room
// paid closes it.
export const PROMISE_TAG = "PROMISE";

export const REPEAT_OPTIONS: Repeat[] = ["NONE", "WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"];

export const REPEAT_LABEL: Record<Repeat, string> = {
  NONE: "Sekali",
  WEEKLY: "Tiap minggu",
  BIWEEKLY: "Tiap 2 minggu",
  MONTHLY: "Tiap bulan",
  YEARLY: "Tiap tahun",
};

// Each reminder picks how many days ahead its push alert fires (remindBefore); it also fires on the
// day, and once late, the day after and then every 3 days (the rent rhythm, isOverdueAlertDay).
export const REMIND_OPTIONS = [0, 1, 2, 3, 7];

export function remindLabel(days: number) {
  if (days === 0) return "Pada harinya";
  if (days === 7) return "1 minggu sebelumnya";
  return `${days} hari sebelumnya`;
}

// The next due date after `due` for a repeating reminder. Monthly and yearly keep the day of the
// month where they can and clamp to short months (31 Jan → 28 Feb).
export function nextDueDate(due: Date, repeat: Repeat) {
  const DAY = 24 * 60 * 60 * 1000;
  if (repeat === "WEEKLY") return new Date(due.getTime() + 7 * DAY);
  if (repeat === "BIWEEKLY") return new Date(due.getTime() + 14 * DAY);
  const months = repeat === "MONTHLY" ? 1 : repeat === "YEARLY" ? 12 : 0;
  if (!months) return due;
  const y = due.getUTCFullYear();
  const m = due.getUTCMonth() + months;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(due.getUTCDate(), last)));
}

export function daysUntil(due: Date | null, today: Date) {
  return due ? daysBetween(today, due) : null;
}

export function dueLabel(days: number | null) {
  if (days === null) return "Tanpa tanggal";
  if (days < 0) return `Telat ${-days} hari`;
  if (days === 0) return "Hari ini";
  if (days === 1) return "Besok";
  return `${days} hari lagi`;
}

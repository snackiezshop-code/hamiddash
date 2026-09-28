import type { Repeat } from "@/generated/prisma/enums";
import { daysBetween } from "./format";

// Your own reminders (bills, repairs, admin), as opposed to rent reminders, which come from tenants.
// Client-safe: no database access here, so the reminder sheet can use the same labels and date maths.

export const REPEAT_OPTIONS: Repeat[] = ["NONE", "WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"];

export const REPEAT_LABEL: Record<Repeat, string> = {
  NONE: "Once",
  WEEKLY: "Every week",
  BIWEEKLY: "Every 2 weeks",
  MONTHLY: "Every month",
  YEARLY: "Every year",
};

// Push alerts fire the day before and on the day; once late, the day after and then every 3 days
// (the same overdue rhythm as rent, see isOverdueAlertDay in reminders.ts).
export const ALERT_DAYS_BEFORE = [1, 0];

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
  if (days === null) return "No date";
  if (days < 0) return `${-days} day${days < -1 ? "s" : ""} late`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

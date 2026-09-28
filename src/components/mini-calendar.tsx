import { todayJakarta } from "@/lib/format";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// One dot per day with something due: a tenant's rent reminder day or one of your own reminders.
export type ReminderEntry = { day: number; label: string };

export function MiniCalendar({ reminders }: { reminders: ReminderEntry[] }) {
  // Jakarta's date, so the server render (UTC on Vercel) and the phone agree on "today".
  const now = todayJakarta();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const today = now.getUTCDate();

  const remindersByDay = new Map<number, ReminderEntry[]>();
  for (const r of reminders) remindersByDay.set(r.day, [...(remindersByDay.get(r.day) ?? []), r]);

  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leadingBlanks = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7; // Monday-first
  const cells = [...Array(leadingBlanks).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="rounded-2xl bg-cream p-3.5">
      <div className="mb-2.5 px-0.5">
        <span className="text-xs font-semibold text-ink-soft">{MONTH_NAMES[month]} {year}</span>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="text-[10px] font-semibold text-ink-soft">{w}</span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`b${i}`} />;
          const reminders = remindersByDay.get(day);
          const isToday = day === today;
          const title = reminders?.length
            ? reminders.map((r) => r.label).join(", ")
            : undefined;
          return (
            <span key={day} title={title} className="relative mx-auto flex h-6 w-6 items-center justify-center">
              <span className={`num flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                isToday ? "bg-ink font-bold text-white" : "text-ink"
              }`}>
                {day}
              </span>
              {reminders && (
                <span className={`absolute -bottom-0.5 h-1 w-1 rounded-full ${isToday ? "bg-terra" : "bg-terra-strong"}`} aria-hidden />
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

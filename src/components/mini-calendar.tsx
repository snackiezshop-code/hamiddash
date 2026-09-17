const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export type ReminderEntry = { day: number; roomNumber: number; name: string };

export function MiniCalendar({ reminders }: { reminders: ReminderEntry[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const remindersByDay = new Map<number, ReminderEntry[]>();
  for (const r of reminders) remindersByDay.set(r.day, [...(remindersByDay.get(r.day) ?? []), r]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
  const cells = [...Array(leadingBlanks).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="mb-4 rounded-2xl bg-white/5 p-3.5">
      <div className="mb-2.5 flex items-center justify-between px-0.5">
        <span className="text-xs font-semibold text-cream/80">{MONTH_NAMES[month]} {year}</span>
        {remindersByDay.size > 0 && <span className="h-1.5 w-1.5 rounded-full bg-butter" aria-hidden />}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="text-[10px] font-semibold text-cream/40">{w}</span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`b${i}`} />;
          const reminders = remindersByDay.get(day);
          const isToday = day === today;
          const title = reminders?.length
            ? reminders.map((r) => `Room ${r.roomNumber} · ${r.name}`).join(", ")
            : undefined;
          return (
            <span key={day} title={title} className="relative mx-auto flex h-6 w-6 items-center justify-center">
              <span className={`num flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                isToday ? "bg-cream font-bold text-ink" : "text-cream/85"
              }`}>
                {day}
              </span>
              {reminders && !isToday && (
                <span className="absolute bottom-0 h-1 w-1 rounded-full bg-butter" aria-hidden />
              )}
              {reminders && isToday && (
                <span className="absolute bottom-0 h-1 w-1 rounded-full bg-blush-deep" aria-hidden />
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

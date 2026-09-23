import { dueReminders, type DueReminder } from "@/lib/reminders";
import { periodLabel, rupiah } from "@/lib/format";
import { Empty, PageHeader, Section } from "@/components/ui";
import { Avatar, CountPill, ListRow } from "@/components/kit";
import { PushToggle } from "@/components/push-toggle";
import { IconWhatsApp } from "@/components/icons";

// Where the daily push alert lands: today's WhatsApp reminders, each one tap away from sending.
export default async function RemindersPage() {
  const due = await dueReminders();
  const late = due.filter((d) => d.daysUntilDue < 0);
  const today = due.filter((d) => d.daysUntilDue === 0);
  const soon = due.filter((d) => d.daysUntilDue > 0);

  return (
    <>
      <PageHeader title="Reminders" subtitle="Unpaid rent that's due within 3 days, due today, or overdue" />
      <div className="grid gap-4">
        <Section title="Alerts">
          <PushToggle publicKey={process.env.VAPID_PUBLIC_KEY ?? null} />
        </Section>

        {due.length === 0 ? (
          <Section title="To send today">
            <Empty>Nothing to send. Unpaid tenants show up here from 3 days before their due date.</Empty>
          </Section>
        ) : (
          <>
            {late.length > 0 && <ReminderList title="Overdue" items={late} />}
            {today.length > 0 && <ReminderList title="Due today" items={today} />}
            {soon.length > 0 && <ReminderList title="Due soon" items={soon} />}
          </>
        )}
      </div>
    </>
  );
}

function ReminderList({ title, items }: { title: string; items: DueReminder[] }) {
  return (
    <Section title={title} action={<CountPill n={items.length} />}>
      <ul className="divide-y divide-line">
        {items.map((r) => (
          <li key={`${r.roomNumber}-${r.year}-${r.month}`} className="py-1">
            <ListRow
              leading={<Avatar name={r.tenantName} tone={r.daysUntilDue < 0 ? "blush" : r.daysUntilDue === 0 ? "butter" : "peri"} />}
              title={`Room ${r.roomNumber} · ${r.tenantName}`}
              subtitle={
                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  <span className="num">{rupiah(r.amount)} · {periodLabel(r.year, r.month)}</span>
                  <span className={`pill py-0 ${r.daysUntilDue < 0 ? "bg-terra-strong text-[#F6F1E5]" : "bg-butter text-butter-deep"}`}>
                    {r.daysUntilDue < 0 ? `${-r.daysUntilDue} day${r.daysUntilDue < -1 ? "s" : ""} late`
                      : r.daysUntilDue === 0 ? "Due today" : `Due in ${r.daysUntilDue} day${r.daysUntilDue > 1 ? "s" : ""}`}
                  </span>
                </span>
              }
              trailing={r.waHref ? (
                <a href={r.waHref} target="_blank" rel="noopener noreferrer"
                  className="btn btn-sm shrink-0 bg-mint text-mint-deep hover:bg-mint/70">
                  <IconWhatsApp /> Send
                </a>
              ) : (
                <span className="text-xs text-ink-soft">No WhatsApp number</span>
              )} />
            <details className="mb-2 pl-[52px]">
              <summary className="inline-flex min-h-11 cursor-pointer items-center text-xs font-semibold text-ink-soft hover:text-ink">
                Preview message
              </summary>
              <p className="rounded-2xl bg-cream px-4 py-3 text-sm whitespace-pre-line">{r.text}</p>
            </details>
          </li>
        ))}
      </ul>
    </Section>
  );
}

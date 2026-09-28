import { db } from "@/lib/db";
import { dueReminders, type DueReminder } from "@/lib/reminders";
import { daysUntil } from "@/lib/reminder-items";
import { periodLabel, rupiah, todayJakarta } from "@/lib/format";
import { Empty, PageHeader, Section } from "@/components/ui";
import { Avatar, CountPill, ListRow } from "@/components/kit";
import { SegmentedLinks } from "@/components/kit-client";
import { PushToggle } from "@/components/push-toggle";
import { QuickAddButton } from "@/components/quick-add";
import { ReminderList, type ReminderItem } from "@/components/reminder-list";
import { IconPlus, IconWhatsApp } from "@/components/icons";

// Rent to chase (computed from tenants) and your own reminders (bills, repairs, admin).
// The daily push alert lands here.
export default async function RemindersPage({ searchParams }: PageProps<"/pengingat">) {
  const { status } = await searchParams;
  const showDone = status === "done";
  const today = todayJakarta();

  const [rent, rows, rooms, doneCount] = await Promise.all([
    dueReminders(today),
    db.reminder.findMany({
      where: { isDone: showDone },
      orderBy: showDone ? [{ doneAt: "desc" }] : [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      take: showDone ? 50 : undefined,
    }),
    db.room.findMany({ orderBy: { number: "asc" }, select: { id: true, number: true } }),
    db.reminder.count({ where: { isDone: true } }),
  ]);
  const roomNo = new Map(rooms.map((r) => [r.id, r.number]));
  const items: ReminderItem[] = rows.map((r) => ({
    id: r.id, title: r.title, tag: r.tag, roomId: r.roomId, roomNumber: r.roomId ? roomNo.get(r.roomId) ?? null : null,
    dueDate: r.dueDate, daysUntilDue: daysUntil(r.dueDate, today), repeat: r.repeat, remindBefore: r.remindBefore,
    amount: r.amount, category: r.category, isDone: r.isDone, doneAt: r.doneAt,
  }));
  const dueSoon = items.filter((r) => r.daysUntilDue !== null && r.daysUntilDue <= 1).length;

  return (
    <>
      <PageHeader title="Reminders" subtitle="Rent to chase and everything else you need to remember"
        actions={<QuickAddButton kind="reminder" className="btn-primary"><IconPlus width={16} height={16} /> Add reminder</QuickAddButton>} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Section title="Your reminders" action={!showDone && dueSoon > 0 ? <CountPill n={dueSoon} /> : undefined}>
          <div className="-mt-1 mb-3">
            <SegmentedLinks label="Reminder status" items={[
              { href: "/pengingat", label: "To do", active: !showDone },
              { href: "/pengingat?status=done", label: `Done${doneCount ? ` (${doneCount})` : ""}`, active: showDone },
            ]} />
          </div>
          {items.length === 0 ? (
            <Empty>{showDone ? "Nothing ticked off yet." : "Nothing to remember right now. Add one with the button above, like a bill that repeats every month."}</Empty>
          ) : (
            <ReminderList items={items} rooms={rooms} />
          )}
        </Section>

        <div className="flex min-w-0 flex-col gap-4">
          <Section title="Rent to chase" action={rent.length ? <CountPill n={rent.length} /> : undefined}>
            {rent.length === 0 ? (
              <Empty>No rent to chase. Unpaid tenants show up here from 3 days before their due date.</Empty>
            ) : (
              <RentList items={rent} />
            )}
          </Section>

          <Section title="Daily alert">
            <PushToggle publicKey={process.env.VAPID_PUBLIC_KEY ?? null} />
          </Section>
        </div>
      </div>
    </>
  );
}

function RentList({ items }: { items: DueReminder[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((r) => (
        <li key={`${r.roomNumber}-${r.year}-${r.month}`} className="py-1">
          <ListRow
            leading={<Avatar name={r.tenantName} tone={r.daysUntilDue < 0 ? "blush" : r.daysUntilDue === 0 ? "butter" : "peri"} />}
            title={`Room ${r.roomNumber} · ${r.tenantName}`}
            subtitle={
              <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <span className="num">{rupiah(r.amount)} · {periodLabel(r.year, r.month)}</span>
                <span className={`pill py-0 ${r.daysUntilDue < 0 ? "bg-blush text-blush-deep" : "bg-butter text-butter-deep"}`}>
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
            <p className="rounded-xl bg-cream px-4 py-3 text-sm whitespace-pre-line">{r.text}</p>
          </details>
        </li>
      ))}
    </ul>
  );
}

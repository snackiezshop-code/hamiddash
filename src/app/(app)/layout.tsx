import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { periodLabel, periodSlug } from "@/lib/format";
import { MobileTopBar, Sidebar } from "@/components/nav";
import { dueItems, dueReminders } from "@/lib/reminders";
import { todayJakarta } from "@/lib/format";
import { QuickAddProvider, type QuickAddData } from "@/components/quick-add";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireAdmin();

  const today = todayJakarta();
  const [tenants, rooms, latest, rent, own, monthReminders] = await Promise.all([
    db.tenant.findMany({
      where: { reminderDay: { not: null } },
      include: { room: { select: { number: true } } },
    }),
    db.room.findMany({ orderBy: { number: "asc" }, select: { id: true, number: true, tenant: { select: { id: true } } } }),
    db.cashPeriod.findFirst({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: {
        roomIncomes: {
          where: { status: "TUNDA_BAYAR" },
          include: { room: { include: { tenant: { select: { name: true } } } } },
          orderBy: { room: { number: "asc" } },
        },
      },
    }),
    dueReminders(today),
    dueItems(today),
    db.reminder.findMany({
      where: {
        isDone: false,
        dueDate: {
          gte: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)),
          lt: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)),
        },
      },
      select: { title: true, dueDate: true },
    }),
  ]);
  // Calendar dots: each tenant's rent reminder day plus your own reminders due this month.
  const reminders = [
    ...tenants.map((t) => ({ day: t.reminderDay!, label: `Rent · Room ${t.room.number} · ${t.name}` })),
    ...monthReminders.map((r) => ({ day: r.dueDate!.getUTCDate(), label: r.title })),
  ];
  // What's due today or late: the badge on the Reminders menu item.
  const dueCount = rent.filter((r) => r.daysUntilDue <= 0).length + own.filter((r) => r.daysUntilDue <= 0).length;

  const quickAdd: QuickAddData = {
    period: latest ? { id: latest.id, label: periodLabel(latest.year, latest.month) } : null,
    unpaid: (latest?.roomIncomes ?? []).map((i) => ({
      incomeId: i.id, roomNumber: i.room.number, tenant: i.room.tenant?.name ?? null, rent: i.room.monthlyRent,
    })),
    vacantRooms: rooms.filter((r) => !r.tenant).map((r) => ({ id: r.id, number: r.number })),
    rooms: rooms.map((r) => ({ id: r.id, number: r.number })),
  };

  // Straight to the latest month: /kas only redirects there, which shows a blank screen mid-hop.
  const cashHref = latest ? `/kas/${periodSlug(latest.year, latest.month)}` : "/kas";

  return (
    <QuickAddProvider data={quickAdd}>
      <MobileTopBar cashHref={cashHref} dueCount={dueCount} />
      <div className="safe-gutter mx-auto flex max-w-[1400px] gap-8 pb-4 max-md:pt-5!">
        <Sidebar reminders={reminders} cashHref={cashHref} dueCount={dueCount} />
        <main className="min-w-0 flex-1 pb-[calc(3rem+env(safe-area-inset-bottom))] md:py-4 md:pr-2 md:pb-8">{children}</main>
      </div>
    </QuickAddProvider>
  );
}

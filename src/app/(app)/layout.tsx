import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureCurrentPeriod } from "@/lib/cashbook";
import { periodLabel, periodSlug, properName, todayJakarta } from "@/lib/format";
import { AppHeader, PageTabs } from "@/components/nav";
import { dueItems, dueReminders } from "@/lib/reminders";
import { getNotifications } from "@/lib/notifications";
import { Toaster } from "@/components/toast";
import { QuickAddProvider, type QuickAddData } from "@/components/quick-add";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireAdmin();
  await ensureCurrentPeriod();

  const today = todayJakarta();
  const [rooms, latest, rent, own, notifications] = await Promise.all([
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
    getNotifications(today),
  ]);
  // What's due today or late: the mark on the menu button and the Pengingat menu item.
  const dueCount = rent.filter((r) => r.daysUntilDue <= 0).length + own.filter((r) => r.daysUntilDue <= 0).length;

  const quickAdd: QuickAddData = {
    period: latest ? { id: latest.id, label: periodLabel(latest.year, latest.month) } : null,
    unpaid: (latest?.roomIncomes ?? []).map((i) => ({
      incomeId: i.id, roomNumber: i.room.number, tenant: i.room.tenant ? properName(i.room.tenant.name) : null, rent: i.room.monthlyRent,
    })),
    vacantRooms: rooms.filter((r) => !r.tenant).map((r) => ({ id: r.id, number: r.number })),
    rooms: rooms.map((r) => ({ id: r.id, number: r.number })),
  };

  // Straight to the latest month: /kas only redirects there, which shows a blank screen mid-hop.
  const cashHref = latest ? `/kas/${periodSlug(latest.year, latest.month)}` : "/kas";

  return (
    <QuickAddProvider data={quickAdd}>
      <AppHeader cashHref={cashHref} dueCount={dueCount} notifications={notifications} />
      {/* One column on every screen size, at most 560px wide. */}
      <div className="mx-auto max-w-[560px] pt-5 pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(1rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]">
        <main className="min-w-0">{children}</main>
        <PageTabs cashHref={cashHref} />
      </div>
      <Toaster />
    </QuickAddProvider>
  );
}

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { periodLabel, periodSlug } from "@/lib/format";
import { BottomBar, Sidebar } from "@/components/nav";
import { QuickAddProvider, type QuickAddData } from "@/components/quick-add";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireAdmin();

  const [tenants, rooms, latest] = await Promise.all([
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
  ]);
  const reminders = tenants.map((t) => ({ day: t.reminderDay!, roomNumber: t.room.number, name: t.name }));

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
      <div className="safe-gutter mx-auto flex max-w-[1400px] gap-6 pb-4">
        <Sidebar reminders={reminders} cashHref={cashHref} />
        <main className="min-w-0 flex-1 pb-[calc(9rem+env(safe-area-inset-bottom))] md:py-4 md:pr-2 md:pb-8">{children}</main>
        <BottomBar cashHref={cashHref} />
      </div>
    </QuickAddProvider>
  );
}

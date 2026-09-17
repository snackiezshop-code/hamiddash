import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { BottomBar, Sidebar } from "@/components/nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireAdmin();

  const tenants = await db.tenant.findMany({
    where: { reminderDay: { not: null } },
    include: { room: { select: { number: true } } },
  });
  const reminders = tenants.map((t) => ({ day: t.reminderDay!, roomNumber: t.room.number, name: t.name }));

  return (
    <div className="mx-auto flex max-w-[1400px] gap-6 p-4 md:p-4">
      <Sidebar reminders={reminders} />
      <main className="min-w-0 flex-1 pb-28 md:py-4 md:pr-2 md:pb-8">{children}</main>
      <BottomBar />
    </div>
  );
}

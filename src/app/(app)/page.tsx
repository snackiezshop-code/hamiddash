import Link from "next/link";
import { db } from "@/lib/db";
import { getLatestPeriod, summarize } from "@/lib/cashbook";
import {
  STATUS_TONE, TONE_CLASS, formatDate, periodLabel, periodSlug, reminderText, rupiah, rupiahShort,
} from "@/lib/format";
import { markRoomPaid, startPeriod, toggleTransfer } from "@/app/actions";
import { Donut, Empty, MiniBars, PageHeader, Section, Sparkline, StatCard, StatusPill, WaButton } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { NotificationBell, type Notification } from "@/components/notification-bell";
import { RoomSearch } from "@/components/room-search";
import { IconAlert, IconCalendar, IconCheck, IconDoor, IconWallet } from "@/components/icons";

export default async function DashboardPage() {
  const now = new Date();
  const [latest, rooms, periods, openTasks] = await Promise.all([
    getLatestPeriod(),
    db.room.findMany({ orderBy: { number: "asc" }, include: { tenant: true } }),
    db.cashPeriod.findMany({
      orderBy: [{ year: "asc" }, { month: "asc" }],
      include: { roomIncomes: true, additionalIncomes: true, expenses: true },
    }),
    db.checklistItem.findMany({ where: { isDone: false }, orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }], take: 5 }),
  ]);

  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const needsNewPeriod = !latest || latest.year * 12 + latest.month < curYear * 12 + curMonth;

  const summary = latest ? summarize(latest) : null;
  const closings = periods.map((p) => summarize(p).closingBalance);
  const occupied = rooms.filter((r) => r.status !== "KOSONG" && r.status !== "RUSAK").length;
  const unpaid = latest?.roomIncomes.filter((r) => r.status === "TUNDA_BAYAR") ?? [];
  const unpaidTotal = unpaid.reduce((s, r) => s + r.room.monthlyRent, 0);
  const dueToday = unpaid.filter((r) => r.room.tenant?.reminderDay === now.getDate());
  const counts = {
    lunas: rooms.filter((r) => r.status === "LUNAS").length,
    tahunan: rooms.filter((r) => r.status === "TAHUNAN").length,
    kosong: rooms.filter((r) => r.status === "KOSONG").length,
    rusak: rooms.filter((r) => r.status === "RUSAK").length,
  };

  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const endingLeases = rooms
    .filter((r) => r.tenant?.leaseEndDate && r.tenant.leaseEndDate <= soon)
    .sort((a, b) => a.tenant!.leaseEndDate!.getTime() - b.tenant!.leaseEndDate!.getTime());

  const label = latest ? periodLabel(latest.year, latest.month) : "";
  const transfersDone = latest?.transferChecks.filter((t) => t.isSent).length ?? 0;

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const latestSlug = latest ? periodSlug(latest.year, latest.month) : periodSlug(curYear, curMonth);
  const dueTodayIds = new Set(dueToday.map((d) => d.id));
  const notifications: Notification[] = [
    ...(needsNewPeriod ? [{
      id: "new-period", tone: "butter" as const,
      title: `Start the ${periodLabel(curYear, curMonth)} cash book`,
      detail: "This month's cash book hasn't been created yet",
      href: "/",
    }] : []),
    ...dueToday.map((inc) => ({
      id: `due-${inc.id}`, tone: "butter" as const,
      title: `Send reminder · Room ${inc.room.number}`,
      detail: `${inc.room.tenant?.name ?? "Tenant"} · reminder day is today`,
      href: `/kamar/${inc.room.number}`,
    })),
    ...unpaid.filter((inc) => !dueTodayIds.has(inc.id)).map((inc) => ({
      id: `unpaid-${inc.id}`, tone: "blush" as const,
      title: `Room ${inc.room.number} hasn't paid`,
      detail: `${inc.room.tenant?.name ?? "No tenant name"} · ${rupiah(inc.room.monthlyRent)} for ${label}`,
      href: `/kas/${latestSlug}`,
    })),
    ...endingLeases.map((r) => ({
      id: `lease-${r.id}`, tone: (r.tenant!.leaseEndDate! < now ? "blush" : "butter") as Notification["tone"],
      title: `Lease ${r.tenant!.leaseEndDate! < now ? "ended" : "ending"} · Room ${r.number}`,
      detail: `${r.tenant!.name} · ${formatDate(r.tenant!.leaseEndDate)}`,
      href: `/kamar/${r.number}`,
    })),
    ...openTasks.filter((t) => t.dueDate && t.dueDate < startOfToday).map((t) => ({
      id: `task-${t.id}`, tone: "blush" as const,
      title: `Overdue task`,
      detail: `${t.title} · due ${formatDate(t.dueDate)}`,
      href: "/checklist",
    })),
    ...(latest && transfersDone < latest.transferChecks.length ? [{
      id: "transfers", tone: "peri" as const,
      title: `${latest.transferChecks.length - transfersDone} transfers not sent`,
      detail: `Transfer checklist for ${label}`,
      href: `/kas/${latestSlug}`,
    }] : []),
  ];

  return (
    <>
      <PageHeader
        title="Hello, Max."
        subtitle={<RoomSearch rooms={rooms.map((r) => ({
          number: r.number, status: r.status, tenant: r.tenant?.name ?? null, phone: r.tenant?.phone ?? null,
        }))} />}
        actions={<NotificationBell notifications={notifications} />}
        actionsClassName="order-first ml-auto self-start sm:order-none sm:mt-1"
      />

      {needsNewPeriod && (
        <form action={startPeriod} className="card mb-6 flex flex-wrap items-center justify-between gap-3 bg-butter text-butter-deep">
          <input type="hidden" name="year" value={curYear} />
          <input type="hidden" name="month" value={curMonth} />
          <div className="flex items-center gap-3">
            <IconCalendar />
            <p className="text-sm font-semibold">
              The {periodLabel(curYear, curMonth)} cash book hasn&apos;t been started. The closing balance of {label || "the previous month"} will carry over as its opening balance.
            </p>
          </div>
          <SubmitButton pendingText="Creating…">Start {periodLabel(curYear, curMonth)}</SubmitButton>
        </form>
      )}

      {summary && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard tone="ink" icon={<IconWallet />} label="Closing balance" value={rupiah(summary.closingBalance)}
            chart={<Sparkline values={closings.slice(-8)} />}
            footer={<span className={`pill ${summary.netFlow >= 0 ? "bg-mint text-mint-deep" : "bg-blush text-blush-deep"}`}>
              {summary.netFlow >= 0 ? "+" : ""}{rupiahShort(summary.netFlow)} this month
            </span>} />
          <StatCard tone="mint" icon={<IconDoor />} label="Rooms occupied" value={`${occupied} / ${rooms.length}`}
            chart={<Donut value={occupied} total={rooms.length} />}
            footer={`${counts.kosong} vacant · ${counts.rusak} damaged · ${counts.tahunan} annual`} />
          <StatCard tone="peri" icon={<IconCheck />} label={`Income ${label}`} value={rupiah(summary.incomeTotal)}
            chart={<MiniBars parts={[
              { value: summary.incomeTotal, className: "bg-peri-deep" },
              { value: summary.expenseTotal, className: "bg-peri-deep/30" },
            ]} />}
            footer={`Expenses ${rupiah(summary.expenseTotal)}`} />
          <StatCard tone="blush" icon={<IconAlert />} label="Unpaid" value={`${unpaid.length} ${unpaid.length === 1 ? "room" : "rooms"}`}
            footer={unpaid.length ? `± ${rupiah(unpaidTotal)} still to collect` : "All rent collected"} />
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Section title="Room status" action={<Link href="/kamar" className="text-sm font-semibold underline-offset-4 hover:underline">Manage</Link>}>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {rooms.map((r) => (
              <Link key={r.id} href={`/kamar/${r.number}`}
                className={`rounded-2xl p-3 transition-transform hover:-translate-y-0.5 ${TONE_CLASS[STATUS_TONE[r.status]]}`}>
                <div className="flex items-center justify-between">
                  <span className="h-display text-lg">R{r.number}</span>
                  <StatusPill status={r.status} />
                </div>
                <div className="mt-2 truncate text-xs font-semibold">{r.tenant?.name ?? "—"}</div>
                <div className="num text-xs opacity-75">{rupiahShort(r.monthlyRent)}</div>
              </Link>
            ))}
          </div>
        </Section>

        <div className="flex flex-col gap-4">
          {dueToday.length > 0 && (
            <Section title="Reminders due today" action={<span className="pill bg-butter text-butter-deep">{dueToday.length}</span>}>
              <ul className="divide-y divide-line">
                {dueToday.map((inc) => (
                  <li key={inc.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div>
                      <div className="text-sm font-semibold">Room {inc.room.number} · {inc.room.tenant?.name}</div>
                      <div className="num text-xs text-ink-soft">{rupiah(inc.room.monthlyRent)}</div>
                    </div>
                    <WaButton phone={inc.room.tenant?.phone} label="Remind"
                      text={reminderText(inc.room.tenant?.name ?? "", inc.room.number, inc.room.monthlyRent, latest!.year, latest!.month)} />
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Unpaid rent">
            {unpaid.length === 0 ? (
              <Empty>No unpaid rent for {label}.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {unpaid.map((inc) => (
                  <li key={inc.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div>
                      <div className="text-sm font-semibold">Room {inc.room.number} · {inc.room.tenant?.name ?? "no tenant name"}</div>
                      <div className="num text-xs text-ink-soft">{rupiah(inc.room.monthlyRent)}</div>
                    </div>
                    <div className="flex gap-1.5">
                      <WaButton phone={inc.room.tenant?.phone} label="Remind"
                        text={reminderText(inc.room.tenant?.name ?? "", inc.room.number, inc.room.monthlyRent, latest!.year, latest!.month)} />
                      <form action={markRoomPaid}>
                        <input type="hidden" name="incomeId" value={inc.id} />
                        <SubmitButton className="btn-primary btn-sm" pendingText="…">Mark paid</SubmitButton>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {latest && latest.transferChecks.length > 0 && (
            <Section title="Transfers this month" action={<span className="pill bg-cream">{transfersDone}/{latest.transferChecks.length}</span>}>
              <ul className="flex flex-wrap gap-2">
                {latest.transferChecks.map((t) => (
                  <li key={t.id}>
                    <form action={toggleTransfer}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className={`pill cursor-pointer py-1.5 ${t.isSent ? "bg-mint text-mint-deep" : "bg-cream text-ink-soft"}`}>
                        {t.isSent ? "✓" : "○"} {t.recipient.name}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {endingLeases.length > 0 && (
            <Section title="Leases ending soon">
              <ul className="divide-y divide-line">
                {endingLeases.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 py-2.5">
                    <Link href={`/kamar/${r.number}`} className="text-sm font-semibold">Room {r.number} · {r.tenant!.name}</Link>
                    <span className={`pill ${r.tenant!.leaseEndDate! < now ? "bg-blush text-blush-deep" : "bg-butter text-butter-deep"}`}>
                      {formatDate(r.tenant!.leaseEndDate)}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Open tasks" action={<Link href="/checklist" className="text-sm font-semibold underline-offset-4 hover:underline">View all</Link>}>
            {openTasks.length === 0 ? <Empty>No open tasks.</Empty> : (
              <ul className="space-y-2">
                {openTasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 rounded-2xl bg-cream px-3 py-2 text-sm">
                    <span className="font-medium">{t.title}</span>
                    {t.dueDate && <span className="num text-xs text-ink-soft">{formatDate(t.dueDate)}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}

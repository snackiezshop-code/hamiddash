import Link from "next/link";
import { db } from "@/lib/db";
import { getLatestPeriod, summarize } from "@/lib/cashbook";
import {
  STATUS_TONE, TONE_CLASS, formatDate, periodLabel, periodSlug, reminderText, rupiah, rupiahShort, todayJakarta, waLink,
} from "@/lib/format";
import { drawerRoomInclude, toDrawerRoom } from "@/lib/rooms";
import { dueLabel, dueOrder, isDue, transferDue } from "@/lib/transfers";
import { markRoomPaid, startPeriod, toggleTransfer } from "@/app/actions";
import { Empty, MiniBars, PageHeader, Section, Sparkline, StatCard, StatusPill, WaButton } from "@/components/ui";
import { AlertCallout, Avatar, Chevron, CountPill, IconBadge, ListRow, OCCUPANCY_SEGMENTS, PASTEL_BG, SegmentedRing, taskCategoryMeta } from "@/components/kit";
import { SubmitButton } from "@/components/forms";
import { NotificationBell, type Notification } from "@/components/notification-bell";
import { RoomSearch } from "@/components/room-search";
import { RoomDrawerProvider, RoomLink } from "@/components/room-drawer";
import { AccountButton } from "@/components/nav";
import { IconCalendar, IconCheck, IconSettings, IconWallet } from "@/components/icons";

export default async function DashboardPage() {
  const now = todayJakarta();
  const [latest, rooms, periods, openTasks] = await Promise.all([
    getLatestPeriod(),
    db.room.findMany({ orderBy: { number: "asc" }, include: drawerRoomInclude }),
    db.cashPeriod.findMany({
      orderBy: [{ year: "asc" }, { month: "asc" }],
      include: { roomIncomes: true, additionalIncomes: true, expenses: true },
    }),
    db.checklistItem.findMany({ where: { isDone: false }, orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }], take: 5 }),
  ]);

  const curYear = now.getUTCFullYear();
  const curMonth = now.getUTCMonth() + 1;
  const needsNewPeriod = !latest || latest.year * 12 + latest.month < curYear * 12 + curMonth;

  const summary = latest ? summarize(latest) : null;
  const closings = periods.map((p) => summarize(p).closingBalance);
  const occupied = rooms.filter((r) => r.status !== "KOSONG" && r.status !== "RUSAK").length;
  const unpaid = latest?.roomIncomes.filter((r) => r.status === "TUNDA_BAYAR") ?? [];
  const unpaidTotal = unpaid.reduce((s, r) => s + r.room.monthlyRent, 0);
  const dueToday = unpaid.filter((r) => r.room.tenant?.reminderDay === now.getUTCDate());
  const counts = {
    lunas: rooms.filter((r) => r.status === "LUNAS").length,
    tahunan: rooms.filter((r) => r.status === "TAHUNAN").length,
    kosong: rooms.filter((r) => r.status === "KOSONG").length,
    rusak: rooms.filter((r) => r.status === "RUSAK").length,
  };

  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const startOfTodayForOverdue = now;
  const endingLeases = rooms
    .filter((r) => r.tenant?.leaseEndDate && r.tenant.leaseEndDate <= soon)
    .sort((a, b) => a.tenant!.leaseEndDate!.getTime() - b.tenant!.leaseEndDate!.getTime());

  const label = latest ? periodLabel(latest.year, latest.month) : "";
  // Only Max, BNI and this month's heir are due; the other heirs are shown faded with their month.
  const transfers = (latest?.transferChecks ?? [])
    .map((t) => ({ t, due: transferDue(t.recipientId, latest!.year, latest!.month) }))
    .sort((a, b) => dueOrder(a.due) - dueOrder(b.due));
  const transfersDue = transfers.filter((x) => isDue(x.due));
  const transfersDone = transfersDue.filter((x) => x.t.isSent).length;

  const latestSlug = latest ? periodSlug(latest.year, latest.month) : periodSlug(curYear, curMonth);
  const dueTodayIds = new Set(dueToday.map((d) => d.id));
  const attention = unpaid
    .map((inc) => ({ inc, reminderToday: dueTodayIds.has(inc.id) }))
    .sort((a, b) => Number(b.reminderToday) - Number(a.reminderToday) || a.inc.room.number - b.inc.room.number);
  const notifications: Notification[] = [
    ...(needsNewPeriod ? [{
      id: "new-period", tone: "butter" as const,
      title: `Start the ${periodLabel(curYear, curMonth)} cash book`,
      detail: "This month's cash book hasn't been created yet",
      href: "/",
    }] : []),
    // Opens the pre-filled WhatsApp reminder itself; without a usable number it falls back to the room.
    ...dueToday.map((inc) => {
      const wa = waLink(inc.room.tenant?.phone, reminderText(inc.room.tenant?.name ?? "", inc.room.number, inc.room.monthlyRent, latest!.year, latest!.month));
      return {
        id: `due-${inc.id}`, tone: "butter" as const,
        title: `Send reminder · Room ${inc.room.number}`,
        detail: `${inc.room.tenant?.name ?? "Tenant"} · ${wa ? "opens WhatsApp" : "no WhatsApp number saved"}`,
        href: wa ?? `/kamar/${inc.room.number}`,
        external: Boolean(wa),
        roomNumber: wa ? undefined : inc.room.number,
      };
    }),
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
    ...openTasks.filter((t) => t.dueDate && t.dueDate < startOfTodayForOverdue).map((t) => ({
      id: `task-${t.id}`, tone: "blush" as const,
      title: `Overdue task`,
      detail: `${t.title} · due ${formatDate(t.dueDate)}`,
      href: "/checklist",
    })),
    ...(latest && transfersDone < transfersDue.length ? [{
      id: "transfers", tone: "peri" as const,
      title: `${transfersDue.length - transfersDone} transfers not sent`,
      detail: `Transfer checklist for ${label}`,
      href: `/kas/${latestSlug}`,
    }] : []),
  ];

  return (
    <RoomDrawerProvider rooms={rooms.map(toDrawerRoom)}>
      <PageHeader
        title="Hello, Max."
        subtitle={
          <div className="mt-3 flex items-center gap-2">
            <AccountButton className="md:hidden" />
            <RoomSearch rooms={rooms.map((r) => ({
              number: r.number, status: r.status, tenant: r.tenant?.name ?? null, phone: r.tenant?.phone ?? null,
            }))} />
            {/* relative: the bell's panel anchors to this row's right edge, not the bell's, so it stays on screen. */}
            <div className="relative flex shrink-0 items-center gap-2 md:hidden">
              <NotificationBell notifications={notifications} />
              <Link href="/pengaturan" aria-label="Settings"
                className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:bg-cream-2">
                <IconSettings width={20} height={20} />
              </Link>
            </div>
          </div>
        }
        actions={<NotificationBell notifications={notifications} />}
        actionsClassName="hidden self-start md:mt-1 md:flex"
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
          <section className="card flex flex-col items-center gap-3 bg-white sm:row-span-2 xl:row-span-1" aria-labelledby="occupancy-title">
            <h2 id="occupancy-title" className="self-start text-xs font-semibold tracking-wide text-ink-soft uppercase">Rooms occupied</h2>
            <SegmentedRing size={168} center={`${Math.round((occupied / Math.max(rooms.length, 1)) * 100)}%`}
              caption={`${occupied} of ${rooms.length} rooms`}
              segments={[
                { key: "occupied", value: occupied, ...OCCUPANCY_SEGMENTS.occupied },
                { key: "vacant", value: counts.kosong, ...OCCUPANCY_SEGMENTS.vacant },
                { key: "damaged", value: counts.rusak, ...OCCUPANCY_SEGMENTS.damaged },
              ]} />
            <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
              {([["occupied", occupied], ["vacant", counts.kosong], ["damaged", counts.rusak]] as const).map(([k, n]) => (
                <li key={k} className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${PASTEL_BG[OCCUPANCY_SEGMENTS[k].tone]}`} aria-hidden />
                  <span className="num font-semibold">{n}</span> {OCCUPANCY_SEGMENTS[k].label.toLowerCase()}
                </li>
              ))}
            </ul>
          </section>
          <StatCard tone="peri" icon={<IconCheck />} label={`Income ${label}`} value={rupiah(summary.incomeTotal)}
            chart={<MiniBars parts={[
              { value: summary.incomeTotal, className: "bg-peri-deep" },
              { value: summary.expenseTotal, className: "bg-peri-deep/30" },
            ]} />}
            footer={`Expenses ${rupiah(summary.expenseTotal)}`} />
          {unpaid.length > 0 ? (
            <AlertCallout eyebrow="Needs attention"
              action={<a href="#unpaid" className="btn-primary btn-sm">See who hasn&apos;t paid</a>}>
              <span className="text-flag">{unpaid.length}</span> {unpaid.length === 1 ? "room hasn't" : "rooms haven't"} paid for {label}
              <span className="mt-1 block font-sans text-sm font-semibold text-ink-soft">{rupiah(unpaidTotal)} still to collect</span>
            </AlertCallout>
          ) : (
            <AlertCallout tone="mint" eyebrow="Rent">All rent for {label} is in.</AlertCallout>
          )}
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Section title="Room status" action={<Link href="/kamar" className="text-sm font-semibold underline-offset-4 hover:underline">Manage</Link>}>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {rooms.map((r) => (
              <RoomLink key={r.id} roomNumber={r.number}
                className={`rounded-2xl p-3 transition-transform hover:-translate-y-0.5 ${TONE_CLASS[STATUS_TONE[r.status]]}`}>
                <div className="flex items-center justify-between">
                  <span className="h-display text-lg">R{r.number}</span>
                  <StatusPill status={r.status} />
                </div>
                <div className="mt-2 truncate text-xs font-semibold">{r.tenant?.name ?? "No tenant"}</div>
                <div className="num text-xs">{rupiahShort(r.monthlyRent)}</div>
              </RoomLink>
            ))}
          </div>
        </Section>

        <div className="flex min-w-0 flex-col gap-4">
          {/* One list per room with a tag per reason. Reminder-day rooms are a subset of the unpaid ones,
              so they're listed first rather than in a section of their own. */}
          <Section title="Needs attention" action={attention.length > 0 ? <CountPill n={attention.length} /> : undefined}>
            <div id="unpaid" className="scroll-mt-4" />
            {attention.length === 0 ? (
              <Empty>Nothing needs attention for {label}.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {attention.map(({ inc, reminderToday }) => (
                  <li key={inc.id}>
                    <ListRow
                      leading={<Avatar name={inc.room.tenant?.name ?? "?"} tone={reminderToday ? "butter" : "blush"} />}
                      title={`Room ${inc.room.number} · ${inc.room.tenant?.name ?? "No tenant"}`}
                      subtitle={
                        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                          <span className="num">{rupiah(inc.room.monthlyRent)}</span>
                          <span className="pill bg-blush py-0 text-blush-deep">Unpaid</span>
                          {reminderToday && <span className="pill bg-butter py-0 text-butter-deep">Reminder today</span>}
                        </span>
                      }
                      trailing={
                        <div className="flex shrink-0 gap-2">
                          <WaButton iconOnly phone={inc.room.tenant?.phone} label={`Remind ${inc.room.tenant?.name ?? "tenant"} on WhatsApp`}
                            text={reminderText(inc.room.tenant?.name ?? "", inc.room.number, inc.room.monthlyRent, latest!.year, latest!.month)} />
                          <form action={markRoomPaid}>
                            <input type="hidden" name="incomeId" value={inc.id} />
                            <SubmitButton className="grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-ink text-cream hover:bg-ink/85 disabled:opacity-50"
                              aria-label={`Mark room ${inc.room.number} paid`} title="Mark paid">
                              <IconCheck width={18} height={18} strokeWidth={3} />
                            </SubmitButton>
                          </form>
                        </div>
                      } />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {transfers.length > 0 && (
            <Section title="Transfers this month" action={<span className="pill bg-cream">{transfersDone}/{transfersDue.length}</span>}>
              <ul className="flex flex-wrap gap-2">
                {transfers.map(({ t, due }) => (
                  <li key={t.id}>
                    <form action={toggleTransfer}>
                      <input type="hidden" name="id" value={t.id} />
                      <SubmitButton className={`pill min-h-11 cursor-pointer px-3.5 disabled:opacity-50 ${
                        t.isSent ? "bg-mint text-mint-deep"
                          : due.kind === "turn" ? "bg-butter text-butter-deep"
                          : isDue(due) ? "bg-cream text-ink-soft"
                          : "border border-dashed border-line text-ink-soft"
                      }`}>
                        {t.isSent ? "✓" : "○"} {t.recipient.name}
                        <span className="font-medium opacity-75">· {dueLabel(due)}</span>
                      </SubmitButton>
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
                  <li key={r.id}>
                    <Link href={`/kamar/${r.number}`} className="block">
                      <ListRow
                        leading={<Avatar name={r.tenant!.name} tone={r.tenant!.leaseEndDate! < now ? "blush" : "butter"} />}
                        title={`Room ${r.number} · ${r.tenant!.name}`}
                        subtitle={<span className="num">{r.tenant!.leaseEndDate! < now ? "Ended" : "Ends"} {formatDate(r.tenant!.leaseEndDate)}</span>}
                        trailing={<Chevron />} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Open tasks" action={<Link href="/checklist" className="inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline">View all</Link>}>
            {openTasks.length === 0 ? <Empty>No open tasks.</Empty> : (
              <ul className="divide-y divide-line">
                {openTasks.map((t) => {
                  const meta = taskCategoryMeta(t.category);
                  return (
                    <li key={t.id}>
                      <ListRow
                        leading={<IconBadge icon={meta.icon} tone={meta.tone} />}
                        title={t.title}
                        subtitle={t.category ?? undefined}
                        trailing={t.dueDate ? <span className="num shrink-0 text-xs text-ink-soft">{formatDate(t.dueDate)}</span> : undefined} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </RoomDrawerProvider>
  );
}

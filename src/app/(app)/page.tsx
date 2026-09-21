import Link from "next/link";
import { db } from "@/lib/db";
import { getLatestPeriod, summarize } from "@/lib/cashbook";
import {
  STATUS_LABEL, STATUS_TONE, TONE_CLASS, TZ, formatDate, periodLabel, periodSlug, reminderText, rupiah, rupiahShort, todayJakarta, waLink,
} from "@/lib/format";
import { drawerRoomInclude, toDrawerRoom } from "@/lib/rooms";
import { dueLabel, dueOrder, isDue, transferDue } from "@/lib/transfers";
import { startPeriod, toggleTransfer } from "@/app/actions";
import { Empty, PageHeader, Section, Sparkline, WaButton } from "@/components/ui";
import { Avatar, Chevron, CountPill, IconBadge, ListRow, taskCategoryMeta } from "@/components/kit";
import { CountUpRupiah, GreetingRobot, PaidButton, PaidRow } from "@/components/delight";
import { RobotSvg, Sparkle } from "@/components/robot";
import { SubmitButton } from "@/components/forms";
import { NotificationBell, type Notification } from "@/components/notification-bell";
import { RoomSearch } from "@/components/room-search";
import { RoomDrawerProvider, RoomLink } from "@/components/room-drawer";
import { AccountButton } from "@/components/nav";
import { IconCalendar, IconCheck, IconSettings } from "@/components/icons";

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
  const unpaid = latest?.roomIncomes.filter((r) => r.status === "TUNDA_BAYAR") ?? [];
  const unpaidTotal = unpaid.reduce((s, r) => s + r.room.monthlyRent, 0);
  const dueToday = unpaid.filter((r) => r.room.tenant?.reminderDay === now.getUTCDate());
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

  const exceptionRooms = rooms.filter((r) => r.status !== "LUNAS");
  const paidRooms = rooms.length - exceptionRooms.length;
  const roomNumberById = new Map(rooms.map((r) => [r.id, r.number]));

  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  const greeting = hour >= 4 && hour < 11 ? "Pagi" : hour < 15 && hour >= 11 ? "Siang" : hour >= 15 && hour < 18 ? "Sore" : "Malam";
  const mood = hour >= 4 && hour < 11 ? "morning" : hour >= 21 || hour < 4 ? "night" : "day";

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
        title={`${greeting}, Max!`}
        titleRight={<GreetingRobot mood={mood} />}
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

      {latest && (
        <div className="mb-4 grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* Who still owes rent comes first; reminder-day rooms are a subset of the unpaid ones, so they lead the list. */}
          {attention.length > 0 ? (
            <Section title="Needs attention" action={<CountPill n={attention.length} />}>
              <p className="-mt-3 mb-2 text-xs text-ink-soft"><span className="num font-semibold text-ink">{rupiah(unpaidTotal)}</span> still to collect for {label}</p>
              <ul className="divide-y divide-line">
                {attention.map(({ inc, reminderToday }) => (
                  <li key={inc.id}>
                    <PaidRow>
                      <ListRow
                        leading={<Avatar name={inc.room.tenant?.name ?? "?"} tone={reminderToday ? "butter" : "blush"} />}
                        title={`Room ${inc.room.number} · ${inc.room.tenant?.name ?? "No tenant"}`}
                        subtitle={
                          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                            <span className="num">{rupiah(inc.room.monthlyRent)}</span>
                            <span className="pill bg-terra-strong py-0 text-[#F6F1E5]">Unpaid</span>
                            {reminderToday && <span className="pill bg-butter py-0 text-butter-deep">Reminder today</span>}
                          </span>
                        }
                        trailing={
                          <div className="flex shrink-0 gap-2">
                            <WaButton iconOnly phone={inc.room.tenant?.phone} label={`Remind ${inc.room.tenant?.name ?? "tenant"} on WhatsApp`}
                              text={reminderText(inc.room.tenant?.name ?? "", inc.room.number, inc.room.monthlyRent, latest.year, latest.month)} />
                            <PaidButton incomeId={inc.id} roomNumber={inc.room.number} />
                          </div>
                        } />
                    </PaidRow>
                  </li>
                ))}
              </ul>
            </Section>
          ) : (
            <section className="card flex items-center gap-4 bg-mint text-mint-deep" aria-live="polite">
              <div className="relative h-20 w-20 shrink-0">
                <RobotSvg className="robot-cheer absolute inset-3" />
                <svg viewBox="0 0 40 40" className="absolute inset-0 text-butter-deep" aria-hidden>
                  <Sparkle x={6} y={9} size={1.4} />
                  <Sparkle x={34} y={8} size={1.1} className="late" />
                  <Sparkle x={35} y={31} className="later" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="h-display text-2xl text-ink">Semua lunas!</p>
                <p className="text-sm">Everyone&apos;s paid for {label}. Nice work.</p>
              </div>
            </section>
          )}

          {summary && (
            <section className="card flex min-w-0 flex-col gap-4 bg-ink text-cream" aria-labelledby="money-title">
              <div>
                <div className="flex items-end justify-between gap-3">
                  <h2 id="money-title" className="text-xs font-semibold opacity-75">Closing balance</h2>
                  <Sparkline values={closings.slice(-8)} height={28} />
                </div>
                <div className="num mt-1 text-2xl font-semibold tracking-tight break-words md:text-3xl">
                  <CountUpRupiah from={summary.openingBalance} to={summary.closingBalance} />
                </div>
              </div>
              <dl className="flex flex-col gap-3">
                {([
                  ["Income", summary.incomeTotal, "bg-mint"],
                  ["Expenses", summary.expenseTotal, "bg-terra"],
                ] as const).map(([name, n, bar]) => (
                  <div key={name}>
                    <div className="flex items-baseline justify-between gap-3 text-xs">
                      <dt className="opacity-75">{name}</dt>
                      <dd className="num font-semibold">{rupiah(n)}</dd>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-cream/10" aria-hidden>
                      <div className={`h-full rounded-full ${bar}`}
                        style={{ width: `${(n / Math.max(summary.incomeTotal, summary.expenseTotal, 1)) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </dl>
              <div className="flex items-center justify-between gap-3 border-t border-cream/15 pt-3 text-xs">
                <span className="opacity-75">Net cash flow</span>
                <span className={`pill ${summary.netFlow >= 0 ? "bg-mint text-mint-deep" : "bg-terra-strong text-[#F6F1E5]"}`}>
                  {summary.netFlow >= 0 ? "+" : ""}{rupiah(summary.netFlow)}
                </span>
              </div>
            </section>
          )}
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Only exceptions get a colour; paid rooms fold into one neutral tile. The Rooms tab has the full list. */}
        <Section title="Room status" action={<Link href="/kamar" className="-my-2 inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline">Manage</Link>}>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {exceptionRooms.map((r) => (
              <RoomLink key={r.id} roomNumber={r.number}
                className={`rounded-2xl p-3 transition-transform duration-[120ms] hover:-translate-y-0.5 active:scale-[0.97] ${TONE_CLASS[STATUS_TONE[r.status]]}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="h-display text-lg">R{r.number}</span>
                  <span className="text-xs font-semibold">{STATUS_LABEL[r.status]}</span>
                </div>
                <div className="mt-2 truncate text-xs font-semibold">{r.tenant?.name ?? "No tenant"}</div>
                <div className="num text-xs">{rupiahShort(r.monthlyRent)}</div>
              </RoomLink>
            ))}
            {paidRooms > 0 && (
              <Link href="/kamar"
                className={`flex min-h-24 flex-col justify-between gap-2 rounded-2xl bg-cream p-3 transition-transform duration-[120ms] hover:-translate-y-0.5 active:scale-[0.97] ${exceptionRooms.length === 0 ? "col-span-2 sm:col-span-4" : ""}`}>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-mint text-mint-deep" aria-hidden>
                  <IconCheck width={16} height={16} strokeWidth={3} />
                </span>
                <span className="text-sm font-semibold">
                  <span className="h-display text-lg">{paidRooms === rooms.length ? `All ${paidRooms}` : paidRooms}</span> {paidRooms === 1 ? "room" : "rooms"} paid
                </span>
              </Link>
            )}
          </div>
        </Section>

        <div className="flex min-w-0 flex-col gap-4">
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
                        subtitle={[t.category, t.roomId && roomNumberById.get(t.roomId) && `Room ${roomNumberById.get(t.roomId)}`].filter(Boolean).join(" · ") || undefined}
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

import Link from "next/link";
import { db } from "@/lib/db";
import { ensureCurrentPeriod, getLatestPeriod, summarize } from "@/lib/cashbook";
import { MONTHS, MONTHS_SHORT, STATUS_LABEL, TZ, formatDate, periodLabel, periodSlug, properName, rupiah, rupiahShort, todayJakarta } from "@/lib/format";
import { drawerRoomInclude, toDrawerRoom } from "@/lib/rooms";
import { dueLabel as transferWhen, dueOrder, isDue, transferDue } from "@/lib/transfers";
import { dueReminders } from "@/lib/reminders";
import { PROMISE_TAG, daysUntil, dueLabel as reminderDueLabel } from "@/lib/reminder-items";
import { openPromises } from "@/lib/promises";
import { annualStates } from "@/lib/annual";
import { AnnualPayButton } from "@/components/annual";
import { PromiseButton } from "@/components/promise";
import { startPeriod } from "@/app/actions";
import { RentProgress } from "@/components/kit";
import { SubmitButton } from "@/components/forms";
import { TransferToggle } from "@/components/transfer-toggle";
import { RoomDrawerProvider, RoomLink } from "@/components/room-drawer";
import { CollectCard, type CollectItem } from "@/components/collect-card";
import { PaidButton } from "@/components/paid-button";
import { WaButton } from "@/components/ui";
import { IconCheck, IconChevronRight } from "@/components/icons";

const pad2 = (n: number) => String(n).padStart(2, "0");
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default async function DashboardPage() {
  await ensureCurrentPeriod();
  const now = todayJakarta();
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const [latest, rooms, upcoming, lateCount, rent, promises, annual] = await Promise.all([
    getLatestPeriod(),
    db.room.findMany({ orderBy: { number: "asc" }, include: drawerRoomInclude }),
    // Payment promises have their own card below, so they stay out of this list.
    db.reminder.findMany({
      where: { isDone: false, OR: [{ tag: null }, { tag: { not: PROMISE_TAG } }] },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }], take: 4,
    }),
    db.reminder.count({ where: { isDone: false, dueDate: { lt: now } } }),
    dueReminders(now),
    openPromises(now),
    annualStates(now),
  ]);

  const curYear = now.getUTCFullYear();
  const curMonth = now.getUTCMonth() + 1;
  const needsNewPeriod = !latest || latest.year * 12 + latest.month < curYear * 12 + curMonth;
  const summary = latest ? summarize(latest) : null;
  const label = latest ? periodLabel(latest.year, latest.month) : "";
  const slug = latest ? periodSlug(latest.year, latest.month) : periodSlug(curYear, curMonth);

  // Monthly rent only: yearly rooms are paid once a year and tracked in their own card.
  const rentRooms = (latest?.roomIncomes ?? [])
    .filter((r) => r.status !== "KOSONG" && r.status !== "RUSAK" && r.status !== "TAHUNAN")
    .map((r) => ({ id: r.id, number: r.room.number, paid: r.status === "LUNAS" }));
  const rentPaid = rentRooms.filter((r) => r.paid).length;
  const unpaid = latest?.roomIncomes.filter((r) => r.status === "TUNDA_BAYAR") ?? [];
  const unpaidTotal = unpaid.reduce((s, r) => s + Math.max(0, r.room.monthlyRent - r.amount), 0);
  const pct = rentRooms.length ? Math.round((rentPaid / rentRooms.length) * 100) : 0;

  // Rent due today or already late, most late first. Rows in the current cash book can be marked paid here.
  const incomeByRoom = new Map(unpaid.map((r) => [r.room.number, r.id]));
  const collect: CollectItem[] = rent
    .filter((r) => r.daysUntilDue <= 0)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue || a.roomNumber - b.roomNumber)
    .map((r) => ({
      roomId: r.roomId, roomNumber: r.roomNumber, tenant: properName(r.tenantName), phone: r.phone, amount: r.amount, paid: r.paid,
      year: r.year, month: r.month, periodLabel: periodLabel(r.year, r.month),
      daysUntilDue: r.daysUntilDue, waHref: r.waHref, lapsedPromise: r.lapsedPromise,
      incomeId: r.kind === "monthly" && latest && r.year === latest.year && r.month === latest.month ? incomeByRoom.get(r.roomNumber) ?? null : null,
      annual: r.kind === "annual" && annual.get(r.roomId) ? (() => {
        const a = annual.get(r.roomId)!;
        return { rent: a.rent, remaining: a.remaining, paid: a.paid, partial: a.partial, termLabel: a.termLabel };
      })() : null,
    }));
  // Yearly rent coming up (8 to 30 days away); from 7 days it's in Tagih sekarang instead.
  const annualSoon = [...annual.values()].filter((a) => !a.partial && a.daysUntilDue > 7 && a.daysUntilDue <= 30);

  const transfers = (latest?.transferChecks ?? [])
    .filter((t) => t.recipient.isActive || t.isSent)
    .map((t) => ({ t, due: transferDue(t.recipientId, latest!.year, latest!.month) }))
    .sort((a, b) => dueOrder(a.due) - dueOrder(b.due))
    .filter((x) => isDue(x.due));
  const unsent = transfers.filter((x) => !x.t.isSent).length;

  // Promises still ahead (today or later); lapsed ones are back in Tagih sekarang.
  const activePromises = rooms
    .filter((r) => r.tenant && promises.has(r.id) && promises.get(r.id)!.date >= now)
    .map((r) => ({ room: r, promise: promises.get(r.id)! }))
    .sort((a, b) => a.promise.date.getTime() - b.promise.date.getTime());

  const endingLeases = rooms
    .filter((r) => r.tenant?.leaseEndDate && r.tenant.leaseEndDate <= soon)
    .sort((a, b) => a.tenant!.leaseEndDate!.getTime() - b.tenant!.leaseEndDate!.getTime());

  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  const greeting = hour >= 4 && hour < 11 ? "pagi" : hour >= 11 && hour < 15 ? "siang" : hour >= 15 && hour < 18 ? "sore" : "malam";

  return (
    <RoomDrawerProvider rooms={rooms.map((r) => toDrawerRoom(r, promises, annual))}>
      <header className="mb-5">
        <p className="eyebrow text-ink-soft">{HARI[now.getUTCDay()]} / {now.getUTCDate()} {MONTHS_SHORT[now.getUTCMonth()]}</p>
        <h1 className="h-display mt-1.5 text-[1.85rem] leading-[1.08]">Selamat {greeting},<br />Admin.</h1>
      </header>

      {needsNewPeriod && (
        <form action={startPeriod} className="card mb-4 bg-butter">
          <input type="hidden" name="year" value={curYear} />
          <input type="hidden" name="month" value={curMonth} />
          <p className="eyebrow text-butter-deep">Buku kas belum dimulai</p>
          <p className="mt-2 text-sm">
            Buku kas {periodLabel(curYear, curMonth)} belum dibuat. Saldo akhir {label || "bulan sebelumnya"} akan jadi saldo awalnya.
          </p>
          <SubmitButton className="btn-primary mt-3 w-full" pendingText="Membuat…">Mulai {periodLabel(curYear, curMonth)}</SubmitButton>
        </form>
      )}

      {latest && summary && (
        <>
          {/* Hero: navy holds the number to act on; the two small cards say how urgent it is. */}
          <section className="grid grid-cols-[minmax(0,1fr)_6.75rem] gap-3" aria-label="Ringkasan bulan ini">
            <Link href={`/kas/${slug}?tab=rent`} className="card press flex min-h-[10.5rem] flex-col justify-between bg-navy text-white">
              <span className="num text-[4.75rem] leading-[0.85] font-medium tracking-[-0.04em]">{pad2(unpaid.length)}</span>
              <span className="eyebrow">{unpaid.length ? "Kamar belum bayar" : "Semua kamar lunas"}</span>
            </Link>
            <div className="flex flex-col gap-3">
              <div className="card flex flex-1 flex-col justify-between bg-orange p-3 text-white">
                <span className="num text-[1.65rem] leading-none font-medium">{collect.length}</span>
                <span className="eyebrow">Tagih sekarang</span>
              </div>
              <Link href="/pengingat" className="card press flex flex-1 flex-col justify-between p-3">
                <span className={`num text-[1.65rem] leading-none font-medium ${lateCount ? "text-orange-text" : ""}`}>{lateCount}</span>
                <span className="eyebrow">Pengingat telat</span>
              </Link>
            </div>
          </section>

          <section className="mt-3 grid grid-cols-2 gap-3" aria-label="Uang">
            <Link href={`/kas/${slug}`} className="card press p-3.5">
              <span className="num block text-[1.35rem] leading-none font-medium">{rupiahShort(summary.closingBalance)}</span>
              <span className="eyebrow mt-2 block text-ink-soft">Saldo kas</span>
            </Link>
            <Link href={`/kas/${slug}?tab=rent`} className="card press p-3.5">
              <span className="num block text-[1.35rem] leading-none font-medium">{rupiahShort(unpaidTotal)}</span>
              <span className="eyebrow mt-2 block text-ink-soft">Masih ditunggu</span>
            </Link>
          </section>

          <section className="card mt-3" aria-labelledby="rent-title">
            <div className="mb-2.5 flex justify-between gap-3">
              <h2 id="rent-title" className="eyebrow text-ink-soft">Sewa masuk · {label}</h2>
              <span className="eyebrow num">{pct}%</span>
            </div>
            <RentProgress rooms={rentRooms} />
            <p className="mt-2 text-sm text-ink-soft">
              <b className="num font-semibold text-ink">{rentPaid}</b> dari {rentRooms.length} kamar sudah bayar
              {unpaidTotal > 0 && <>, <span className="num">{rupiah(unpaidTotal)}</span> lagi</>}
            </p>
          </section>

          <div className="mt-4"><CollectCard items={collect} /></div>

          {annualSoon.map((a) => (
            <section key={a.roomId} className="card mt-4 bg-mint" aria-label={`Sewa tahunan kamar ${a.roomNumber}`}>
              <p className="eyebrow">Sewa tahunan · Kamar {a.roomNumber}</p>
              <p className="mt-1.5 text-sm">
                <b className="font-semibold">{properName(a.tenantName)}</b> · kontrak berakhir <b className="num">{formatDate(a.dueDate)}</b> ({reminderDueLabel(a.daysUntilDue).toLowerCase()}).
                Perpanjangan {a.termLabel}: <b className="num">{rupiah(a.rent)}</b>.
              </p>
              <div className="mt-3 flex justify-end">
                <AnnualPayButton target={{ roomId: a.roomId, roomNumber: a.roomNumber, tenantName: properName(a.tenantName), rent: a.rent, remaining: a.remaining, paid: a.paid, partial: a.partial, termLabel: a.termLabel }} />
              </div>
            </section>
          ))}

          {activePromises.length > 0 && (
            <section className="card mt-4 bg-butter" aria-labelledby="promise-title">
              <h2 id="promise-title" className="eyebrow text-butter-deep">Janji bayar · {activePromises.length}</h2>
              <ul className="mt-2 divide-y divide-ink/15">
                {activePromises.map(({ room: r, promise: p }) => {
                  const days = daysUntil(p.date, now);
                  const income = latest.roomIncomes.find((i) => i.roomId === r.id);
                  return (
                    <li key={r.id} className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 py-2">
                      <span className="flex min-w-[10rem] flex-1 items-center gap-3">
                        <span className="num grid h-10 w-10 shrink-0 place-items-center rounded-[4px] border-[1.5px] border-ink bg-card text-sm font-medium" aria-hidden>{r.number}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{properName(r.tenant!.name)}</span>
                          <span className="num text-xs">
                            Janji {formatDate(p.date)} · <b className="font-semibold">{reminderDueLabel(days)}</b>
                          </span>
                        </span>
                      </span>
                      <span className="ml-auto flex items-center gap-2">
                        {p.text && <WaButton iconOnly phone={r.tenant!.phone} text={p.text} label={`Kirim pengingat janji bayar ke ${properName(r.tenant!.name)}`} />}
                        <PromiseButton label="Ubah"
                          target={{ roomId: r.id, roomNumber: r.number, tenantName: properName(r.tenant!.name), phone: r.tenant!.phone,
                            year: p.year, month: p.month, current: { id: p.id, date: p.date } }} />
                        {income && income.status === "TUNDA_BAYAR" && <PaidButton incomeId={income.id} roomNumber={r.number} />}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-1 text-xs text-butter-deep">Tidak ditagih sampai tanggal janji; kamu diingatkan pada harinya. Ikon WhatsApp mengirim pengingat janjinya.</p>
            </section>
          )}
        </>
      )}

      <section className="mt-8" aria-labelledby="rooms-title">
        <div className="flex items-center justify-between border-b-[1.5px] border-ink">
          <h2 id="rooms-title" className="eyebrow">Status kamar</h2>
          <Link href="/kamar" className="eyebrow inline-flex min-h-11 items-center text-ink-soft underline underline-offset-4">Semua kamar</Link>
        </div>
        <div className="mt-3 grid grid-cols-8 gap-1.5">
          {rooms.map((r) => {
            const yearly = annual.get(r.id);
            // Yearly rooms: striped navy while paid up, orange once the renewal or the rest is due.
            const yearlyDue = Boolean(yearly && (yearly.partial || yearly.daysUntilDue <= 0));
            const paid = r.status === "LUNAS" || (r.status === "TAHUNAN" && !yearlyDue);
            return (
              <RoomLink key={r.id} roomNumber={r.number}
                aria-label={`Kamar ${r.number}, ${r.tenant ? properName(r.tenant.name) : "tanpa penghuni"}, ${STATUS_LABEL[r.status]}`}
                className={`num grid aspect-square min-h-9 place-items-center rounded-[3px] border-[1.5px] border-ink text-[0.8rem] font-medium transition-transform active:scale-90 ${
                  paid ? "bg-navy text-white" : r.status === "TUNDA_BAYAR" || yearlyDue ? "bg-orange text-white" : "bg-card"}`}
                style={r.status === "RUSAK" ? { background: "repeating-linear-gradient(135deg, var(--color-card) 0 4px, var(--color-ink) 4px 5.5px)" }
                  : r.status === "TAHUNAN" ? { backgroundImage: "repeating-linear-gradient(135deg, transparent 0 5px, rgb(255 255 255 / 0.28) 5px 7px)" } : undefined}>
                <span className={r.status === "RUSAK" ? "bg-card px-0.5" : ""}>{r.number}</span>
              </RoomLink>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-ink-soft">Navy lunas · oranye belum bayar · garis-garis tahunan · putih kosong · arsir rusak. Ketuk kamar untuk aksi cepat.</p>
      </section>

      {endingLeases.length > 0 && (
        <section className="card mt-6" aria-labelledby="lease-title">
          <h2 id="lease-title" className="eyebrow text-ink-soft">Kontrak segera berakhir</h2>
          <ul className="mt-2 divide-y divide-line">
            {endingLeases.map((r) => {
              const ended = r.tenant!.leaseEndDate! < now;
              return (
                <li key={r.id}>
                  <Link href={`/kamar/${r.number}`} className="flex min-h-12 items-center justify-between gap-3">
                    <span className="min-w-0 truncate font-medium">Kamar {r.number} · {properName(r.tenant!.name)}</span>
                    <span className={`num shrink-0 text-sm ${ended ? "font-semibold text-orange-text" : "text-ink-soft"}`}>
                      {ended ? "Berakhir" : "Sampai"} {formatDate(r.tenant!.leaseEndDate)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-8" aria-labelledby="next-title">
        <div className="flex items-center justify-between border-b-[1.5px] border-ink">
          <h2 id="next-title" className="eyebrow">Berikutnya</h2>
          <Link href="/pengingat" className="eyebrow inline-flex min-h-11 items-center text-ink-soft underline underline-offset-4">Semua pengingat</Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="py-4 text-sm text-ink-soft">Tidak ada pengingat. Tambah dari menu AD.</p>
        ) : (
          <ol>
            {upcoming.map((u, k) => {
              const days = daysUntil(u.dueDate, now);
              return (
                <li key={u.id} className="border-b border-line">
                  <Link href="/pengingat" className="flex min-h-14 items-center gap-3 py-2">
                    <span className="num w-6 shrink-0 text-sm text-ink-soft">{pad2(k + 1)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{u.title}</span>
                      <span className={`text-xs ${days !== null && days < 0 ? "font-semibold text-orange-text" : "text-ink-soft"}`}>
                        {[u.amount ? rupiah(u.amount) : null, days !== null && days > 1 ? formatDate(u.dueDate) : reminderDueLabel(days)].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <IconChevronRight width={16} className="shrink-0 text-ink-soft" />
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {transfers.length > 0 && (
        <section className="card mt-6" aria-labelledby="transfer-title">
          <h2 id="transfer-title" className="eyebrow text-ink-soft">Transfer</h2>
          <p className="mt-2 text-lg leading-snug">
            {unsent === 0 ? "Semua transfer bulan ini sudah dikirim."
              : <>Masih <span className="font-semibold text-orange-text">{unsent} transfer</span> yang belum dikirim bulan ini.</>}
          </p>
          <ul className="mt-2">
            {transfers.map(({ t, due }) => (
              <li key={t.id}>
                <TransferToggle variant="pill" id={t.id} sent={t.isSent} amount={t.amount ?? t.recipient.monthlyAmount} name={t.recipient.name}
                  className="flex min-h-11 w-full cursor-pointer items-center gap-3 text-left disabled:opacity-60">
                  <span aria-hidden className={`grid h-5 w-5 shrink-0 place-items-center border-[1.5px] border-ink ${t.isSent ? "bg-navy text-white" : "bg-card"}`}>
                    {t.isSent && <IconCheck width={14} strokeWidth={2.6} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{t.recipient.name}</span>
                  <span className="eyebrow shrink-0 text-ink-soft">{transferWhen(due)}</span>
                </TransferToggle>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-ink-soft">Centang saat sudah dikirim; nominalnya tercatat sebagai pengeluaran.</p>
        </section>
      )}

      {latest && (
        <Link href={`/kas/${slug}`} className="btn-primary press mt-6 min-h-16 w-full text-[0.8rem]">
          Buka buku kas {MONTHS[latest.month - 1]}
        </Link>
      )}
    </RoomDrawerProvider>
  );
}

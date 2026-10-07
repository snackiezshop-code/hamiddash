import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ensureCurrentPeriod, getPeriod, summarize } from "@/lib/cashbook";
import {
  STATUS_LABEL, STATUS_OPTIONS, STATUS_TONE, TONE_CLASS,
  isFuturePeriod, parsePeriodSlug, periodLabel, periodSlug, properName, reminderText, rupiah, shiftMonth, thanksText,
} from "@/lib/format";
import {
  addAdditionalIncome, deleteAdditionalIncome, startPeriod, updateRoomIncome,
} from "@/app/actions";
import { Empty, PageHeader, Section, StatCard, WaButton } from "@/components/ui";
import { BankAccount } from "@/components/bank";
import { AmountInput, AutoSubmitAmount, ConfirmButton, SubmitButton } from "@/components/forms";
import { ExpenseList } from "@/components/expense-list";
import { SegmentedLinks, SelectPill } from "@/components/kit-client";
import { TransferToggle } from "@/components/transfer-toggle";
import { MonthSelect } from "@/components/month-select";
import { QuickAddButton } from "@/components/quick-add";
import { dueLabel, dueOrder, isDue, transferDue } from "@/lib/transfers";
import { IconChevronLeft, IconChevronRight, IconDownload, IconPlus, IconTrash } from "@/components/icons";

const TABS = [
  { key: "summary", label: "Ringkasan" },
  { key: "rent", label: "Sewa" },
  { key: "expenses", label: "Pengeluaran" },
  { key: "transfers", label: "Transfer" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export default async function CashPeriodPage({ params, searchParams }: PageProps<"/kas/[period]">) {
  await ensureCurrentPeriod();
  const { period: slug } = await params;
  const { tab: tabParam } = await searchParams;
  const ym = parsePeriodSlug(slug);
  if (!ym) notFound();
  const { year, month } = ym;
  const tab: Tab = TABS.some((t) => t.key === tabParam) ? (tabParam as Tab) : "summary";
  const label = periodLabel(year, month);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const [period, allPeriods] = await Promise.all([
    getPeriod(year, month),
    db.cashPeriod.findMany({ orderBy: [{ year: "desc" }, { month: "desc" }], select: { year: true, month: true } }),
  ]);

  // A month that hasn't come yet can't be opened (or started) unless it somehow already exists.
  if (!period && isFuturePeriod(year, month)) redirect("/kas");
  const nextOpen = !isFuturePeriod(next.year, next.month) || allPeriods.some((p) => p.year === next.year && p.month === next.month);

  const monthOptions = allPeriods.map((p) => ({ value: periodSlug(p.year, p.month), label: periodLabel(p.year, p.month) }));
  if (!monthOptions.some((o) => o.value === slug)) {
    monthOptions.unshift({ value: slug, label: `${label} (belum dimulai)` });
  }

  const step = "press grid h-12 w-12 shrink-0 place-items-center rounded-[4px] border-[1.5px] border-ink bg-card shadow-[2px_2px_0_var(--color-ink)] hover:bg-cream";
  const nav = (
    <div className="mb-4 flex items-center gap-2">
      <Link href={`/kas/${periodSlug(prev.year, prev.month)}?tab=${tab}`} className={step} aria-label="Bulan sebelumnya">
        <IconChevronLeft width={18} />
      </Link>
      <MonthSelect options={monthOptions} value={slug} hrefTemplate={`/kas/:month?tab=${tab}`} />
      {nextOpen ? (
        <Link href={`/kas/${periodSlug(next.year, next.month)}?tab=${tab}`} className={step} aria-label="Bulan berikutnya">
          <IconChevronRight width={18} />
        </Link>
      ) : (
        <span className={`${step} cursor-not-allowed opacity-40`} aria-disabled="true" title="Bulan depan belum dimulai">
          <IconChevronRight width={18} />
        </span>
      )}
    </div>
  );

  if (!period) {
    return (
      <>
        <PageHeader eyebrow={label} title="Buku kas" />
        {nav}
        <form action={startPeriod} className="card">
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
          <p className="eyebrow text-ink-soft">Belum dimulai</p>
          <p className="mt-2 text-sm">
            Buku kas {label} belum ada. Saat dimulai, saldo akhir {periodLabel(prev.year, prev.month)} jadi saldo awalnya, dan
            setiap kamar yang lunas kembali jadi <b>belum bayar</b> sampai sewa bulan ini masuk.
          </p>
          <SubmitButton className="btn-primary mt-4 w-full" pendingText="Membuat…">Mulai buku kas {label}</SubmitButton>
        </form>
      </>
    );
  }

  const s = summarize(period);
  // Yearly rooms pay once a year (recorded under Pemasukan lain), so the monthly rent list leaves them out.
  const monthlyIncomes = period.roomIncomes.filter((r) => r.status !== "TAHUNAN");
  const yearlyRooms = period.roomIncomes.filter((r) => r.status === "TAHUNAN").map((r) => r.room.number);
  const paidCount = monthlyIncomes.filter((r) => r.status === "LUNAS").length;
  // The monthly recipients plus the heir whose turn it is first; the other heirs after, faded.
  const transfers = period.transferChecks
    .filter((t) => t.recipient.isActive || t.isSent)
    .map((t) => ({ ...t, due: transferDue(t.recipientId, year, month) }))
    .sort((a, b) => dueOrder(a.due) - dueOrder(b.due));
  const unsent = transfers.filter((t) => isDue(t.due) && !t.isSent).length;

  return (
    <>
      <PageHeader eyebrow={`Laporan arus kas · ${label}`} title="Buku kas"
        actions={<a href={`/kas/${slug}/report`} className="btn-secondary btn-sm"><IconDownload width={16} /> PDF</a>} />
      {nav}

      <div className="mb-5">
        <SegmentedLinks label="Bagian buku kas" items={TABS.map((t) => ({
          href: `/kas/${slug}?tab=${t.key}`,
          label: t.key === "transfers" && unsent ? `${t.label} · ${unsent}` : t.label,
          active: tab === t.key,
        }))} />
      </div>

      {tab === "summary" && (
        <div className="flex flex-col gap-4">
          <section className="card bg-navy text-white" aria-labelledby="closing-title">
            <h2 id="closing-title" className="eyebrow">Saldo akhir · {label}</h2>
            <p className="num mt-3 text-[2.4rem] leading-none font-medium tracking-[-0.03em] break-words">{rupiah(s.closingBalance)}</p>
            <p className="mt-3 text-sm text-white/85">
              Arus kas bersih <span className="num font-semibold text-white">{s.netFlow >= 0 ? "+" : ""}{rupiah(s.netFlow)}</span> dari saldo awal <span className="num">{rupiah(s.openingBalance)}</span>
            </p>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <StatCard tone="white" label="Pemasukan" value={rupiah(s.incomeTotal)}
              footer={<span className="text-ink-soft">Sewa {rupiah(s.roomTotal)} · lain {rupiah(s.additionalTotal)}</span>} />
            <StatCard tone="white" label="Pengeluaran" value={rupiah(s.expenseTotal)}
              footer={<span className="text-ink-soft">{period.expenses.length} transaksi</span>} />
          </div>

          <Section title="Rincian">
            <dl className="text-sm">
              {[
                ["Saldo awal", s.openingBalance],
                ["Sewa kamar", s.roomTotal],
                ["Pemasukan lain", s.additionalTotal],
                ["Pengeluaran", -s.expenseTotal],
              ].map(([k, v]) => (
                <div key={k} className="flex min-h-10 items-center justify-between gap-3 border-b border-line">
                  <dt className="text-ink-soft">{k}</dt>
                  <dd className="num">{rupiah(v as number)}</dd>
                </div>
              ))}
              <div className="flex min-h-12 items-center justify-between gap-3 border-t-[1.5px] border-ink font-semibold">
                <dt>Saldo akhir</dt>
                <dd className="num">{rupiah(s.closingBalance)}</dd>
              </div>
            </dl>
          </Section>

          <Section title="Pemasukan lain">
            {period.additionalIncomes.length === 0 ? <Empty>Belum ada pemasukan lain bulan ini.</Empty> : (
              <ul className="divide-y divide-line">
                {period.additionalIncomes.map((a) => (
                  <li key={a.id} className="flex min-h-14 items-center gap-2 py-1">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{a.description}</div>
                      {a.source && <div className="text-xs text-ink-soft">{a.source}</div>}
                    </div>
                    <span className="num text-sm">{rupiah(a.amount)}</span>
                    <form action={deleteAdditionalIncome}>
                      <input type="hidden" name="id" value={a.id} />
                      <ConfirmButton message={`Hapus "${a.description}"?`} aria-label={`Hapus ${a.description}`}
                        className="grid h-11 w-11 cursor-pointer place-items-center rounded-[4px] text-ink-soft hover:bg-blush hover:text-blush-deep">
                        <IconTrash width={18} />
                      </ConfirmButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={addAdditionalIncome} className="mt-4 grid grid-cols-2 gap-2 border-t-[1.5px] border-ink pt-4">
              <input type="hidden" name="periodId" value={period.id} />
              <input name="description" required placeholder="Keterangan" aria-label="Keterangan" className="field col-span-2" />
              <input name="source" placeholder="Sumber" aria-label="Sumber" className="field" />
              <AmountInput name="amount" required pattern="[0-9.,\s]*[1-9][0-9.,\s]*" title="Isi jumlah lebih dari 0"
                placeholder="Jumlah" aria-label="Jumlah" className="field num" />
              <SubmitButton className="btn-primary col-span-2" pendingText="Menambah…"><IconPlus width={16} /> Tambah pemasukan</SubmitButton>
            </form>
          </Section>
        </div>
      )}

      {tab === "rent" && (
        <Section title={`Sewa kamar · ${paidCount}/${monthlyIncomes.length} lunas`}>
          <p className="-mt-1 mb-2 text-xs text-ink-soft">Ubah status atau jumlah; tersimpan otomatis.</p>
          <ul className="divide-y divide-line">
            {monthlyIncomes.map((inc) => {
              const tenant = inc.room.tenant;
              const name = tenant ? properName(tenant.name) : null;
              return (
                <li key={`${inc.id}-${inc.status}-${inc.amount}`}>
                  <form action={updateRoomIncome} className="flex flex-col gap-2 py-3">
                    <input type="hidden" name="incomeId" value={inc.id} />
                    <div className="flex items-center gap-2">
                      <Link href={`/kamar/${inc.room.number}`} className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="num grid h-10 w-10 shrink-0 place-items-center rounded-[4px] border-[1.5px] border-ink text-sm font-medium" aria-hidden>{inc.room.number}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">Kamar {inc.room.number}</span>
                          <span className="block truncate text-xs text-ink-soft">{name ?? "Tanpa penghuni"}</span>
                        </span>
                      </Link>
                      {inc.status === "TUNDA_BAYAR" && (
                        <WaButton iconOnly phone={tenant?.phone} label={`Kirim pengingat WhatsApp ke ${name ?? "penghuni"}`}
                          text={reminderText({ name: tenant?.name ?? "", roomNumber: inc.room.number, amount: inc.room.monthlyRent, paid: inc.amount, year, month, dueDay: tenant?.reminderDay ?? null })} />
                      )}
                      {inc.status === "LUNAS" && tenant && (
                        <WaButton iconOnly phone={tenant.phone} label={`Kirim terima kasih WhatsApp ke ${name}`}
                          text={thanksText({ name: tenant.name, roomNumber: inc.room.number, year, month, amount: inc.amount })} />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <SelectPill name="status" autoSubmit defaultValue={inc.status} ariaLabel={`Status kamar ${inc.room.number}`}
                        className="min-w-0 flex-1" tone={`border-[1.5px] border-ink ${TONE_CLASS[STATUS_TONE[inc.status]]}`}
                        options={STATUS_OPTIONS.map((st) => ({ value: st, label: STATUS_LABEL[st] }))} />
                      <label className="flex min-h-11 w-36 shrink-0 items-center rounded-[4px] border-[1.5px] border-ink bg-card px-3 focus-within:shadow-[3px_3px_0_var(--color-ink)]">
                        <span className="mr-1 text-xs text-ink-soft">Rp</span>
                        <AutoSubmitAmount name="amount" defaultValue={inc.amount} aria-label={`Jumlah kamar ${inc.room.number}`}
                          className="num w-full min-w-0 bg-transparent text-right text-sm outline-none!" />
                      </label>
                    </div>
                  </form>
                </li>
              );
            })}
          </ul>
          {yearlyRooms.length > 0 && (
            <p className="mt-2 text-xs text-ink-soft">Kamar {yearlyRooms.join(", ")} bayar tahunan; pembayarannya tercatat di Ringkasan → Pemasukan lain.</p>
          )}
          <div className="mt-2 flex min-h-12 items-center justify-between border-t-[1.5px] border-ink text-sm font-semibold">
            <span>Total sewa kamar</span>
            <span className="num">{rupiah(s.roomTotal)}</span>
          </div>
        </Section>
      )}

      {tab === "expenses" && (
        <Section title="Pengeluaran operasional"
          action={<QuickAddButton kind="expense" preset={{ periodId: period.id, periodLabel: label }} className="btn-primary btn-sm shrink-0 whitespace-nowrap">
            <IconPlus width={16} /> Tambah
          </QuickAddButton>}>
          {period.expenses.length === 0 ? <Empty>Belum ada pengeluaran. Tambah di sini, atau centang transfer yang sudah dikirim.</Empty> : (
            <ExpenseList expenses={period.expenses} periodLabel={label} editable />
          )}
          <div className="mt-2 flex min-h-12 items-center justify-between border-t-[1.5px] border-ink text-sm font-semibold">
            <span>Total pengeluaran</span>
            <span className="num">{rupiah(s.expenseTotal)}</span>
          </div>
        </Section>
      )}

      {tab === "transfers" && (
        <Section title={`Transfer · ${unsent ? `${unsent} belum dikirim` : "semua terkirim"}`}>
          {transfers.length === 0 ? (
            <Empty>Belum ada penerima. Tambahkan di <Link href="/pengaturan" className="underline">Pengaturan</Link>.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {transfers.map((t) => {
                const amount = t.amount ?? t.recipient.monthlyAmount;
                return (
                  <li key={t.id} className={`py-3 ${isDue(t.due) ? "" : "opacity-60"}`}>
                    <div className="flex items-center gap-2">
                      <TransferToggle variant="switch" id={t.id} sent={t.isSent} amount={amount} name={t.recipient.name} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {t.recipient.name}
                          {t.recipient.role && <span className="ml-1.5 text-xs font-normal text-ink-soft">· {t.recipient.role}</span>}
                        </div>
                        <div className="text-xs text-ink-soft">
                          {amount ? `${rupiah(amount)} · ` : ""}{dueLabel(t.due)}{" · "}
                          {t.isSent && t.sentAt
                            ? `Terkirim ${t.sentAt.toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" })}`
                            : isDue(t.due) ? "Belum dikirim" : "Belum giliran"}
                        </div>
                      </div>
                    </div>
                    {(t.recipient.accountNumber || t.recipient.bankName) && (
                      <div className="pl-[52px]">
                        <BankAccount bank={t.recipient.bankName} account={t.recipient.accountNumber} holder={t.recipient.accountHolder} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-2 text-xs text-ink-soft">Menyalakan transfer mencatat nominalnya sebagai pengeluaran bulan ini.</p>
        </Section>
      )}
    </>
  );
}

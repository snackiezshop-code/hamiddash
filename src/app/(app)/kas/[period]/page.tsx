import Link from "next/link";
import { notFound } from "next/navigation";
import { getPeriod, summarize } from "@/lib/cashbook";
import {
  CATEGORY_LABEL, CATEGORY_OPTIONS, STATUS_LABEL, STATUS_OPTIONS, STATUS_TONE, TONE_CLASS,
  parsePeriodSlug, periodLabel, periodSlug, reminderText, rupiah, shiftMonth,
} from "@/lib/format";
import {
  addAdditionalIncome, addExpense, deleteAdditionalIncome, deleteExpense, startPeriod, toggleTransfer, updateRoomIncome,
} from "@/app/actions";
import { Empty, PageHeader, Section, StatCard, WaButton } from "@/components/ui";
import { BankAccount } from "@/components/bank";
import { AutoSubmitAmount, AutoSubmitSelect, ConfirmButton, SubmitButton } from "@/components/forms";
import {
  IconAlert, IconCheck, IconChevronLeft, IconChevronRight, IconDownload, IconPlus, IconTrash, IconWallet,
} from "@/components/icons";

export default async function CashPeriodPage({ params }: PageProps<"/kas/[period]">) {
  const { period: slug } = await params;
  const ym = parsePeriodSlug(slug);
  if (!ym) notFound();
  const { year, month } = ym;
  const label = periodLabel(year, month);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const period = await getPeriod(year, month);

  const nav = (
    <div className="flex items-center gap-1">
      <Link href={`/kas/${periodSlug(prev.year, prev.month)}`} className="btn-secondary btn-sm" aria-label="Previous month">
        <IconChevronLeft width={16} height={16} />
      </Link>
      <Link href={`/kas/${periodSlug(next.year, next.month)}`} className="btn-secondary btn-sm" aria-label="Next month">
        <IconChevronRight width={16} height={16} />
      </Link>
    </div>
  );

  if (!period) {
    return (
      <>
        <PageHeader title="Cash Book" subtitle={label} actions={nav} />
        <form action={startPeriod} className="card bg-white text-center">
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
          <p className="mx-auto mb-4 max-w-md text-sm text-ink-soft">
            There is no cash book for {label} yet. When you start it, the closing balance of {periodLabel(prev.year, prev.month)} becomes its
            opening balance, and every room marked Paid switches back to <b>Unpaid</b> until this month&apos;s rent comes in.
          </p>
          <SubmitButton pendingText="Creating…">Start {label} cash book</SubmitButton>
        </form>
      </>
    );
  }

  const s = summarize(period);
  const paidCount = period.roomIncomes.filter((r) => r.status === "LUNAS").length;
  const transfers = period.transferChecks.filter((t) => t.recipient.isActive || t.isSent);

  return (
    <>
      <PageHeader title="Cash Book" subtitle={`Cash flow report · ${label}`}
        actions={<>
          {nav}
          <a href={`/kas/${slug}/report`} className="btn-secondary btn-sm"><IconDownload width={16} height={16} /> Download PDF</a>
        </>} />

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard tone="white" icon={<IconWallet />} label="Opening balance" value={rupiah(s.openingBalance)}
          footer={<span className="text-ink-soft">Closing balance of {periodLabel(prev.year, prev.month)}</span>} />
        <StatCard tone="mint" icon={<IconCheck />} label="Income" value={rupiah(s.incomeTotal)}
          footer={`Rent ${rupiah(s.roomTotal)} · other ${rupiah(s.additionalTotal)}`} />
        <StatCard tone="blush" icon={<IconAlert />} label="Expenses" value={rupiah(s.expenseTotal)}
          footer={`${period.expenses.length} ${period.expenses.length === 1 ? "transaction" : "transactions"}`} />
        <StatCard tone="ink" icon={<IconWallet />} label="Closing balance" value={rupiah(s.closingBalance)}
          footer={<span className={`pill ${s.netFlow >= 0 ? "bg-mint text-mint-deep" : "bg-blush text-blush-deep"}`}>
            Net cash flow {s.netFlow >= 0 ? "+" : ""}{rupiah(s.netFlow)}
          </span>} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <Section title="Room rent income" action={<span className="pill bg-mint text-mint-deep">{paidCount}/{period.roomIncomes.length} paid</span>}>
          <ul className="divide-y divide-line">
            {period.roomIncomes.map((inc) => {
              const tenant = inc.room.tenant;
              return (
                <li key={`${inc.id}-${inc.status}-${inc.amount}`}>
                  <form action={updateRoomIncome} className="flex flex-wrap items-center gap-2 py-2">
                    <input type="hidden" name="incomeId" value={inc.id} />
                    <div className="w-28 min-w-0 flex-1 sm:flex-none">
                      <Link href={`/kamar/${inc.room.number}`} className="font-display font-bold hover:underline">Room {inc.room.number}</Link>
                      <div className="truncate text-xs text-ink-soft">{tenant?.name ?? "—"}</div>
                    </div>
                    <AutoSubmitSelect name="status" defaultValue={inc.status} aria-label={`Status of room ${inc.room.number}`}
                      className={`pill cursor-pointer appearance-none border-0 py-1.5 pr-3 outline-none ${TONE_CLASS[STATUS_TONE[inc.status]]}`}>
                      {STATUS_OPTIONS.map((st) => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}
                    </AutoSubmitSelect>
                    <div className="ml-auto flex items-center gap-2">
                      {inc.status === "TUNDA_BAYAR" && (
                        <WaButton phone={tenant?.phone} label="Remind"
                          text={reminderText(tenant?.name ?? "", inc.room.number, inc.room.monthlyRent, year, month)} />
                      )}
                      <label className="flex items-center rounded-full border border-line bg-cream px-3 py-1.5 focus-within:border-ink">
                        <span className="mr-1 text-xs text-ink-soft">Rp</span>
                        <AutoSubmitAmount name="amount" defaultValue={inc.amount} aria-label={`Amount for room ${inc.room.number}`}
                          className="num w-24 bg-transparent text-right text-sm outline-none" />
                      </label>
                    </div>
                  </form>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex justify-between rounded-2xl bg-cream px-4 py-3 text-sm font-semibold">
            <span>Total room rent</span>
            <span className="num">{rupiah(s.roomTotal)}</span>
          </div>
        </Section>

        <div className="flex flex-col gap-4">
          <Section title="Operating expenses">
            {period.expenses.length === 0 ? <Empty>No expenses yet.</Empty> : (
              <ul className="divide-y divide-line">
                {period.expenses.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 py-2">
                    <span className="pill w-28 justify-center bg-cream">{CATEGORY_LABEL[e.category]}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{e.description}</span>
                    <span className="num text-sm">{rupiah(e.amount)}</span>
                    <form action={deleteExpense}>
                      <input type="hidden" name="id" value={e.id} />
                      <ConfirmButton message={`Delete expense "${e.description}"?`} aria-label="Delete"
                        className="cursor-pointer rounded-full p-1.5 text-ink-soft hover:bg-blush hover:text-blush-deep">
                        <IconTrash width={16} height={16} />
                      </ConfirmButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={addExpense} className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-cream p-3 sm:grid-cols-[auto_1fr_8rem_auto]">
              <input type="hidden" name="periodId" value={period.id} />
              <select name="category" aria-label="Category" className="field" defaultValue="LISTRIK">
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </select>
              <input name="amount" inputMode="numeric" required placeholder="Amount" aria-label="Amount" className="field num sm:order-3" />
              <input name="description" placeholder="Description" aria-label="Description" className="field col-span-2 sm:order-2 sm:col-span-1" />
              <SubmitButton className="btn-primary col-span-2 sm:order-4 sm:col-span-1" pendingText="…"><IconPlus width={16} height={16} /> Add</SubmitButton>
            </form>
          </Section>

          <Section title="Other income">
            {period.additionalIncomes.length === 0 ? <Empty>No other income yet.</Empty> : (
              <ul className="divide-y divide-line">
                {period.additionalIncomes.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{a.description}</div>
                      {a.source && <div className="text-xs text-ink-soft">{a.source}</div>}
                    </div>
                    <span className="num text-sm">{rupiah(a.amount)}</span>
                    <form action={deleteAdditionalIncome}>
                      <input type="hidden" name="id" value={a.id} />
                      <ConfirmButton message={`Delete "${a.description}"?`} aria-label="Delete"
                        className="cursor-pointer rounded-full p-1.5 text-ink-soft hover:bg-blush hover:text-blush-deep">
                        <IconTrash width={16} height={16} />
                      </ConfirmButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={addAdditionalIncome} className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-cream p-3 sm:grid-cols-[1fr_1fr_8rem_auto]">
              <input type="hidden" name="periodId" value={period.id} />
              <input name="description" required placeholder="Description" aria-label="Description" className="field col-span-2 sm:col-span-1" />
              <input name="source" placeholder="Source" aria-label="Source" className="field" />
              <input name="amount" inputMode="numeric" required placeholder="Amount" aria-label="Amount" className="field num" />
              <SubmitButton className="btn-primary col-span-2 sm:col-span-1" pendingText="…"><IconPlus width={16} height={16} /> Add</SubmitButton>
            </form>
          </Section>

          <section className="card bg-ink text-cream">
            <h2 className="h-display mb-3 text-lg">Cash flow summary</h2>
            <dl className="space-y-1.5 text-sm">
              {[
                ["Total room rent", s.roomTotal],
                ["Other income", s.additionalTotal],
                ["Total income", s.incomeTotal],
                ["Total expenses", -s.expenseTotal],
                ["Net cash flow", s.netFlow],
                ["Opening balance", s.openingBalance],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-cream/70">{k}</dt>
                  <dd className="num">{rupiah(v as number)}</dd>
                </div>
              ))}
              <div className="mt-2 flex justify-between gap-3 border-t border-cream/20 pt-3 text-base font-semibold">
                <dt>Closing balance</dt>
                <dd className="num text-butter">{rupiah(s.closingBalance)}</dd>
              </div>
            </dl>
          </section>

          <Section title="Transfer checklist"
            action={<span className="pill bg-cream">{transfers.filter((t) => t.isSent).length}/{transfers.length}</span>}>
            {transfers.length === 0 ? (
              <Empty>No recipients yet. Add them in <Link href="/pengaturan" className="underline">Settings</Link>.</Empty>
            ) : (
              <ul className="space-y-1.5">
                {transfers.map((t) => (
                  <li key={t.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl pr-2 ${t.isSent ? "bg-mint text-mint-deep" : "bg-cream"}`}>
                    <form action={toggleTransfer} className="min-w-0 flex-1">
                      <input type="hidden" name="id" value={t.id} />
                      <button className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm ${t.isSent ? "" : "hover:bg-cream-2"}`}>
                        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${t.isSent ? "border-mint-deep bg-mint-deep text-mint" : "border-ink/30"}`}>
                          {t.isSent && <IconCheck width={12} height={12} strokeWidth={3} />}
                        </span>
                        <span className="flex-1 font-medium">
                          Transfer to {t.recipient.name}
                          {t.recipient.role && <span className="ml-1.5 text-xs opacity-70">· {t.recipient.role}</span>}
                        </span>
                        {t.sentAt && <span className="num text-xs">{t.sentAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
                      </button>
                    </form>
                    <span className="pl-11 sm:pl-0">
                      <BankAccount bank={t.recipient.bankName} account={t.recipient.accountNumber} holder={t.recipient.accountHolder} />
                    </span>
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

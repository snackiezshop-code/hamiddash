import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getPeriod, summarize } from "@/lib/cashbook";
import {
  CATEGORY_LABEL, STATUS_LABEL, STATUS_OPTIONS, STATUS_TONE, TONE_CLASS,
  isFuturePeriod, parsePeriodSlug, periodLabel, periodSlug, reminderText, rupiah, shiftMonth,
} from "@/lib/format";
import {
  addAdditionalIncome, deleteAdditionalIncome, deleteExpense, startPeriod, toggleTransfer, updateRoomIncome,
} from "@/app/actions";
import { Empty, PageHeader, Section, StatCard, WaButton } from "@/components/ui";
import { BankAccount } from "@/components/bank";
import { AmountInput, AutoSubmitAmount, ConfirmButton, SubmitButton } from "@/components/forms";
import { Avatar, CountPill, IconBadge, ListRow, EXPENSE_META, STATUS_PASTEL } from "@/components/kit";
import { SegmentedLinks, SelectPill, SwitchSubmit } from "@/components/kit-client";
import { MonthSelect } from "@/components/month-select";
import { QuickAddButton } from "@/components/quick-add";
import { dueLabel, dueOrder, isDue, transferDue } from "@/lib/transfers";
import {
  IconAlert, IconCheck, IconChevronLeft, IconChevronRight, IconDownload, IconPlus, IconTrash, IconWallet,
} from "@/components/icons";

const TABS = [
  { key: "summary", label: "Summary" },
  { key: "rent", label: "Rent" },
  { key: "expenses", label: "Expenses" },
  { key: "transfers", label: "Transfers" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export default async function CashPeriodPage({ params, searchParams }: PageProps<"/kas/[period]">) {
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
    monthOptions.unshift({ value: slug, label: `${label} (not started)` });
  }

  // Phones pick a month from the pill; desktop keeps the arrow stepper.
  const nav = (
    <>
      <div className="flex w-full md:hidden">
        <MonthSelect options={monthOptions} value={slug} tab={tab} />
      </div>
      <div className="hidden items-center gap-1 md:flex">
        <Link href={`/kas/${periodSlug(prev.year, prev.month)}`} className="btn-secondary btn-sm" aria-label="Previous month">
          <IconChevronLeft width={16} height={16} />
        </Link>
        {nextOpen ? (
          <Link href={`/kas/${periodSlug(next.year, next.month)}`} className="btn-secondary btn-sm" aria-label="Next month">
            <IconChevronRight width={16} height={16} />
          </Link>
        ) : (
          <span className="btn-secondary btn-sm cursor-not-allowed opacity-40" aria-disabled="true" title="Next month hasn't started yet">
            <IconChevronRight width={16} height={16} />
          </span>
        )}
      </div>
    </>
  );

  if (!period) {
    return (
      <>
        <PageHeader title="Cash Book" subtitle={label} actions={nav} actionsClassName="w-full md:w-auto" />
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
  // Max and BNI every month, plus the heir whose turn it is; the other heirs are listed after, faded.
  const transfers = period.transferChecks
    .filter((t) => t.recipient.isActive || t.isSent)
    .map((t) => ({ ...t, due: transferDue(t.recipientId, year, month) }))
    .sort((a, b) => dueOrder(a.due) - dueOrder(b.due));
  // On phones only the chosen tab's sections show; from md up everything shows as before.
  const on = (key: Tab, grid = false) =>
    tab === key ? (grid ? "grid" : "block") : grid ? "hidden md:grid" : "hidden md:block";

  return (
    <>
      <PageHeader title="Cash Book" subtitle={`Cash flow report · ${label}`} actionsClassName="w-full md:w-auto"
        actions={<>
          {nav}
          <a href={`/kas/${slug}/report`} className="btn-secondary btn-sm"><IconDownload width={16} height={16} /> Download PDF</a>
        </>} />

      <div className="mb-5 md:hidden">
        <SegmentedLinks label="Cash book sections" items={TABS.map((t) => ({
          href: `/kas/${slug}?tab=${t.key}`, label: t.label, active: tab === t.key,
        }))} />
      </div>

      <div className={`mb-6 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 ${on("summary", true)}`}>
        <StatCard tone="white" icon={<IconWallet />} label="Opening balance" value={rupiah(s.openingBalance)}
          footer={<span className="text-ink-soft">Closing balance of {periodLabel(prev.year, prev.month)}</span>} />
        <StatCard tone="mint" icon={<IconCheck />} label="Income" value={rupiah(s.incomeTotal)}
          footer={`Rent ${rupiah(s.roomTotal)} · other ${rupiah(s.additionalTotal)}`} />
        <StatCard tone="blush" icon={<IconAlert />} label="Expenses" value={rupiah(s.expenseTotal)}
          footer={`${period.expenses.length} ${period.expenses.length === 1 ? "transaction" : "transactions"}`} />
        <StatCard tone="ink" icon={<IconWallet />} label="Closing balance" value={rupiah(s.closingBalance)}
          footer={<span className={`pill ${s.netFlow >= 0 ? "bg-mint text-mint-deep" : "bg-terra-strong text-[#F6F1E5]"}`}>
            Net cash flow {s.netFlow >= 0 ? "+" : ""}{rupiah(s.netFlow)}
          </span>} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Section title="Room rent income" className={on("rent")}
          action={<span className="pill bg-mint text-mint-deep">{paidCount}/{period.roomIncomes.length} paid</span>}>
          <ul className="divide-y divide-line">
            {period.roomIncomes.map((inc) => {
              const tenant = inc.room.tenant;
              return (
                <li key={`${inc.id}-${inc.status}-${inc.amount}`}>
                  <form action={updateRoomIncome} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                    <input type="hidden" name="incomeId" value={inc.id} />
                    <Link href={`/kamar/${inc.room.number}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar name={tenant?.name ?? String(inc.room.number)} tone={STATUS_PASTEL[inc.status]} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">Room {inc.room.number}</span>
                        <span className="block truncate text-xs text-ink-soft">{tenant?.name ?? "No tenant"}</span>
                      </span>
                    </Link>
                    <SelectPill name="status" autoSubmit defaultValue={inc.status} ariaLabel={`Status of room ${inc.room.number}`}
                      className="w-36 shrink-0" tone={TONE_CLASS[STATUS_TONE[inc.status]]}
                      options={STATUS_OPTIONS.map((st) => ({ value: st, label: STATUS_LABEL[st] }))} />
                    <div className="flex w-full items-center justify-end gap-2 pl-[52px] sm:w-auto sm:pl-0">
                      {inc.status === "TUNDA_BAYAR" && (
                        <WaButton iconOnly phone={tenant?.phone} label={`Remind ${tenant?.name ?? "tenant"} on WhatsApp`}
                          text={reminderText({ name: tenant?.name ?? "", roomNumber: inc.room.number, amount: inc.room.monthlyRent, year, month, dueDay: tenant?.reminderDay ?? null })} />
                      )}
                      <label className="flex min-h-11 flex-1 items-center rounded-full bg-cream-2 px-4 focus-within:ring-2 focus-within:ring-ink sm:flex-none">
                        <span className="mr-1 text-xs text-ink-soft">Rp</span>
                        <AutoSubmitAmount name="amount" defaultValue={inc.amount} aria-label={`Amount for room ${inc.room.number}`}
                          className="num w-full min-w-0 bg-transparent text-right text-sm outline-none! sm:w-24" />
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

        <div className="flex min-w-0 flex-col gap-4">
          <Section title="Operating expenses" className={on("expenses")}
            action={<QuickAddButton kind="expense" preset={{ periodId: period.id, periodLabel: label }} className="btn-primary btn-sm shrink-0 whitespace-nowrap">
              <IconPlus width={16} height={16} /> Add expense
            </QuickAddButton>}>
            {period.expenses.length === 0 ? <Empty>No expenses yet.</Empty> : (
              <ul className="divide-y divide-line">
                {period.expenses.map((e) => {
                  const meta = EXPENSE_META[e.category];
                  const title = e.description && e.description !== "-" ? e.description : CATEGORY_LABEL[e.category];
                  return (
                    <li key={e.id}>
                      <ListRow
                        leading={<IconBadge icon={meta.icon} tone={meta.tone} />}
                        title={title}
                        subtitle={title === CATEGORY_LABEL[e.category] ? undefined : CATEGORY_LABEL[e.category]}
                        trailing={
                          <div className="flex shrink-0 items-center gap-1">
                            <span className="num text-sm font-semibold">{rupiah(e.amount)}</span>
                            <form action={deleteExpense}>
                              <input type="hidden" name="id" value={e.id} />
                              <ConfirmButton message={`Delete expense "${title}"?`} aria-label={`Delete expense ${title}`}
                                className="grid h-11 w-11 cursor-pointer place-items-center rounded-full text-ink-soft hover:bg-terra-strong hover:text-[#F6F1E5]">
                                <IconTrash width={18} height={18} />
                              </ConfirmButton>
                            </form>
                          </div>
                        } />
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-3 flex justify-between rounded-2xl bg-cream px-4 py-3 text-sm font-semibold">
              <span>Total expenses</span>
              <span className="num">{rupiah(s.expenseTotal)}</span>
            </div>
          </Section>

          <section className={`card bg-ink text-cream ${on("summary")}`}>
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

          <Section title="Other income" className={on("summary")}>
            {period.additionalIncomes.length === 0 ? <Empty>No other income yet.</Empty> : (
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
                      <ConfirmButton message={`Delete "${a.description}"?`} aria-label={`Delete ${a.description}`}
                        className="grid h-11 w-11 cursor-pointer place-items-center rounded-full text-ink-soft hover:bg-terra-strong hover:text-[#F6F1E5]">
                        <IconTrash width={18} height={18} />
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
              <AmountInput name="amount" required pattern="[0-9.,\s]*[1-9][0-9.,\s]*" title="Enter an amount above 0"
                placeholder="Amount" aria-label="Amount" className="field num" />
              <SubmitButton className="btn-primary col-span-2 sm:col-span-1" pendingText="Adding…"><IconPlus width={16} height={16} /> Add</SubmitButton>
            </form>
          </Section>

          <Section title="Transfer checklist" className={on("transfers")}
            action={<CountPill n={transfers.filter((t) => isDue(t.due) && !t.isSent).length} />}>
            {transfers.length === 0 ? (
              <Empty>No recipients yet. Add them in <Link href="/pengaturan" className="underline">Settings</Link>.</Empty>
            ) : (
              <ul className="space-y-2">
                {transfers.map((t) => (
                  <li key={t.id} className={`rounded-3xl py-1 pr-3 pl-1 ${
                    t.isSent ? "bg-mint" : t.due.kind === "turn" ? "bg-butter" : isDue(t.due) ? "bg-cream" : "border border-dashed border-line"
                  }`}>
                    <div className="flex items-center gap-2">
                      <form action={toggleTransfer}>
                        <input type="hidden" name="id" value={t.id} />
                        <SwitchSubmit checked={t.isSent} label={`Transfer to ${t.recipient.name} sent`} />
                      </form>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">
                          Transfer to {t.recipient.name}
                          {t.recipient.role && <span className="ml-1.5 text-xs font-normal text-ink-soft">· {t.recipient.role}</span>}
                        </div>
                        <div className="text-xs text-ink-soft">
                          {t.due.kind === "later" ? `Turn in ${dueLabel(t.due)}` : dueLabel(t.due)}
                          {" · "}
                          {t.isSent && t.sentAt
                            ? `Sent ${t.sentAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" })}`
                            : isDue(t.due) ? "Not sent yet" : "Not due"}
                        </div>
                      </div>
                    </div>
                    {(t.recipient.accountNumber || t.recipient.bankName) && (
                      <div className="pb-1 pl-[52px]">
                        <BankAccount bank={t.recipient.bankName} account={t.recipient.accountNumber} holder={t.recipient.accountHolder} />
                      </div>
                    )}
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

"use client";

import { useState } from "react";
import type { ExpenseCategory } from "@/generated/prisma/enums";
import { CATEGORY_LABEL, CATEGORY_OPTIONS, formatDate, rupiah } from "@/lib/format";
import { deleteExpense, updateExpense } from "@/app/actions";
import { errorDetails, reportClientIssue } from "@/lib/client-log";
import { EXPENSE_META, IconBadge } from "./kit";
import { Field, SelectPill, Sheet } from "./kit-client";
import { AmountInput, ConfirmButton, SubmitButton } from "./forms";
import { IconChevronRight, IconEdit, IconTrash } from "./icons";

export type ExpenseItem = {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  createdAt: Date;
};

const titleOf = (e: ExpenseItem) => (e.description && e.description !== "-" ? e.description : CATEGORY_LABEL[e.category]);

// Each expense row opens a sheet with its full description; admins can edit or delete it from there.
export function ExpenseList({ expenses, periodLabel, editable }: { expenses: ExpenseItem[]; periodLabel: string; editable: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);
  // Looked up from props so the sheet shows saved changes, and closes once the expense is deleted.
  const current = expenses.find((e) => e.id === openId) ?? null;

  return (
    <>
      <ul className="divide-y divide-line">
        {expenses.map((e) => {
          const meta = EXPENSE_META[e.category];
          const title = titleOf(e);
          return (
            <li key={e.id}>
              <button type="button" onClick={() => setOpenId(e.id)} aria-haspopup="dialog"
                className="-mx-2 flex min-h-14 w-[calc(100%+1rem)] cursor-pointer items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-cream/70">
                <IconBadge icon={meta.icon} tone={meta.tone} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{title}</span>
                  {title !== CATEGORY_LABEL[e.category] && <span className="block truncate text-xs text-ink-soft">{CATEGORY_LABEL[e.category]}</span>}
                </span>
                <span className="num shrink-0 text-sm font-semibold">{rupiah(e.amount)}</span>
                <IconChevronRight width={16} className="shrink-0 text-ink-soft" />
              </button>
            </li>
          );
        })}
      </ul>
      <ExpenseSheet key={current?.id ?? "none"} expense={current} periodLabel={periodLabel} editable={editable} onClose={() => setOpenId(null)} />
    </>
  );
}

function ExpenseSheet({ expense, periodLabel, editable, onClose }: {
  expense: ExpenseItem | null;
  periodLabel: string;
  editable: boolean;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const e = expense;

  return (
    <Sheet open={Boolean(e)} onClose={onClose} title={editing ? "Edit expense" : "Expense"}>
      {e && !editing && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <IconBadge icon={EXPENSE_META[e.category].icon} tone={EXPENSE_META[e.category].tone} size={56} />
            <div className="num text-3xl font-semibold tracking-tight">{rupiah(e.amount)}</div>
            <p className="text-sm font-semibold break-words whitespace-pre-line">{titleOf(e)}</p>
          </div>
          <dl className="divide-y divide-line rounded-2xl bg-white px-4 text-sm">
            {[
              ["Category", CATEGORY_LABEL[e.category]],
              ["Cash book", periodLabel],
              ["Recorded", formatDate(e.createdAt)],
            ].map(([k, v]) => (
              <div key={k} className="flex min-h-11 items-center justify-between gap-3 py-2">
                <dt className="text-ink-soft">{k}</dt>
                <dd className="text-right font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          {editable && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { setError(null); setEditing(true); }} className="btn-primary flex-1">
                <IconEdit width={24} /> Edit
              </button>
              <form action={deleteExpense}>
                <input type="hidden" name="id" value={e.id} />
                <ConfirmButton message={`Delete expense "${titleOf(e)}"?`} aria-label={`Delete expense ${titleOf(e)}`}
                  className="btn-secondary cursor-pointer">
                  <IconTrash width={18} height={18} /> Delete
                </ConfirmButton>
              </form>
            </div>
          )}
        </div>
      )}

      {e && editing && (
        <form className="flex flex-col gap-4"
          action={async (fd) => {
            setError(null);
            try {
              const res = await updateExpense(fd);
              if (typeof res === "string") setError(res);
              else setEditing(false);
            } catch (err) {
              reportClientIssue("form-save-failed", { form: "Edit expense", ...errorDetails(err) });
              setError("Couldn't save. Check your connection and try again.");
            }
          }}>
          <input type="hidden" name="id" value={e.id} />
          <div>
            <span className="label">Category</span>
            <SelectPill name="category" ariaLabel="Category" defaultValue={e.category}
              options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))} />
          </div>
          <Field label="Description" htmlFor="exp-edit-desc">
            <input id="exp-edit-desc" name="description" defaultValue={e.description === "-" ? "" : e.description} className="field" />
          </Field>
          <Field label="Amount (Rp)" htmlFor="exp-edit-amount">
            <AmountInput id="exp-edit-amount" name="amount" defaultValue={e.amount} required
              pattern="[0-9.,\s]*[1-9][0-9.,\s]*" title="Enter an amount above 0" className="field num" />
          </Field>
          {error && <p role="alert" className="rounded-xl bg-blush px-4 py-3 text-sm font-semibold text-blush-deep">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary flex-1">Cancel</button>
            <SubmitButton className="btn-primary flex-1" pendingText="Saving…">Save</SubmitButton>
          </div>
        </form>
      )}
    </Sheet>
  );
}

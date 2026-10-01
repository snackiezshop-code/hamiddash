"use client";

import { useState } from "react";
import type { ExpenseCategory } from "@/generated/prisma/enums";
import { expenseCategoryName, formatDate, rupiah } from "@/lib/format";
import { deleteExpense, updateExpense } from "@/app/actions";
import { errorDetails, reportClientIssue } from "@/lib/client-log";
import { EXPENSE_META, IconBadge } from "./kit";
import { Field, Sheet } from "./kit-client";
import { ExpenseCategoryField } from "./expense-category-field";
import { AmountInput, ConfirmButton, SubmitButton } from "./forms";
import { IconChevronRight, IconEdit, IconTrash } from "./icons";

export type ExpenseItem = {
  id: string;
  category: ExpenseCategory;
  categoryLabel: string | null;
  description: string;
  amount: number;
  createdAt: Date;
  transferCheckId?: string | null;
};

const titleOf = (e: ExpenseItem) => (e.description && e.description !== "-" ? e.description : expenseCategoryName(e));

type Group = { name: string; meta: (typeof EXPENSE_META)[ExpenseCategory]; total: number; items: ExpenseItem[] };

// Expenses grouped by category (a typed-in "Other" name is its own group), biggest total first, so
// the month reads as "where did the money go". Each row opens a sheet to view, edit or delete it.
export function ExpenseList({ expenses, periodLabel, editable }: { expenses: ExpenseItem[]; periodLabel: string; editable: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);
  // Looked up from props so the sheet shows saved changes, and closes once the expense is deleted.
  const current = expenses.find((e) => e.id === openId) ?? null;

  const byName = new Map<string, Group>();
  for (const e of expenses) {
    const name = expenseCategoryName(e);
    const g = byName.get(name) ?? { name, meta: EXPENSE_META[e.category], total: 0, items: [] };
    g.total += e.amount;
    g.items.push(e);
    byName.set(name, g);
  }
  const groups = [...byName.values()].sort((a, b) => b.total - a.total);

  const row = "-mx-2 flex min-h-11 w-[calc(100%+1rem)] cursor-pointer items-center gap-3 rounded-[4px] px-2 py-1.5 text-left transition-colors hover:bg-cream";

  return (
    <>
      <ul className="divide-y divide-line">
        {groups.map((g) => {
          const single = g.items.length === 1 ? g.items[0] : null;
          const head = (
            <>
              <IconBadge icon={g.meta.icon} tone={g.meta.tone} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{single ? titleOf(single) : g.name}</span>
                <span className="block truncate text-xs text-ink-soft">
                  {single ? (titleOf(single) !== g.name ? g.name : formatDate(single.createdAt)) : `${g.items.length} pembayaran`}
                </span>
              </span>
              <span className="num shrink-0 text-sm font-semibold">{rupiah(g.total)}</span>
            </>
          );
          return (
            <li key={g.name} className="py-1.5">
              {single ? (
                <button type="button" onClick={() => setOpenId(single.id)} aria-haspopup="dialog" className={row}>
                  {head}
                  <IconChevronRight width={16} className="shrink-0 text-ink-soft" />
                </button>
              ) : (
                <>
                  {/* pr-7 lines the group total up with the item amounts (they end before a chevron). */}
                  <div className="flex min-h-11 items-center gap-3 py-1.5 pr-7">{head}</div>
                  <ul>
                    {g.items.map((e) => (
                      <li key={e.id}>
                        <button type="button" onClick={() => setOpenId(e.id)} aria-haspopup="dialog" className={`${row} pl-[60px]`}>
                          <span className="min-w-0 flex-1 truncate text-sm">{titleOf(e)}</span>
                          <span className="num shrink-0 text-sm text-ink-soft">{rupiah(e.amount)}</span>
                          <IconChevronRight width={16} className="shrink-0 text-ink-soft" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
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
    <Sheet open={Boolean(e)} onClose={onClose} title={editing ? "Edit pengeluaran" : "Pengeluaran"}>
      {e && !editing && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <IconBadge icon={EXPENSE_META[e.category].icon} tone={EXPENSE_META[e.category].tone} size={56} />
            <div className="num text-3xl font-medium tracking-tight">{rupiah(e.amount)}</div>
            <p className="text-sm font-medium break-words whitespace-pre-line">{titleOf(e)}</p>
          </div>
          <dl className="divide-y divide-line border-y-[1.5px] border-ink text-sm">
            {[
              ["Kategori", expenseCategoryName(e)],
              ["Buku kas", periodLabel],
              ["Dicatat", e.transferCheckId ? `${formatDate(e.createdAt)} · dari daftar transfer` : formatDate(e.createdAt)],
            ].map(([k, v]) => (
              <div key={k} className="flex min-h-11 items-center justify-between gap-3 py-2">
                <dt className="text-ink-soft">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {editable && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { setError(null); setEditing(true); }} className="btn-primary flex-1">
                <IconEdit width={18} /> Edit
              </button>
              <form action={deleteExpense}>
                <input type="hidden" name="id" value={e.id} />
                <ConfirmButton message={`Hapus pengeluaran "${titleOf(e)}"?`} aria-label={`Hapus pengeluaran ${titleOf(e)}`}
                  className="btn-secondary cursor-pointer">
                  <IconTrash width={18} /> Hapus
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
              setError("Gagal menyimpan. Periksa koneksi, lalu coba lagi.");
            }
          }}>
          <input type="hidden" name="id" value={e.id} />
          <ExpenseCategoryField idPrefix="exp-edit" defaultCategory={e.category} defaultLabel={e.categoryLabel} />
          <Field label="Keterangan" htmlFor="exp-edit-desc">
            <input id="exp-edit-desc" name="description" defaultValue={e.description === "-" ? "" : e.description} className="field" />
          </Field>
          <Field label="Jumlah (Rp)" htmlFor="exp-edit-amount">
            <AmountInput id="exp-edit-amount" name="amount" defaultValue={e.amount} required
              pattern="[0-9.,\s]*[1-9][0-9.,\s]*" title="Isi jumlah lebih dari 0" className="field num" />
          </Field>
          {error && <p role="alert" className="rounded-[4px] border-[1.5px] border-blush-deep bg-blush px-4 py-3 text-sm font-semibold text-blush-deep">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary flex-1">Batal</button>
            <SubmitButton className="btn-primary flex-1" pendingText="Menyimpan…">Simpan</SubmitButton>
          </div>
        </form>
      )}
    </Sheet>
  );
}

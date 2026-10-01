"use client";

import type { ExpenseCategory, Repeat } from "@/generated/prisma/enums";
import { CATEGORY_LABEL, CATEGORY_OPTIONS } from "@/lib/format";
import { REMIND_OPTIONS, REPEAT_LABEL, REPEAT_OPTIONS, remindLabel } from "@/lib/reminder-items";
import { TASK_CATEGORIES } from "./kit";
import { DuePills, Field, SelectPill } from "./kit-client";
import { AmountInput } from "./forms";

export type ReminderDefaults = {
  title?: string;
  dueDate?: string; // yyyy-mm-dd
  repeat?: Repeat;
  remindBefore?: number;
  amount?: number | null;
  category?: ExpenseCategory | null;
  tag?: string | null;
  roomId?: string | null;
};

// The fields behind both "Tambah pengingat" and "Edit pengingat". Only the title is required. A cash book
// category turns it into a bill: Paid records the expense, with the fixed amount if there is one,
// or asks for the amount (bills that change every month, like electricity and water).
export function ReminderFields({ idPrefix, rooms, defaults = {} }: {
  idPrefix: string;
  rooms: { id: string; number: number }[];
  defaults?: ReminderDefaults;
}) {
  return (
    <>
      <Field label="Yang perlu diingat" htmlFor={`${idPrefix}-title`}>
        <input id={`${idPrefix}-title`} name="title" required defaultValue={defaults.title} autoComplete="off"
          placeholder="Bayar jasa kebersihan" className="field" />
      </Field>
      <DuePills name="dueDate" label="Tanggal" defaultValue={defaults.dueDate} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="label">Ulangi</span>
          <SelectPill name="repeat" ariaLabel="Ulangi" defaultValue={defaults.repeat ?? "NONE"}
            options={REPEAT_OPTIONS.map((r) => ({ value: r, label: REPEAT_LABEL[r] }))} />
        </div>
        <div>
          <span className="label">Ingatkan</span>
          <SelectPill name="remindBefore" ariaLabel="Ingatkan" defaultValue={String(defaults.remindBefore ?? 1)}
            options={REMIND_OPTIONS.map((d) => ({ value: String(d), label: remindLabel(d) }))} />
        </div>
        <div>
          <span className="label">Kategori buku kas</span>
          <SelectPill name="category" ariaLabel="Kategori buku kas" defaultValue={defaults.category ?? ""}
            options={[{ value: "", label: "Tidak ada" }, ...CATEGORY_OPTIONS.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))]} />
        </div>
        <Field label="Jumlah tetap" htmlFor={`${idPrefix}-amount`}>
          <AmountInput id={`${idPrefix}-amount`} name="amount" defaultValue={defaults.amount} placeholder="Rp" className="field num" />
        </Field>
      </div>
      <p className="-mt-2 text-xs text-ink-soft">
        Dengan kategori, ini jadi tagihan: Dibayar menambahkannya ke pengeluaran bulan ini. Kosongkan jumlah kalau berubah tiap bulan; isi saat membayar.
      </p>
      <details className="group">
        <summary className="eyebrow inline-flex min-h-11 cursor-pointer items-center text-ink-soft hover:text-ink">
          Opsi lain
        </summary>
        <div className="mt-2 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="label">Jenis</span>
              <SelectPill name="tag" ariaLabel="Jenis" defaultValue={defaults.tag ?? ""}
                options={[{ value: "", label: "Tidak ada" }, ...TASK_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))]} />
            </div>
            <div>
              <span className="label">Kamar</span>
              <SelectPill name="roomId" ariaLabel="Kamar" defaultValue={defaults.roomId ?? ""}
                options={[{ value: "", label: "Tanpa kamar" }, ...rooms.map((r) => ({ value: r.id, label: `Kamar ${r.number}` }))]} />
            </div>
          </div>
        </div>
      </details>
    </>
  );
}

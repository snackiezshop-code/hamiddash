"use client";

import type { ExpenseCategory, Repeat } from "@/generated/prisma/enums";
import { CATEGORY_LABEL, CATEGORY_OPTIONS } from "@/lib/format";
import { REPEAT_LABEL, REPEAT_OPTIONS } from "@/lib/reminder-items";
import { TASK_CATEGORIES } from "./kit";
import { DuePills, Field, SelectPill } from "./kit-client";
import { AmountInput } from "./forms";

export type ReminderDefaults = {
  title?: string;
  dueDate?: string; // yyyy-mm-dd
  repeat?: Repeat;
  amount?: number | null;
  category?: ExpenseCategory | null;
  tag?: string | null;
  roomId?: string | null;
};

// The fields behind both "Add reminder" and "Edit reminder". Only the title is required; an amount
// turns the reminder into a bill whose Paid button records the expense.
export function ReminderFields({ idPrefix, rooms, defaults = {} }: {
  idPrefix: string;
  rooms: { id: string; number: number }[];
  defaults?: ReminderDefaults;
}) {
  return (
    <>
      <Field label="What to remember" htmlFor={`${idPrefix}-title`}>
        <input id={`${idPrefix}-title`} name="title" required defaultValue={defaults.title} autoComplete="off"
          placeholder="e.g. Pay the cleaning service" className="field" />
      </Field>
      <DuePills name="dueDate" label="Date" defaultValue={defaults.dueDate} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="label">Repeats</span>
          <SelectPill name="repeat" ariaLabel="Repeats" defaultValue={defaults.repeat ?? "NONE"}
            options={REPEAT_OPTIONS.map((r) => ({ value: r, label: REPEAT_LABEL[r] }))} />
        </div>
        <Field label="Amount (optional)" htmlFor={`${idPrefix}-amount`}>
          <AmountInput id={`${idPrefix}-amount`} name="amount" defaultValue={defaults.amount} placeholder="Rp" className="field num" />
        </Field>
      </div>
      <p className="-mt-2 text-xs text-ink-soft">With an amount, marking it paid adds it to this month&apos;s expenses.</p>
      <details className="group">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-ink-soft hover:text-ink">
          More options
        </summary>
        <div className="mt-2 flex flex-col gap-3">
          <div>
            <span className="label">Expense category</span>
            <SelectPill name="category" ariaLabel="Expense category" defaultValue={defaults.category ?? "LAINNYA"}
              options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="label">Type</span>
              <SelectPill name="tag" ariaLabel="Type" defaultValue={defaults.tag ?? ""}
                options={[{ value: "", label: "None" }, ...TASK_CATEGORIES.map((c) => ({ value: c.value, label: c.value }))]} />
            </div>
            <div>
              <span className="label">Room</span>
              <SelectPill name="roomId" ariaLabel="Room" defaultValue={defaults.roomId ?? ""}
                options={[{ value: "", label: "No room" }, ...rooms.map((r) => ({ value: r.id, label: `Room ${r.number}` }))]} />
            </div>
          </div>
        </div>
      </details>
    </>
  );
}

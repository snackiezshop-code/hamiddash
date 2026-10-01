"use client";

import { useActionState, useState } from "react";
import type { ExpenseCategory, Repeat } from "@/generated/prisma/enums";
import { completeReminder, deleteReminder, reopenReminder, updateReminder } from "@/app/actions";
import { dateInputValue, formatDate, rupiah } from "@/lib/format";
import { REPEAT_LABEL, dueLabel } from "@/lib/reminder-items";
import { errorDetails, reportClientIssue } from "@/lib/client-log";
import { EXPENSE_META, IconBadge, taskCategoryMeta } from "./kit";
import { Field, Sheet } from "./kit-client";
import { AmountInput, ConfirmButton, SubmitButton } from "./forms";
import { ReminderFields } from "./reminder-form";
import { IconCheck, IconTrash, IconUndo } from "./icons";

export type ReminderItem = {
  id: string;
  title: string;
  tag: string | null;
  roomNumber: number | null;
  roomId: string | null;
  dueDate: Date | null;
  daysUntilDue: number | null; // worked out on the server in Jakarta time
  repeat: Repeat;
  remindBefore: number;
  amount: number | null;
  category: ExpenseCategory | null;
  isDone: boolean;
  doneAt: Date | null;
};

const metaOf = (r: ReminderItem) => (r.category ? EXPENSE_META[r.category] : taskCategoryMeta(r.tag));

function dueTone(days: number | null) {
  if (days === null) return "bg-cream text-ink-soft";
  if (days < 0) return "bg-blush text-blush-deep";
  if (days <= 1) return "bg-butter text-butter-deep";
  return "bg-cream text-ink-soft";
}

// Open reminders: tap a row to edit it, Selesai/Dibayar on the right. Done ones: Batalkan instead.
export function ReminderList({ items, rooms }: { items: ReminderItem[]; rooms: { id: string; number: number }[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const current = items.find((r) => r.id === openId) ?? null;

  return (
    <>
      <ul className="divide-y divide-line">
        {items.map((r) => {
          const meta = metaOf(r);
          const details = [
            r.amount ? rupiah(r.amount) : null,
            r.repeat !== "NONE" ? REPEAT_LABEL[r.repeat] : null,
            r.roomNumber ? `Kamar ${r.roomNumber}` : null,
          ].filter(Boolean).join(" · ");
          return (
            <li key={r.id} className="flex items-center gap-2 py-1">
              <button type="button" onClick={() => setOpenId(r.id)} aria-haspopup="dialog"
                className="-ml-2 flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-[4px] px-2 py-1.5 text-left transition-colors duration-200 hover:bg-cream">
                <IconBadge icon={meta.icon} tone={meta.tone} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-medium break-words ${r.isDone ? "text-ink-soft line-through" : ""}`}>{r.title}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-ink-soft">
                    {r.isDone
                      ? <span>Selesai {formatDate(r.doneAt)}</span>
                      : <span className={`pill py-0 ${dueTone(r.daysUntilDue)}`}>
                          {r.daysUntilDue !== null && r.daysUntilDue > 1 ? formatDate(r.dueDate) : dueLabel(r.daysUntilDue)}
                        </span>}
                    {details && <span className="num">{details}</span>}
                  </span>
                </span>
              </button>
              {r.isDone ? <UndoButton id={r.id} title={r.title} /> : <DoneButton item={r} />}
            </li>
          );
        })}
      </ul>
      <ReminderSheet key={current?.id ?? "none"} item={current} rooms={rooms} onClose={() => setOpenId(null)} />
    </>
  );
}

// A bill says Paid (it records the expense); everything else says Done. Errors show under the button.
// A bill without a fixed amount (electricity, water) asks for this month's amount first.
function DoneButton({ item }: { item: ReminderItem }) {
  const [asking, setAsking] = useState(false);
  const isBill = Boolean(item.amount || item.category);
  const label = isBill ? "Dibayar" : "Selesai";
  const buttonClass = "btn-secondary btn-sm";

  if (isBill && !item.amount) {
    return (
      <>
        <button type="button" onClick={() => setAsking(true)} aria-haspopup="dialog" className={`${buttonClass} shrink-0`}
          aria-label={`Tandai "${item.title}" dibayar`}>
          <IconCheck width={16} /> {label}
        </button>
        <PaySheet key={String(asking)} item={item} open={asking} onClose={() => setAsking(false)} />
      </>
    );
  }
  return <CompleteForm item={item} label={label} buttonClass={buttonClass} />;
}

function CompleteForm({ item, label, buttonClass }: { item: ReminderItem; label: string; buttonClass: string }) {
  const [error, action] = useActionState(completeReminder, null);
  return (
    <form action={action} className="flex shrink-0 flex-col items-end gap-1">
      <input type="hidden" name="id" value={item.id} />
      <SubmitButton className={buttonClass} pendingText="Menyimpan…" aria-label={`Tandai "${item.title}" ${label.toLowerCase()}`}>
        <IconCheck width={16} /> {label}
      </SubmitButton>
      {error && <p role="alert" className="max-w-44 text-right text-xs font-semibold text-blush-deep">{error}</p>}
    </form>
  );
}

function PaySheet({ item, open, onClose }: { item: ReminderItem; open: boolean; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <Sheet open={open} onClose={onClose} title={`Bayar ${item.title}`}>
      <form className="flex flex-col gap-4"
        action={async (fd) => {
          setError(null);
          try {
            const res = await completeReminder(null, fd);
            if (typeof res === "string") setError(res);
            else onClose();
          } catch (err) {
            reportClientIssue("form-save-failed", { form: "Pay reminder", ...errorDetails(err) });
            setError("Gagal menyimpan. Periksa koneksi, lalu coba lagi.");
          }
        }}>
        <input type="hidden" name="id" value={item.id} />
        <Field label="Jumlah dibayar (Rp)" htmlFor={`pay-${item.id}`}>
          <AmountInput id={`pay-${item.id}`} name="amount" required pattern="[0-9.,\s]*[1-9][0-9.,\s]*"
            title="Isi jumlah lebih dari 0" placeholder="385.000" className="field num" />
        </Field>
        <p className="-mt-2 text-xs text-ink-soft">
          Masuk ke pengeluaran bulan ini{item.repeat !== "NONE" ? `, lalu pengingat pindah ke tanggal berikutnya` : ""}.
        </p>
        {error && <p role="alert" className="rounded-[4px] border-[1.5px] border-blush-deep bg-blush px-4 py-3 text-sm font-semibold text-blush-deep">{error}</p>}
        <SubmitButton className="btn-primary w-full" pendingText="Menyimpan…">Simpan pembayaran</SubmitButton>
      </form>
    </Sheet>
  );
}

function UndoButton({ id, title }: { id: string; title: string }) {
  return (
    <form action={reopenReminder} className="shrink-0">
      <input type="hidden" name="id" value={id} />
      <SubmitButton className="btn-secondary btn-sm" pendingText="…" aria-label={`Batalkan selesai "${title}"`}>
        <IconUndo width={16} /> Batalkan
      </SubmitButton>
    </form>
  );
}

function ReminderSheet({ item, rooms, onClose }: { item: ReminderItem | null; rooms: { id: string; number: number }[]; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <Sheet open={Boolean(item)} onClose={onClose} title="Edit pengingat">
      {item && (
        <div className="flex flex-col gap-4">
          <form className="flex flex-col gap-4"
            action={async (fd) => {
              setError(null);
              try {
                const res = await updateReminder(fd);
                if (typeof res === "string") setError(res);
                else onClose();
              } catch (err) {
                reportClientIssue("form-save-failed", { form: "Edit reminder", ...errorDetails(err) });
                setError("Gagal menyimpan. Periksa koneksi, lalu coba lagi.");
              }
            }}>
            <input type="hidden" name="id" value={item.id} />
            <ReminderFields idPrefix={`rem-${item.id}`} rooms={rooms} defaults={{
              title: item.title, dueDate: dateInputValue(item.dueDate), repeat: item.repeat, remindBefore: item.remindBefore,
              amount: item.amount, category: item.category, tag: item.tag, roomId: item.roomId,
            }} />
            {error && <p role="alert" className="rounded-[4px] border-[1.5px] border-blush-deep bg-blush px-4 py-3 text-sm font-semibold text-blush-deep">{error}</p>}
            <SubmitButton className="btn-primary w-full" pendingText="Menyimpan…">Simpan perubahan</SubmitButton>
          </form>
          <form action={deleteReminder} className="flex justify-center">
            <input type="hidden" name="id" value={item.id} />
            <ConfirmButton message={`Hapus pengingat "${item.title}"?`} aria-label={`Hapus pengingat ${item.title}`}
              className="btn-secondary btn-sm">
              <IconTrash width={16} /> Hapus pengingat
            </ConfirmButton>
          </form>
        </div>
      )}
    </Sheet>
  );
}

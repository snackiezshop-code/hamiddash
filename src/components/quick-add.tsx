"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { IconAlarmClock, IconBanknote, IconChevronRight, IconReceipt, IconUserPlus, type AppIcon } from "./icons";
import { addExpense, addReminder, addTenant, updateRoomIncome } from "@/app/actions";
import { rupiah } from "@/lib/format";
import { Field, FormSheet, SelectPill, Sheet } from "./kit-client";
import { AmountInput } from "./forms";
import { ReminderFields } from "./reminder-form";
import { ExpenseCategoryField } from "./expense-category-field";

export type QuickAddData = {
  period: { id: string; label: string } | null;
  unpaid: { incomeId: string; roomNumber: number; tenant: string | null; rent: number }[];
  vacantRooms: { id: string; number: number }[];
  rooms: { id: string; number: number }[];
};

type Kind = "menu" | "payment" | "tenant" | "expense" | "reminder";
export type QuickAction = { kind: Exclude<Kind, "menu">; label: string; hint: string; icon: AppIcon; tone: string };
type Preset = { roomId?: string; periodId?: string; periodLabel?: string };

const Ctx = createContext<{ open: (kind: Kind, preset?: Preset) => void; isOpen: boolean; actions: QuickAction[] } | null>(null);

export function useQuickAdd() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useQuickAdd must be used inside QuickAddProvider");
  return ctx;
}

// Page-level buttons that open the same forms as the + sheet.
export function QuickAddButton({ kind, preset, className = "btn-primary", children }: {
  kind: Exclude<Kind, "menu">;
  preset?: Preset;
  className?: string;
  children: ReactNode;
}) {
  const { open } = useQuickAdd();
  return <button type="button" className={className} onClick={() => open(kind, preset)}>{children}</button>;
}


export function QuickAddProvider({ data, children }: { data: QuickAddData; children: ReactNode }) {
  const [kind, setKind] = useState<Kind | null>(null);
  const [preset, setPreset] = useState<Preset>({});
  const open = (k: Kind, p: Preset = {}) => {
    setPreset(p);
    setKind(k);
  };
  const close = () => setKind(null);

  const actions: QuickAction[] = [
    { kind: "payment", label: "Catat pembayaran", hint: data.unpaid.length ? `${data.unpaid.length} kamar belum bayar` : "Semua sewa sudah masuk", icon: IconBanknote, tone: "bg-mint" },
    { kind: "expense", label: "Catat pengeluaran", hint: data.period ? `Ke buku kas ${data.period.label}` : "Mulai buku kas dulu", icon: IconReceipt, tone: "bg-butter" },
    { kind: "tenant", label: "Tambah penghuni", hint: data.vacantRooms.length ? `${data.vacantRooms.length} kamar kosong` : "Semua kamar terisi", icon: IconUserPlus, tone: "bg-peri" },
    { kind: "reminder", label: "Tambah pengingat", hint: "Tagihan, perbaikan, admin", icon: IconAlarmClock, tone: "bg-blush" },
  ];

  const expensePeriodId = preset.periodId ?? data.period?.id;
  const expensePeriodLabel = preset.periodLabel ?? data.period?.label;

  return (
    <Ctx.Provider value={{ open, isOpen: kind !== null, actions }}>
      {children}

      <Sheet open={kind === "menu"} onClose={close} title="Tambah">
        <ul className="flex flex-col gap-2">
          {actions.map((a) => (
            <li key={a.kind}>
              <button type="button" onClick={() => open(a.kind)}
                className="card press flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left shadow-[3px_3px_0_var(--color-ink)] hover:bg-cream">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[4px] border-[1.5px] border-ink text-ink ${a.tone}`} aria-hidden>
                  <a.icon width={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{a.label}</span>
                  <span className="block truncate text-xs text-ink-soft">{a.hint}</span>
                </span>
                <IconChevronRight width={16} className="text-ink-soft" />
              </button>
            </li>
          ))}
        </ul>
      </Sheet>

      <FormSheet open={kind === "payment"} onClose={close} title="Catat pembayaran" submitLabel="Simpan pembayaran" canSubmit={data.unpaid.length > 0}
        action={async (fd) => {
          fd.set("status", "LUNAS");
          await updateRoomIncome(fd);
        }}>
        {data.unpaid.length === 0 ? (
          <p className="rounded-[4px] border-[1.5px] border-ink bg-mint px-4 py-5 text-center text-sm font-medium text-mint-deep">
            Tidak ada yang perlu dicatat: semua kamar sudah bayar untuk {data.period?.label ?? "bulan ini"}.
          </p>
        ) : (
          <PaymentFields unpaid={data.unpaid} />
        )}
      </FormSheet>

      <FormSheet open={kind === "tenant"} onClose={close} title="Tambah penghuni" submitLabel="Simpan penghuni" action={addTenant} canSubmit={data.vacantRooms.length > 0}>
        {data.vacantRooms.length === 0 ? (
          <p className="rounded-[4px] border-[1.5px] border-dashed border-ink/40 px-4 py-5 text-center text-sm text-ink-soft">
            Semua kamar sudah terisi. Keluarkan penghuni dulu dari halaman Kamar.
          </p>
        ) : (
          <>
            <div>
              <span className="label">Kamar</span>
              <SelectPill name="roomId" ariaLabel="Kamar" defaultValue={preset.roomId}
                options={data.vacantRooms.map((r) => ({ value: r.id, label: `Kamar ${r.number}` }))} />
            </div>
            <Field label="Nama" htmlFor="qa-tenant-name">
              <input id="qa-tenant-name" name="tenantName" required autoComplete="off" className="field" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="WhatsApp" htmlFor="qa-tenant-phone">
                <input id="qa-tenant-phone" name="phone" type="tel" inputMode="tel" placeholder="08xx…" className="field num" />
              </Field>
              <Field label="Tanggal tagih" htmlFor="qa-tenant-day">
                <input id="qa-tenant-day" name="reminderDay" type="number" min={1} max={31} inputMode="numeric" placeholder="1–31" className="field num" />
              </Field>
            </div>
            <Field label="Tanggal masuk" htmlFor="qa-tenant-movein">
              <input id="qa-tenant-movein" name="moveInDate" type="date" className="field num" />
            </Field>
          </>
        )}
      </FormSheet>

      <FormSheet open={kind === "expense"} onClose={close} title="Catat pengeluaran" submitLabel="Simpan pengeluaran" action={addExpense} canSubmit={Boolean(expensePeriodId)}>
        {!expensePeriodId ? (
          <p className="rounded-[4px] border-[1.5px] border-dashed border-ink/40 px-4 py-5 text-center text-sm text-ink-soft">
            Belum ada buku kas. Mulai buku kas bulan ini dari halaman Ringkasan.
          </p>
        ) : (
          <>
            <input type="hidden" name="periodId" value={expensePeriodId} />
            <p className="-mt-2 text-center text-xs text-ink-soft">Masuk ke buku kas {expensePeriodLabel}</p>
            <ExpenseCategoryField idPrefix="qa-exp" />
            <Field label="Keterangan" htmlFor="qa-exp-desc">
              <input id="qa-exp-desc" name="description" placeholder="mis. Perbaikan pipa, Kamar 4" className="field" />
            </Field>
            <Field label="Jumlah (Rp)" htmlFor="qa-exp-amount">
              <AmountInput id="qa-exp-amount" name="amount" required pattern="[0-9.,\s]*[1-9][0-9.,\s]*" title="Isi jumlah lebih dari 0" placeholder="350.000" className="field num" />
            </Field>
          </>
        )}
      </FormSheet>

      <FormSheet open={kind === "reminder"} onClose={close} title="Tambah pengingat" submitLabel="Simpan pengingat" action={addReminder}>
        <ReminderFields idPrefix="qa-rem" rooms={data.rooms} defaults={{ roomId: preset.roomId }} />
      </FormSheet>

    </Ctx.Provider>
  );
}

function PaymentFields({ unpaid }: { unpaid: QuickAddData["unpaid"] }) {
  const [incomeId, setIncomeId] = useState(unpaid[0].incomeId);
  const current = unpaid.find((u) => u.incomeId === incomeId) ?? unpaid[0];
  return (
    <>
      <div>
        <span className="label">Kamar</span>
        <SelectPill name="incomeId" ariaLabel="Kamar" onChange={setIncomeId}
          options={unpaid.map((u) => ({ value: u.incomeId, label: `Kamar ${u.roomNumber} · ${u.tenant ?? "Tanpa nama"}`, hint: rupiah(u.rent) }))} />
      </div>
      <Field label="Jumlah diterima (Rp)" htmlFor="qa-pay-amount">
        <AmountInput key={current.incomeId} id="qa-pay-amount" name="amount" required
          defaultValue={current.rent} className="field num" />
      </Field>
      <p className="-mt-2 text-xs text-ink-soft">Kamar ditandai lunas untuk bulan ini.</p>
    </>
  );
}

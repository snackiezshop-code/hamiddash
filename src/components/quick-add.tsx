"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { CaretRight, HandCoins, ListPlus, Receipt, UserPlus } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { addChecklistItem, addExpense, addTenant, updateRoomIncome } from "@/app/actions";
import { CATEGORY_LABEL, CATEGORY_OPTIONS, rupiah } from "@/lib/format";
import { DuePills, Field, FormSheet, SelectPill, Sheet } from "./kit-client";
import { AmountInput } from "./forms";

export type QuickAddData = {
  period: { id: string; label: string } | null;
  unpaid: { incomeId: string; roomNumber: number; tenant: string | null; rent: number }[];
  vacantRooms: { id: string; number: number }[];
  rooms: { id: string; number: number }[];
};

type Kind = "menu" | "payment" | "tenant" | "expense" | "task";
type Preset = { roomId?: string; periodId?: string; periodLabel?: string };

const Ctx = createContext<{ open: (kind: Kind, preset?: Preset) => void } | null>(null);

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

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const TASK_CATEGORY_OPTIONS = ["Cleaning", "Maintenance", "Admin", "Other"].map((v) => ({ value: v, label: v }));

export function QuickAddProvider({ data, children }: { data: QuickAddData; children: ReactNode }) {
  const [kind, setKind] = useState<Kind | null>(null);
  const [preset, setPreset] = useState<Preset>({});
  const open = (k: Kind, p: Preset = {}) => {
    setPreset(p);
    setKind(k);
  };
  const close = () => setKind(null);

  const actions: { kind: Exclude<Kind, "menu">; label: string; hint: string; icon: Icon; tone: string }[] = [
    { kind: "payment", label: "Record payment", hint: data.unpaid.length ? `${plural(data.unpaid.length, "room")} still unpaid` : "All rent is in", icon: HandCoins, tone: "bg-mint" },
    { kind: "tenant", label: "Add tenant", hint: data.vacantRooms.length ? `${plural(data.vacantRooms.length, "room")} without a tenant` : "Every room has a tenant", icon: UserPlus, tone: "bg-peri" },
    { kind: "expense", label: "Add expense", hint: data.period ? `To ${data.period.label}` : "Start a cash book first", icon: Receipt, tone: "bg-butter" },
    { kind: "task", label: "Add task", hint: "Cleaning, maintenance, admin", icon: ListPlus, tone: "bg-blush" },
  ];

  const expensePeriodId = preset.periodId ?? data.period?.id;
  const expensePeriodLabel = preset.periodLabel ?? data.period?.label;

  return (
    <Ctx.Provider value={{ open }}>
      {children}

      <Sheet open={kind === "menu"} onClose={close} title="Quick add">
        <ul className="flex flex-col gap-2">
          {actions.map((a) => (
            <li key={a.kind}>
              <button type="button" onClick={() => open(a.kind)}
                className="flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-3xl bg-white px-4 py-2.5 text-left hover:bg-cream-2">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink ${a.tone}`} aria-hidden>
                  <a.icon size={20} weight="duotone" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{a.label}</span>
                  <span className="block truncate text-xs text-ink-soft">{a.hint}</span>
                </span>
                <CaretRight size={18} weight="bold" className="text-ink-soft" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </Sheet>

      <FormSheet open={kind === "payment"} onClose={close} title="Record payment" submitLabel="Save payment" canSubmit={data.unpaid.length > 0}
        action={async (fd) => {
          fd.set("status", "LUNAS");
          await updateRoomIncome(fd);
        }}>
        {data.unpaid.length === 0 ? (
          <p className="rounded-2xl bg-mint px-4 py-5 text-center text-sm font-semibold text-mint-deep">
            Nothing to record: every room has paid for {data.period?.label ?? "this month"}.
          </p>
        ) : (
          <PaymentFields unpaid={data.unpaid} />
        )}
      </FormSheet>

      <FormSheet open={kind === "tenant"} onClose={close} title="Add tenant" submitLabel="Save tenant" action={addTenant} canSubmit={data.vacantRooms.length > 0}>
        {data.vacantRooms.length === 0 ? (
          <p className="rounded-2xl bg-cream-2 px-4 py-5 text-center text-sm text-ink-soft">
            Every room already has a tenant. Check a tenant out from the Rooms page first.
          </p>
        ) : (
          <>
            <div>
              <span className="label">Room</span>
              <SelectPill name="roomId" ariaLabel="Room" defaultValue={preset.roomId}
                options={data.vacantRooms.map((r) => ({ value: r.id, label: `Room ${r.number}` }))} />
            </div>
            <Field label="Name" htmlFor="qa-tenant-name">
              <input id="qa-tenant-name" name="tenantName" required autoComplete="off" className="field" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="WhatsApp" htmlFor="qa-tenant-phone">
                <input id="qa-tenant-phone" name="phone" type="tel" inputMode="tel" placeholder="08xx…" className="field num" />
              </Field>
              <Field label="Reminder day" htmlFor="qa-tenant-day">
                <input id="qa-tenant-day" name="reminderDay" type="number" min={1} max={31} inputMode="numeric" placeholder="1–31" className="field num" />
              </Field>
            </div>
            <Field label="Move-in date" htmlFor="qa-tenant-movein">
              <input id="qa-tenant-movein" name="moveInDate" type="date" className="field num" />
            </Field>
          </>
        )}
      </FormSheet>

      <FormSheet open={kind === "expense"} onClose={close} title="Add expense" submitLabel="Save expense" action={addExpense} canSubmit={Boolean(expensePeriodId)}>
        {!expensePeriodId ? (
          <p className="rounded-2xl bg-cream-2 px-4 py-5 text-center text-sm text-ink-soft">
            There&apos;s no cash book yet. Start this month&apos;s from the Overview page.
          </p>
        ) : (
          <>
            <input type="hidden" name="periodId" value={expensePeriodId} />
            <p className="-mt-2 text-center text-xs text-ink-soft">Goes into the {expensePeriodLabel} cash book</p>
            <div>
              <span className="label">Category</span>
              <SelectPill name="category" ariaLabel="Category" required requiredMessage="Choose a category"
                options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))} />
            </div>
            <Field label="Description" htmlFor="qa-exp-desc">
              <input id="qa-exp-desc" name="description" placeholder="e.g. Pipe repair, Room 4" className="field" />
            </Field>
            <Field label="Amount (Rp)" htmlFor="qa-exp-amount">
              <AmountInput id="qa-exp-amount" name="amount" required pattern="[0-9.,\s]*[1-9][0-9.,\s]*" title="Enter an amount above 0" placeholder="350.000" className="field num" />
            </Field>
          </>
        )}
      </FormSheet>

      <FormSheet open={kind === "task"} onClose={close} title="Add task" submitLabel="Save task" action={addChecklistItem}>
        <Field label="Task" htmlFor="qa-task-title">
          <input id="qa-task-title" name="title" required placeholder="e.g. Clean the water tank" className="field" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="label">Category</span>
            <SelectPill name="category" ariaLabel="Category" options={TASK_CATEGORY_OPTIONS} />
          </div>
          <div>
            <span className="label">Room</span>
            <SelectPill name="roomId" ariaLabel="Room" defaultValue={preset.roomId ?? ""}
              options={[{ value: "", label: "No room" }, ...data.rooms.map((r) => ({ value: r.id, label: `Room ${r.number}` }))]} />
          </div>
        </div>
        <DuePills name="dueDate" label="Due" />
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
        <span className="label">Room</span>
        <SelectPill name="incomeId" ariaLabel="Room" onChange={setIncomeId}
          options={unpaid.map((u) => ({ value: u.incomeId, label: `Room ${u.roomNumber} · ${u.tenant ?? "No tenant"}`, hint: rupiah(u.rent) }))} />
      </div>
      <Field label="Amount received (Rp)" htmlFor="qa-pay-amount">
        <AmountInput key={current.incomeId} id="qa-pay-amount" name="amount" required
          defaultValue={current.rent} className="field num" />
      </Field>
      <p className="-mt-2 text-xs text-ink-soft">The room is marked Paid for this month.</p>
    </>
  );
}

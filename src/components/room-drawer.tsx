"use client";

import Link from "next/link";
import { createContext, useContext, useState, type ComponentProps, type ReactNode } from "react";
import { DoorOpen, PencilSimple } from "@phosphor-icons/react";
import type { RoomStatus } from "@/generated/prisma/enums";
import { checkoutTenant } from "@/app/actions";
import { STATUS_LABEL, formatDate, periodLabel, rupiah } from "@/lib/format";
import { Avatar, Chevron, IconBadge, ListRow, PASTEL_BG, STATUS_PASTEL } from "./kit";
import { Sheet } from "./kit-client";
import { ConfirmButton } from "./forms";
import { useQuickAdd } from "./quick-add";
import { StatusPill, WaButton } from "./ui";

export type DrawerRoom = {
  id: string;
  number: number;
  status: RoomStatus;
  monthlyRent: number;
  tenant: {
    name: string;
    phone: string | null;
    reminderDay: number | null;
    moveInDate: Date | null;
    leaseEndDate: Date | null;
    notes: string | null;
  } | null;
  history: { id: string; year: number; month: number; status: RoomStatus; amount: number }[];
};

// Phones open a room as this drawer wherever it's tapped (Rooms list, Overview tiles, search);
// from md up the same taps go to the full /kamar/[number] page.
const DrawerCtx = createContext<((roomNumber: number) => boolean) | null>(null);

const isPhone = () => window.matchMedia("(width < 48rem)").matches;

export function RoomDrawerProvider({ rooms, children }: { rooms: DrawerRoom[]; children: ReactNode }) {
  const [openNumber, setOpenNumber] = useState<number | null>(null);
  const room = rooms.find((r) => r.number === openNumber) ?? null;
  // Returns false when the caller should fall back to navigating (desktop, or a room it doesn't know).
  const openRoom = (n: number) => {
    if (!isPhone() || !rooms.some((r) => r.number === n)) return false;
    setOpenNumber(n);
    return true;
  };
  return (
    <DrawerCtx.Provider value={openRoom}>
      {children}
      <RoomDrawer room={room} onClose={() => setOpenNumber(null)} />
    </DrawerCtx.Provider>
  );
}

export function useRoomDrawer() {
  return useContext(DrawerCtx) ?? (() => false);
}

// A link to /kamar/[number] that opens the drawer instead on phones.
export function RoomLink({ roomNumber, onClick, ...rest }: Omit<ComponentProps<typeof Link>, "href"> & { roomNumber: number }) {
  const openRoom = useRoomDrawer();
  return (
    <Link {...rest} href={`/kamar/${roomNumber}`} onClick={(e) => {
      onClick?.(e);
      if (!e.defaultPrevented && !e.metaKey && !e.ctrlKey && openRoom(roomNumber)) e.preventDefault();
    }} />
  );
}

export function RoomsMobileList({ rooms }: { rooms: DrawerRoom[] }) {
  return (
    <RoomDrawerProvider rooms={rooms}>
      <RoomsMobileRows rooms={rooms} />
    </RoomDrawerProvider>
  );
}

function RoomsMobileRows({ rooms }: { rooms: DrawerRoom[] }) {
  const openRoom = useRoomDrawer();
  return (
    <ul className="divide-y divide-line px-4 md:hidden">
      {rooms.map((r) => (
        <li key={r.id}>
          <button type="button" onClick={() => openRoom(r.number)} className="block w-full cursor-pointer text-left"
            aria-label={`Room ${r.number}${r.tenant ? `, ${r.tenant.name}` : ", no tenant"}, ${STATUS_LABEL[r.status]}. Open details`}>
            <ListRow
              leading={r.tenant ? <Avatar name={r.tenant.name} tone={STATUS_PASTEL[r.status]} /> : <IconBadge icon={DoorOpen} tone={STATUS_PASTEL[r.status]} />}
              title={`Room ${r.number} · ${r.tenant?.name ?? "No tenant"}`}
              subtitle={<><span className="num">{rupiah(r.monthlyRent)}</span> · {STATUS_LABEL[r.status]}</>}
              trailing={<Chevron />} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function DataPoint({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-ink-soft">{label}</dt>
      <dd className="truncate text-sm font-bold">{children}</dd>
    </div>
  );
}

function RoomDrawer({ room, onClose }: { room: DrawerRoom | null; onClose: () => void }) {
  const { open } = useQuickAdd();
  const t = room?.tenant;
  const tone = room ? STATUS_PASTEL[room.status] : "peri";

  const editLink = room && (
    <Link href={`/kamar/${room.number}`} aria-label={`Edit room ${room.number}`}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-cream hover:bg-ink/85">
      <PencilSimple size={18} weight="bold" aria-hidden />
    </Link>
  );

  return (
    <Sheet open={room !== null} onClose={onClose} title={room ? `Room ${room.number}` : ""} headerRight={editLink}>
      {room && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {t ? <Avatar name={t.name} tone={tone} size={72} /> : <IconBadge icon={DoorOpen} tone={tone} size={72} />}
              <span className={`absolute -right-1 -bottom-1 h-6 w-6 rounded-full border-4 border-cream ${PASTEL_BG[tone]}`} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="font-display text-2xl leading-tight font-extrabold tracking-tight break-words">{t?.name ?? "No tenant"}</p>
              {t?.phone && <p className="num text-sm text-ink-soft">{t.phone}</p>}
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-3">
            <DataPoint label="Rent / month"><span className="num">{rupiah(room.monthlyRent)}</span></DataPoint>
            <DataPoint label="Status">{STATUS_LABEL[room.status]}</DataPoint>
            {t ? (
              <DataPoint label="Due day"><span className="num">{t.reminderDay ? `Day ${t.reminderDay}` : "Not set"}</span></DataPoint>
            ) : (
              <DataPoint label="Room">{room.number}</DataPoint>
            )}
          </dl>

          {t ? (
            <>
              <dl className="flex items-center justify-between gap-3 rounded-full bg-white px-5 py-3 text-sm">
                <div className="min-w-0"><dt className="sr-only">Moved in</dt><dd className="truncate font-semibold">{t.moveInDate ? <>Since <span className="num">{formatDate(t.moveInDate)}</span></> : "Move-in not set"}</dd></div>
                <div className="min-w-0 text-right"><dt className="sr-only">Lease ends</dt><dd className="truncate font-semibold">{t.leaseEndDate ? <>Until <span className="num">{formatDate(t.leaseEndDate)}</span></> : "No end date"}</dd></div>
              </dl>

              <div className="flex flex-wrap gap-2">
                <WaButton phone={t.phone} label={`Chat ${t.name}`} />
              </div>

              {t.notes && <p className="rounded-3xl bg-white px-4 py-3 text-sm break-words whitespace-pre-line">{t.notes}</p>}
            </>
          ) : (
            <button type="button" className="btn-primary" onClick={() => { onClose(); open("tenant", { roomId: room.id }); }}>
              Add a tenant to room {room.number}
            </button>
          )}

          <section aria-labelledby="drawer-history" className="rounded-3xl bg-white px-4 py-3">
            <h3 id="drawer-history" className="mb-1 font-display text-base font-bold">Payment history</h3>
            {room.history.length === 0 ? (
              <p className="py-3 text-sm text-ink-soft">No payments recorded yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {room.history.map((h) => (
                  <li key={h.id} className="flex min-h-12 items-center justify-between gap-3">
                    <span className="text-sm font-semibold">{periodLabel(h.year, h.month)}</span>
                    <span className="flex items-center gap-2">
                      <span className="num text-sm">{rupiah(h.amount)}</span>
                      <StatusPill status={h.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {t && (
            <form action={checkoutTenant} className="flex items-center justify-between gap-3 rounded-3xl bg-cream-2 px-4 py-3">
              <input type="hidden" name="roomId" value={room.id} />
              <span className="text-sm">
                <span className="block font-semibold">Check out {t.name}</span>
                <span className="block text-xs text-ink-soft">Removes the tenant and marks the room Vacant.</span>
              </span>
              <ConfirmButton message={`Check out ${t.name} from room ${room.number}?`} aria-label={`Check out ${t.name}`}
                confirmText="Confirm check out" pendingText="Checking out…"
                className="btn-secondary btn-sm shrink-0">
                Check out
              </ConfirmButton>
            </form>
          )}
        </div>
      )}
    </Sheet>
  );
}

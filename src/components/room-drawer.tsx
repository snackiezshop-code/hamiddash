"use client";

import Link from "next/link";
import { createContext, useContext, useState, type ComponentProps, type ReactNode } from "react";
import type { RoomStatus } from "@/generated/prisma/enums";
import { checkoutTenant } from "@/app/actions";
import { STATUS_LABEL, formatDate, periodLabel, reminderText, rupiah } from "@/lib/format";
import { Avatar, Chevron, IconBadge, ListRow, STATUS_PASTEL } from "./kit";
import { Sheet } from "./kit-client";
import { ConfirmButton } from "./forms";
import { IconBed, IconEdit } from "./icons";
import { PaidButton } from "./paid-button";
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

// A room opens as this sheet wherever it's tapped (Rooms list, Overview tiles, search): quick
// actions here, editing on the full /kamar/[number] page.
const DrawerCtx = createContext<((roomNumber: number) => boolean) | null>(null);

export function RoomDrawerProvider({ rooms, children }: { rooms: DrawerRoom[]; children: ReactNode }) {
  const [openNumber, setOpenNumber] = useState<number | null>(null);
  const room = rooms.find((r) => r.number === openNumber) ?? null;
  // Returns false when the caller should fall back to navigating (a room it doesn't know).
  const openRoom = (n: number) => {
    if (!rooms.some((r) => r.number === n)) return false;
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

// A link to /kamar/[number] that opens the room sheet instead (cmd/ctrl-click still opens the page).
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
            aria-label={`Kamar ${r.number}${r.tenant ? `, ${r.tenant.name}` : ", tanpa penghuni"}, ${STATUS_LABEL[r.status]}. Buka detail`}>
            <ListRow
              leading={r.tenant ? <Avatar name={r.tenant.name} tone={STATUS_PASTEL[r.status]} /> : <IconBadge icon={IconBed} tone={STATUS_PASTEL[r.status]} />}
              title={`Kamar ${r.number} · ${r.tenant?.name ?? "Tanpa penghuni"}`}
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
      <dt className="eyebrow text-ink-soft">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium">{children}</dd>
    </div>
  );
}

function RoomDrawer({ room, onClose }: { room: DrawerRoom | null; onClose: () => void }) {
  const { open } = useQuickAdd();
  const t = room?.tenant;
  const tone = room ? STATUS_PASTEL[room.status] : "peri";
  // The newest cash-book row: the month whose rent the quick actions are about.
  const current = room?.history[0];
  const owes = current?.status === "TUNDA_BAYAR";

  const editLink = room && (
    <Link href={`/kamar/${room.number}`} aria-label={`Edit kamar ${room.number}`}
      className="press grid h-11 w-11 shrink-0 place-items-center rounded-[4px] border-[1.5px] border-ink bg-navy text-white shadow-[2px_2px_0_var(--color-ink)] hover:bg-navy-hover">
      <IconEdit width={20} />
    </Link>
  );

  return (
    <Sheet open={room !== null} onClose={onClose} title={room ? `Kamar ${room.number}` : ""} headerRight={editLink}>
      {room && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            {t ? <Avatar name={t.name} tone={tone} size={64} /> : <IconBadge icon={IconBed} tone={tone} size={64} />}
            <div className="min-w-0">
              <p className="h-display text-2xl leading-tight break-words">{t?.name ?? "Tanpa penghuni"}</p>
              {t?.phone && <p className="num text-sm text-ink-soft">{t.phone}</p>}
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-3 border-y-[1.5px] border-ink py-3">
            <DataPoint label="Sewa / bulan"><span className="num">{room.monthlyRent > 0 ? rupiah(room.monthlyRent) : "Tahunan"}</span></DataPoint>
            <DataPoint label="Status">{STATUS_LABEL[room.status]}</DataPoint>
            {t ? (
              <DataPoint label="Tanggal tagih"><span className="num">{t.reminderDay ? `Tgl ${t.reminderDay}` : "Belum diisi"}</span></DataPoint>
            ) : (
              <DataPoint label="Kamar">{room.number}</DataPoint>
            )}
          </dl>

          {owes && current && (
            <div className="card flex items-center gap-3 bg-blush">
              <div className="min-w-0 flex-1">
                <p className="eyebrow text-blush-deep">Belum bayar · {periodLabel(current.year, current.month)}</p>
                <p className="num mt-1 text-lg font-medium">{rupiah(room.monthlyRent)}</p>
              </div>
              {t && <WaButton iconOnly phone={t.phone} label={`Kirim pengingat WhatsApp ke ${t.name}`}
                text={reminderText({ name: t.name, roomNumber: room.number, amount: room.monthlyRent, year: current.year, month: current.month, dueDay: t.reminderDay })} />}
              <PaidButton incomeId={current.id} roomNumber={room.number} />
            </div>
          )}

          {t ? (
            <>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="min-w-0"><dt className="eyebrow text-ink-soft">Masuk</dt><dd className="num mt-1 truncate font-medium">{t.moveInDate ? formatDate(t.moveInDate) : "Belum diisi"}</dd></div>
                <div className="min-w-0"><dt className="eyebrow text-ink-soft">Kontrak sampai</dt><dd className="num mt-1 truncate font-medium">{t.leaseEndDate ? formatDate(t.leaseEndDate) : "Tanpa batas"}</dd></div>
              </dl>
              {!owes && <div className="flex flex-wrap gap-2"><WaButton phone={t.phone} label={`Chat ${t.name}`} /></div>}
              {t.notes && <p className="rounded-[4px] border-[1.5px] border-dashed border-ink/40 px-4 py-3 text-sm break-words whitespace-pre-line">{t.notes}</p>}
            </>
          ) : (
            <button type="button" className="btn-primary" onClick={() => { onClose(); open("tenant", { roomId: room.id }); }}>
              Tambah penghuni ke kamar {room.number}
            </button>
          )}

          <section aria-labelledby="drawer-history">
            <h3 id="drawer-history" className="eyebrow mb-1 text-ink-soft">Riwayat bayar</h3>
            {room.history.length === 0 ? (
              <p className="py-3 text-sm text-ink-soft">Belum ada pembayaran tercatat.</p>
            ) : (
              <ul className="divide-y divide-line border-t-[1.5px] border-ink">
                {room.history.map((h) => (
                  <li key={h.id} className="flex min-h-12 items-center justify-between gap-3">
                    <span className="text-sm">{periodLabel(h.year, h.month)}</span>
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
            <form action={checkoutTenant} className="flex items-center justify-between gap-3 border-t-[1.5px] border-ink pt-4">
              <input type="hidden" name="roomId" value={room.id} />
              <span className="text-sm">
                <span className="block font-medium">Keluarkan {t.name}</span>
                <span className="block text-xs text-ink-soft">Menghapus penghuni dan menandai kamar kosong.</span>
              </span>
              <ConfirmButton message={`Keluarkan ${t.name} dari kamar ${room.number}?`} aria-label={`Keluarkan ${t.name}`}
                confirmText="Ya, keluarkan" pendingText="Memproses…"
                className="btn-secondary btn-sm shrink-0">
                Keluarkan
              </ConfirmButton>
            </form>
          )}
        </div>
      )}
    </Sheet>
  );
}

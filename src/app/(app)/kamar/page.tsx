import { db } from "@/lib/db";
import { rupiah } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { RoomDrawerProvider, RoomRows } from "@/components/room-drawer";
import { RoomSearch } from "@/components/room-search";
import { drawerRoomInclude, toDrawerRoom } from "@/lib/rooms";
import { ensureCurrentPeriod } from "@/lib/cashbook";
import { openPromises } from "@/lib/promises";
import { annualStates } from "@/lib/annual";

export default async function RoomsPage() {
  await ensureCurrentPeriod();
  const [rooms, promises, annual] = await Promise.all([
    db.room.findMany({ orderBy: { number: "asc" }, include: drawerRoomInclude }),
    openPromises(),
    annualStates(),
  ]);
  const potential = rooms.reduce((s, r) => s + r.monthlyRent, 0);
  const drawerRooms = rooms.map((r) => toDrawerRoom(r, promises, annual));

  return (
    <RoomDrawerProvider rooms={drawerRooms}>
      <PageHeader eyebrow={<>{rooms.length} kamar · potensi <span className="num">{rupiah(potential)}</span> / bulan</>} title="Kamar" />
      <div className="mb-4">
        <RoomSearch rooms={drawerRooms.map((r) => ({ number: r.number, status: r.status, tenant: r.tenant?.name ?? null, phone: r.tenant?.phone ?? null }))} />
      </div>
      {rooms.length === 0
        ? <p className="card text-center text-sm text-ink-soft">Belum ada kamar.</p>
        : <RoomRows rooms={drawerRooms} />}
      <p className="mt-3 text-xs text-ink-soft">Ketuk kamar untuk aksi cepat, atau ikon pensil di dalamnya untuk mengedit.</p>
    </RoomDrawerProvider>
  );
}

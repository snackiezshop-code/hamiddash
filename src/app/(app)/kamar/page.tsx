import Link from "next/link";
import { db } from "@/lib/db";
import { STATUS_LABEL, STATUS_OPTIONS, formatDate, rupiah } from "@/lib/format";
import type { RoomStatus } from "@/generated/prisma/enums";
import { PageHeader, StatusPill, WaButton } from "@/components/ui";
import { IconChevronRight } from "@/components/icons";

export default async function RoomsPage({ searchParams }: PageProps<"/kamar">) {
  const { status } = await searchParams;
  const filter = STATUS_OPTIONS.includes(status as RoomStatus) ? (status as RoomStatus) : undefined;
  const [rooms, all] = await Promise.all([
    db.room.findMany({ where: filter ? { status: filter } : {}, orderBy: { number: "asc" }, include: { tenant: true } }),
    db.room.findMany({ select: { status: true, monthlyRent: true } }),
  ]);
  const potential = all.reduce((s, r) => s + r.monthlyRent, 0);

  return (
    <>
      <PageHeader title="Rooms & Tenants" subtitle={`${all.length} rooms · potential rent ${rupiah(potential)}/month`} />

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/kamar" className={`pill py-1.5 ${!filter ? "bg-ink text-cream" : "bg-white"}`}>All ({all.length})</Link>
        {STATUS_OPTIONS.map((s) => (
          <Link key={s} href={`/kamar?status=${s}`} className={`pill py-1.5 ${filter === s ? "bg-ink text-cream" : "bg-white"}`}>
            {STATUS_LABEL[s]} ({all.filter((r) => r.status === s).length})
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden bg-white p-0">
        <table className="hidden w-full text-sm md:table">
          <thead className="bg-cream-2/60 text-left text-xs tracking-wide text-ink-soft uppercase">
            <tr>
              <th className="px-5 py-3">Room</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Tenant</th>
              <th className="px-3 py-3">Reminder</th>
              <th className="px-3 py-3">Moved in</th>
              <th className="px-3 py-3">Lease ends</th>
              <th className="px-3 py-3 text-right">Rent/month</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rooms.map((r) => (
              <tr key={r.id} className="hover:bg-cream/60">
                <td className="px-5 py-3 font-display font-bold">Room {r.number}</td>
                <td className="px-3 py-3"><StatusPill status={r.status} /></td>
                <td className="px-3 py-3">
                  <div className="font-semibold">{r.tenant?.name ?? <span className="text-ink-soft">—</span>}</div>
                  {r.tenant?.phone && <div className="num text-xs text-ink-soft">{r.tenant.phone}</div>}
                </td>
                <td className="num px-3 py-3 text-xs">
                  {r.tenant?.reminderDay ? <span className="pill bg-cream">Day {r.tenant.reminderDay}</span> : "—"}
                </td>
                <td className="num px-3 py-3 text-xs">{formatDate(r.tenant?.moveInDate)}</td>
                <td className="num px-3 py-3 text-xs">{formatDate(r.tenant?.leaseEndDate)}</td>
                <td className="num px-3 py-3 text-right">{rupiah(r.monthlyRent)}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-1.5">
                    <WaButton phone={r.tenant?.phone} label="Chat" />
                    <Link href={`/kamar/${r.number}`} className="btn-secondary btn-sm">Edit</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <ul className="divide-y divide-line md:hidden">
          {rooms.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
              <Link href={`/kamar/${r.number}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold">Room {r.number}</span>
                  <StatusPill status={r.status} />
                </div>
                <div className="mt-0.5 truncate text-sm">{r.tenant?.name ?? "No tenant yet"}</div>
                <div className="num text-xs text-ink-soft">{rupiah(r.monthlyRent)}</div>
              </Link>
              <WaButton phone={r.tenant?.phone} label="Chat" />
              <Link href={`/kamar/${r.number}`} aria-label={`Edit room ${r.number}`}><IconChevronRight /></Link>
            </li>
          ))}
        </ul>
        {rooms.length === 0 && <p className="p-6 text-center text-sm text-ink-soft">No rooms with this status.</p>}
      </div>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { STATUS_LABEL, STATUS_OPTIONS, dateInputValue, periodLabel, periodSlug, rupiah } from "@/lib/format";
import { updateRoom } from "@/app/actions";
import { PageHeader, Section, StatusPill, WaButton } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { IconChevronLeft } from "@/components/icons";

export default async function RoomDetailPage({ params }: PageProps<"/kamar/[number]">) {
  const { number } = await params;
  const room = await db.room.findUnique({
    where: { number: Number(number) || 0 },
    include: {
      tenant: true,
      roomIncomes: {
        include: { period: true },
        orderBy: [{ period: { year: "desc" } }, { period: { month: "desc" } }],
        take: 12,
      },
    },
  });
  if (!room) notFound();
  const t = room.tenant;

  return (
    <>
      <Link href="/kamar" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
        <IconChevronLeft width={16} height={16} /> All rooms
      </Link>
      <PageHeader title={`Room ${room.number}`} subtitle={<StatusPill status={room.status} />}
        actions={<WaButton phone={t?.phone} label={`Chat ${t?.name ?? ""}`.trim()} />} />

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <form action={updateRoom} className="card flex flex-col gap-5 bg-white">
          <input type="hidden" name="roomId" value={room.id} />
          <div>
            <h2 className="h-display mb-3 text-lg">Room</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="status">Status</label>
                <select id="status" name="status" defaultValue={room.status} className="field">
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="monthlyRent">Monthly rent (Rp)</label>
                <input id="monthlyRent" name="monthlyRent" inputMode="numeric" defaultValue={room.monthlyRent} className="field num" required />
              </div>
            </div>
            <p className="mt-2 text-xs text-ink-soft">Changing the status also updates this room&apos;s row in the latest month&apos;s cash book.</p>
          </div>

          <div>
            <h2 className="h-display mb-3 text-lg">Tenant</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="tenantName">Name</label>
                <input id="tenantName" name="tenantName" defaultValue={t?.name ?? ""} className="field" placeholder="Leave empty if the room has no tenant" />
              </div>
              <div>
                <label className="label" htmlFor="phone">WhatsApp number</label>
                <input id="phone" name="phone" type="tel" defaultValue={t?.phone ?? ""} className="field num" placeholder="08xx…" />
              </div>
              <div>
                <label className="label" htmlFor="reminderDay">Reminder day of month</label>
                <input id="reminderDay" name="reminderDay" type="number" min={1} max={31} inputMode="numeric"
                  defaultValue={t?.reminderDay ?? ""} className="field num" placeholder="e.g. 15" />
              </div>
              <div>
                <label className="label" htmlFor="moveInDate">Move-in date</label>
                <input id="moveInDate" name="moveInDate" type="date" defaultValue={dateInputValue(t?.moveInDate)} className="field num" />
              </div>
              <div>
                <label className="label" htmlFor="leaseEndDate">Lease end date</label>
                <input id="leaseEndDate" name="leaseEndDate" type="date" defaultValue={dateInputValue(t?.leaseEndDate)} className="field num" />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="notes">Notes</label>
                <textarea id="notes" name="notes" rows={3} defaultValue={t?.notes ?? ""} className="field rounded-2xl" />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <SubmitButton pendingText="Saving…">Save</SubmitButton>
            <Link href="/kamar" className="btn-secondary">Cancel</Link>
          </div>
        </form>

        <Section title="Payment history">
          {room.roomIncomes.length === 0 ? (
            <p className="text-sm text-ink-soft">No records yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {room.roomIncomes.map((inc) => (
                <li key={inc.id} className="flex items-center justify-between gap-2 py-2.5">
                  <Link href={`/kas/${periodSlug(inc.period.year, inc.period.month)}`} className="text-sm font-semibold hover:underline">
                    {periodLabel(inc.period.year, inc.period.month)}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="num text-sm">{inc.amount ? rupiah(inc.amount) : "—"}</span>
                    <StatusPill status={inc.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}

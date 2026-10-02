import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { STATUS_LABEL, STATUS_OPTIONS, dateInputValue, periodLabel, periodSlug, properName, rupiah } from "@/lib/format";
import { updateRoom } from "@/app/actions";
import { PageHeader, Section, StatusPill, WaButton } from "@/components/ui";
import { AmountInput, SubmitButton } from "@/components/forms";
import { SelectPill } from "@/components/kit-client";
import { IconChevronLeft } from "@/components/icons";
import { ensureCurrentPeriod } from "@/lib/cashbook";

export default async function RoomDetailPage({ params }: PageProps<"/kamar/[number]">) {
  await ensureCurrentPeriod();
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
      <Link href="/kamar" className="eyebrow mb-2 inline-flex min-h-11 items-center gap-1 text-ink-soft hover:text-ink">
        <IconChevronLeft width={14} height={14} /> Semua kamar
      </Link>
      <PageHeader eyebrow={t ? properName(t.name) : "Tanpa penghuni"} title={`Kamar ${room.number}`} subtitle={<StatusPill status={room.status} />}
        actions={<WaButton phone={t?.phone} label={t ? `Chat ${properName(t.name)}` : "Chat"} />} />

      <div className="flex flex-col gap-4">
        <form action={updateRoom} className="card flex flex-col gap-6">
          <input type="hidden" name="roomId" value={room.id} />
          <div>
            <h2 className="eyebrow mb-3 border-b-[1.5px] border-ink pb-2">Kamar</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className="label">Status</span>
                <SelectPill name="status" ariaLabel="Status" defaultValue={room.status}
                  options={STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
              </div>
              <div>
                <label className="label" htmlFor="monthlyRent">Sewa per bulan (Rp)</label>
                <AmountInput id="monthlyRent" name="monthlyRent" defaultValue={room.monthlyRent} className="field num" required />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="annualRent">Sewa per tahun (Rp) · untuk status Tahunan</label>
                <AmountInput id="annualRent" name="annualRent" defaultValue={room.annualRent} className="field num" placeholder="3.500.000" />
              </div>
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              Mengubah status juga mengubah baris kamar ini di buku kas bulan terakhir. Kamar tahunan: isi sewa per tahun dan
              &quot;Kontrak sampai&quot; (akhir masa sewa yang sudah dibayar); pengingat perpanjangan muncul 7 hari sebelumnya.
            </p>
          </div>

          <div>
            <h2 className="eyebrow mb-3 border-b-[1.5px] border-ink pb-2">Penghuni</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="tenantName">Nama</label>
                <input id="tenantName" name="tenantName" defaultValue={t?.name ?? ""} className="field" placeholder="Kosongkan kalau kamar tanpa penghuni" />
              </div>
              <div>
                <label className="label" htmlFor="phone">Nomor WhatsApp</label>
                <input id="phone" name="phone" type="tel" defaultValue={t?.phone ?? ""} className="field num" placeholder="08xx…" />
              </div>
              <div>
                <label className="label" htmlFor="reminderDay">Tanggal tagih tiap bulan</label>
                <input id="reminderDay" name="reminderDay" type="number" min={1} max={31} inputMode="numeric"
                  defaultValue={t?.reminderDay ?? ""} className="field num" placeholder="15" />
              </div>
              <div>
                <label className="label" htmlFor="moveInDate">Tanggal masuk</label>
                <input id="moveInDate" name="moveInDate" type="date" defaultValue={dateInputValue(t?.moveInDate)} className="field num" />
              </div>
              <div>
                <label className="label" htmlFor="leaseEndDate">Kontrak sampai</label>
                <input id="leaseEndDate" name="leaseEndDate" type="date" defaultValue={dateInputValue(t?.leaseEndDate)} className="field num" />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="notes">Catatan</label>
                <textarea id="notes" name="notes" rows={3} defaultValue={t?.notes ?? ""} className="field" />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <SubmitButton className="btn-primary flex-1" pendingText="Menyimpan…">Simpan</SubmitButton>
            <Link href="/kamar" className="btn-secondary">Batal</Link>
          </div>
        </form>

        <Section title="Riwayat bayar · 12 bulan">
          {room.roomIncomes.length === 0 ? (
            <p className="text-sm text-ink-soft">Belum ada catatan.</p>
          ) : (
            <ul className="divide-y divide-line">
              {room.roomIncomes.map((inc) => (
                <li key={inc.id} className="flex min-h-12 items-center justify-between gap-2">
                  <Link href={`/kas/${periodSlug(inc.period.year, inc.period.month)}`} className="text-sm underline-offset-4 hover:underline">
                    {periodLabel(inc.period.year, inc.period.month)}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="num text-sm">{rupiah(inc.amount)}</span>
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

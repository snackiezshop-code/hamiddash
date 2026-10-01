import { db } from "@/lib/db";
import { dueReminders, type DueReminder } from "@/lib/reminders";
import { daysUntil, dueLabel } from "@/lib/reminder-items";
import { formatDate, periodLabel, properName, rupiah, todayJakarta } from "@/lib/format";
import { PromiseButton } from "@/components/promise";
import { Empty, PageHeader, Section } from "@/components/ui";
import { SegmentedLinks } from "@/components/kit-client";
import { PushToggle } from "@/components/push-toggle";
import { QuickAddButton } from "@/components/quick-add";
import { ReminderList, type ReminderItem } from "@/components/reminder-list";
import { IconPlus, IconWhatsApp } from "@/components/icons";
import { ensureCurrentPeriod } from "@/lib/cashbook";

// Rent to chase (computed from tenants) and your own reminders (bills, repairs, admin).
// The daily push alert lands here.
export default async function RemindersPage({ searchParams }: PageProps<"/pengingat">) {
  await ensureCurrentPeriod();
  const { status } = await searchParams;
  const showDone = status === "done";
  const today = todayJakarta();

  const [rent, rows, rooms, doneCount] = await Promise.all([
    dueReminders(today),
    db.reminder.findMany({
      where: { isDone: showDone },
      orderBy: showDone ? [{ doneAt: "desc" }] : [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      take: showDone ? 50 : undefined,
    }),
    db.room.findMany({ orderBy: { number: "asc" }, select: { id: true, number: true } }),
    db.reminder.count({ where: { isDone: true } }),
  ]);
  const roomNo = new Map(rooms.map((r) => [r.id, r.number]));
  const items: ReminderItem[] = rows.map((r) => ({
    id: r.id, title: r.title, tag: r.tag, roomId: r.roomId, roomNumber: r.roomId ? roomNo.get(r.roomId) ?? null : null,
    dueDate: r.dueDate, daysUntilDue: daysUntil(r.dueDate, today), repeat: r.repeat, remindBefore: r.remindBefore,
    amount: r.amount, category: r.category, isDone: r.isDone, doneAt: r.doneAt,
  }));
  const dueSoon = items.filter((r) => r.daysUntilDue !== null && r.daysUntilDue <= 1).length;

  return (
    <>
      <PageHeader eyebrow="Sewa untuk ditagih dan hal lain yang perlu diingat" title="Pengingat"
        actions={<QuickAddButton kind="reminder" className="btn-primary btn-sm"><IconPlus width={16} /> Tambah</QuickAddButton>} />

      <div className="flex flex-col gap-4">
        <Section title={`Tagih sewa${rent.length ? ` · ${rent.length}` : ""}`}>
          {rent.length === 0 ? (
            <Empty>Tidak ada sewa untuk ditagih. Penghuni yang belum bayar muncul di sini mulai 3 hari sebelum jatuh tempo.</Empty>
          ) : (
            <RentList items={rent} />
          )}
        </Section>

        <Section title={`Pengingatmu${!showDone && dueSoon > 0 ? ` · ${dueSoon} segera` : ""}`}>
          <div className="mb-3">
            <SegmentedLinks label="Status pengingat" items={[
              { href: "/pengingat", label: "Perlu dikerjakan", active: !showDone },
              { href: "/pengingat?status=done", label: `Selesai${doneCount ? ` · ${doneCount}` : ""}`, active: showDone },
            ]} />
          </div>
          {items.length === 0 ? (
            <Empty>{showDone ? "Belum ada yang dicentang selesai." : "Tidak ada pengingat sekarang. Tambah lewat tombol di atas, misalnya tagihan yang berulang tiap bulan."}</Empty>
          ) : (
            <ReminderList items={items} rooms={rooms} />
          )}
        </Section>

        <Section title="Peringatan harian">
          <PushToggle publicKey={process.env.VAPID_PUBLIC_KEY ?? null} />
        </Section>
      </div>
    </>
  );
}

function RentList({ items }: { items: DueReminder[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((r) => {
        const late = r.daysUntilDue < 0;
        return (
          <li key={`${r.roomNumber}-${r.year}-${r.month}`} className="py-2">
            <div className="flex min-h-14 items-center gap-3">
              <span aria-hidden className={`num grid h-11 w-11 shrink-0 place-items-center rounded-[4px] border-[1.5px] border-ink text-base font-medium ${late ? "bg-orange text-white" : r.daysUntilDue === 0 ? "bg-butter" : "bg-card"}`}>
                {r.roomNumber}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">Kamar {r.roomNumber} · {properName(r.tenantName)}</div>
                <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-ink-soft">
                  <span className="num">{rupiah(r.amount)} · {periodLabel(r.year, r.month)}</span>
                  <span className={`font-semibold ${late ? "text-orange-text" : "text-ink"}`}>{dueLabel(r.daysUntilDue)}</span>
                  {r.lapsedPromise && <span className="font-semibold text-orange-text">· janji lewat {formatDate(r.lapsedPromise.date)}</span>}
                </div>
              </div>
              {r.waHref ? (
                <a href={r.waHref} target="_blank" rel="noopener noreferrer" className="btn btn-sm shrink-0 bg-orange text-white">
                  <IconWhatsApp width={16} /> Kirim
                </a>
              ) : (
                <span className="text-xs text-ink-soft">Belum ada nomor WA</span>
              )}
            </div>
            <div className="flex justify-end pl-14">
              <PromiseButton target={{ roomId: r.roomId, roomNumber: r.roomNumber, tenantName: properName(r.tenantName), phone: r.phone,
                year: r.year, month: r.month, current: r.lapsedPromise }} label={r.lapsedPromise ? "Janji baru" : "Janji bayar"} />
            </div>
            <details className="pl-14">
              <summary className="eyebrow inline-flex min-h-11 cursor-pointer items-center text-ink-soft hover:text-ink">Lihat pesan</summary>
              <p className="rounded-[4px] border-[1.5px] border-dashed border-ink/40 px-4 py-3 text-sm whitespace-pre-line">{r.text}</p>
            </details>
          </li>
        );
      })}
    </ul>
  );
}

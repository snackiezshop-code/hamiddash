import "server-only";
import { db } from "./db";
import { getLatestPeriod } from "./cashbook";
import { formatDate, periodLabel, periodSlug, properName, reminderText, rupiah, todayJakarta, waLink } from "./format";
import { isDue, transferDue } from "./transfers";
import { dueItems, dueReminders } from "./reminders";
import { openPromises } from "./promises";
import { dueLabel as reminderDueLabel } from "./reminder-items";
import type { Notification } from "@/components/notification-bell";

// Everything the bell lists, in order of urgency: a month to start, your own reminders due, rent
// that is late or due today, unpaid rooms, leases ending, and transfers not yet sent.
export async function getNotifications(now: Date = todayJakarta()): Promise<Notification[]> {
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const [latest, endingLeases, rent, items, promises] = await Promise.all([
    getLatestPeriod(),
    db.room.findMany({
      where: { tenant: { leaseEndDate: { not: null, lte: soon } } },
      include: { tenant: true },
      orderBy: { tenant: { leaseEndDate: "asc" } },
    }),
    dueReminders(now),
    dueItems(now),
    openPromises(now),
  ]);

  const curYear = now.getUTCFullYear();
  const curMonth = now.getUTCMonth() + 1;
  const needsNewPeriod = !latest || latest.year * 12 + latest.month < curYear * 12 + curMonth;
  const label = latest ? periodLabel(latest.year, latest.month) : "";
  const slug = latest ? periodSlug(latest.year, latest.month) : periodSlug(curYear, curMonth);

  const overdueCount = rent.filter((r) => r.kind === "monthly" && r.daysUntilDue < 0).length;
  // Rooms with a promise still ahead aren't chased; the promise itself alerts on its date.
  const promiseById = new Map([...promises.values()].map((p) => [p.id, p]));
  const promisedAhead = (roomId: string) => { const p = promises.get(roomId); return Boolean(p && p.date >= now); };
  const unpaid = latest?.roomIncomes.filter((r) => r.status === "TUNDA_BAYAR" && !promisedAhead(r.roomId)) ?? [];
  const dueToday = unpaid.filter((r) => r.room.tenant?.reminderDay === now.getUTCDate());
  const dueTodayIds = new Set(dueToday.map((d) => d.id));
  const transfers = (latest?.transferChecks ?? [])
    .filter((t) => (t.recipient.isActive || t.isSent) && isDue(transferDue(t.recipientId, latest!.year, latest!.month)));
  const unsent = transfers.filter((t) => !t.isSent).length;

  return [
    ...(needsNewPeriod ? [{
      id: "new-period", tone: "butter" as const,
      title: `Mulai buku kas ${periodLabel(curYear, curMonth)}`,
      detail: "Buku kas bulan ini belum dibuat",
      href: "/",
    }] : []),
    // A payment promise opens the WhatsApp reminder about it; other reminders open Pengingat.
    ...items.map((i) => {
      const wa = promiseById.get(i.id)?.waHref;
      return {
        id: `reminder-${i.id}`, tone: (i.daysUntilDue < 0 ? "blush" : "butter") as Notification["tone"],
        title: i.amount ? `${i.title} · ${rupiah(i.amount)}` : i.title,
        detail: `${reminderDueLabel(i.daysUntilDue)} (${formatDate(i.dueDate)}) · ${wa ? "ketuk untuk mengirim pengingat WhatsApp" : `ketuk untuk menandai ${i.amount ? "dibayar" : "selesai"}`}`,
        href: wa ?? "/pengingat",
        external: Boolean(wa),
      };
    }),
    ...(overdueCount ? [{
      id: "overdue", tone: "blush" as const,
      title: `${overdueCount} penghuni lewat jatuh tempo`,
      detail: "Buka Pengingat untuk mengirim WhatsApp yang telat",
      href: "/pengingat",
    }] : []),
    // Opens the pre-filled WhatsApp reminder itself; without a usable number it falls back to the room.
    ...dueToday.map((inc) => {
      const wa = waLink(inc.room.tenant?.phone, reminderText({ name: inc.room.tenant?.name ?? "", roomNumber: inc.room.number, amount: inc.room.monthlyRent, paid: inc.amount, year: latest!.year, month: latest!.month, dueDay: inc.room.tenant?.reminderDay ?? null }, now));
      return {
        id: `due-${inc.id}`, tone: "butter" as const,
        title: `Kirim pengingat · Kamar ${inc.room.number}`,
        detail: `${inc.room.tenant ? properName(inc.room.tenant.name) : "Penghuni"} · ${wa ? "buka WhatsApp" : "nomor WhatsApp belum disimpan"}`,
        href: wa ?? `/kamar/${inc.room.number}`,
        external: Boolean(wa),
        roomNumber: wa ? undefined : inc.room.number,
      };
    }),
    // Yearly rent from 7 days before it's due (the renewal, or the rest of a part-paid term).
    ...rent.filter((r) => r.kind === "annual").map((r) => ({
      id: `annual-${r.roomId}`, tone: (r.daysUntilDue < 0 ? "blush" : "butter") as Notification["tone"],
      title: `Sewa tahunan · Kamar ${r.roomNumber} · ${reminderDueLabel(r.daysUntilDue).toLowerCase()}`,
      detail: `${properName(r.tenantName)} · ${r.annual?.partial ? "sisa " : ""}${rupiah(r.amount)} · ${r.annual?.termLabel ?? ""}`,
      href: r.waHref ?? `/kamar/${r.roomNumber}`,
      external: Boolean(r.waHref),
    })),
    ...unpaid.filter((inc) => !dueTodayIds.has(inc.id)).map((inc) => ({
      id: `unpaid-${inc.id}`, tone: "blush" as const,
      title: `Kamar ${inc.room.number} ${inc.amount > 0 ? "belum lunas" : "belum bayar"}`,
      detail: `${inc.room.tenant ? properName(inc.room.tenant.name) : "Tanpa nama"} · ${inc.amount > 0 ? "sisa " : ""}${rupiah(Math.max(0, inc.room.monthlyRent - inc.amount))} untuk ${label}`,
      href: `/kas/${slug}`,
    })),
    ...endingLeases.map((r) => ({
      id: `lease-${r.id}`, tone: (r.tenant!.leaseEndDate! < now ? "blush" : "butter") as Notification["tone"],
      title: `Kontrak ${r.tenant!.leaseEndDate! < now ? "sudah berakhir" : "segera berakhir"} · Kamar ${r.number}`,
      detail: `${properName(r.tenant!.name)} · ${formatDate(r.tenant!.leaseEndDate)}`,
      href: `/kamar/${r.number}`,
    })),
    ...(unsent ? [{
      id: "transfers", tone: "peri" as const,
      title: `${unsent} transfer belum dikirim`,
      detail: `Daftar transfer ${label}`,
      href: `/kas/${slug}?tab=transfers`,
    }] : []),
  ];
}

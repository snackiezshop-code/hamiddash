import { dueItems, dueReminders } from "@/lib/reminders";
import { dueLabel } from "@/lib/reminder-items";
import { properName, rupiah } from "@/lib/format";
import { sendPushToAll } from "@/lib/push";
import { ensureCurrentPeriod } from "@/lib/cashbook";

// Vercel Cron (vercel.json) calls this daily at 09:00 WIB with `Authorization: Bearer $CRON_SECRET`.
// Nothing goes to tenants: it pushes one alert to the admin's devices listing whose rent is due and which of your own reminders (bills, repairs) are due.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response(null, { status: 401 });
  }
  // On the 1st this opens the new month's cash book, so rent shows as unpaid even if nobody opened the app.
  await ensureCurrentPeriod();

  // Upcoming reminders alert at 3 days and on the day; overdue ones the day after, then every 3 days.
  // Your own reminders alert the day before and on the day, then the same overdue rhythm.
  const [reminders, items] = await Promise.all([dueReminders(), dueItems()]);
  const due = reminders.filter((d) => d.alertToday);
  const own = items.filter((i) => i.alertToday);
  if (due.length === 0 && own.length === 0) return Response.json({ due: 0, own: 0 });

  const rooms = (list: typeof due) => list.map((d) => `Kamar ${d.roomNumber} (${properName(d.tenantName)})`).join(", ");
  const late = due.filter((d) => d.daysUntilDue < 0);
  const today = due.filter((d) => d.daysUntilDue === 0);
  const soon = due.filter((d) => d.daysUntilDue > 0);
  const body = [
    late.length ? `Telat: ${rooms(late)}` : null,
    today.length ? `Jatuh tempo hari ini: ${rooms(today)}` : null,
    soon.length ? `Jatuh tempo 3 hari lagi: ${rooms(soon)}` : null,
    ...own.map((i) => `${i.title}${i.amount ? ` ${rupiah(i.amount)}` : ""}: ${dueLabel(i.daysUntilDue).toLowerCase()}`),
  ].filter(Boolean).join("\n");

  const title = [
    due.length ? `${due.length} pengingat sewa perlu dikirim` : null,
    own.length ? (own.length === 1 ? own[0].title : `${own.length} pengingat jatuh tempo`) : null,
  ].filter(Boolean).join(" · ");
  const result = await sendPushToAll({
    title,
    body: `${body}\nKetuk untuk membuka ${due.length ? "pesan WhatsApp" : "pengingat"}.`,
    url: "/pengingat",
  });
  return Response.json({ due: due.length, own: own.length, ...result });
}

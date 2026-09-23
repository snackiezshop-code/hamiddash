import { dueReminders } from "@/lib/reminders";
import { sendPushToAll } from "@/lib/push";

// Vercel Cron (vercel.json) calls this daily at 09:00 WIB with `Authorization: Bearer $CRON_SECRET`.
// Nothing goes to tenants: it pushes one alert to the admin's devices listing whose rent is due.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response(null, { status: 401 });
  }

  // Upcoming reminders alert at 3 days and on the day; overdue ones the day after, then every 3 days.
  const due = (await dueReminders()).filter((d) => d.alertToday);
  if (due.length === 0) return Response.json({ due: 0 });

  const rooms = (list: typeof due) => list.map((d) => `Room ${d.roomNumber} (${d.tenantName})`).join(", ");
  const late = due.filter((d) => d.daysUntilDue < 0);
  const today = due.filter((d) => d.daysUntilDue === 0);
  const soon = due.filter((d) => d.daysUntilDue > 0);
  const body = [
    late.length ? `Overdue: ${rooms(late)}` : null,
    today.length ? `Due today: ${rooms(today)}` : null,
    soon.length ? `Due in 3 days: ${rooms(soon)}` : null,
  ].filter(Boolean).join("\n");

  const result = await sendPushToAll({
    title: `${due.length} rent reminder${due.length > 1 ? "s" : ""} to send`,
    body: `${body}\nTap to open the WhatsApp messages.`,
    url: "/pengingat",
  });
  return Response.json({ due: due.length, ...result });
}

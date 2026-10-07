import "server-only";
import { db } from "./db";
import { PROMISE_TAG } from "./reminder-items";
import { promiseReminderText, todayJakarta, waLink } from "./format";
import { annualStates } from "./annual";

export type OpenPromise = {
  id: string;
  roomId: string;
  date: Date;
  // The rent the promise is for: the newest unpaid month (or the yearly term), and the WhatsApp
  // reminder about it that the admin can send while it's open.
  year: number;
  month: number;
  annual: boolean;
  text: string | null; // null when the room has no tenant
  waHref: string | null;
};

// Open payment promises keyed by room id (at most one per room: saving a new one moves the date).
export async function openPromises(today: Date = todayJakarta()): Promise<Map<string, OpenPromise>> {
  const rows = await db.reminder.findMany({
    where: { tag: PROMISE_TAG, isDone: false, roomId: { not: null }, dueDate: { not: null } },
    select: { id: true, roomId: true, dueDate: true },
  });
  if (rows.length === 0) return new Map();
  const roomIds = rows.map((r) => r.roomId!);
  const [rooms, annual] = await Promise.all([
    db.room.findMany({
      where: { id: { in: roomIds } },
      include: {
        tenant: true,
        roomIncomes: {
          where: { status: "TUNDA_BAYAR" }, select: { amount: true, period: { select: { year: true, month: true } } },
          orderBy: [{ period: { year: "desc" } }, { period: { month: "desc" } }], take: 1,
        },
      },
    }),
    annualStates(today),
  ]);

  return new Map(rows.map((r) => {
    const room = rooms.find((x) => x.id === r.roomId);
    const a = annual.get(r.roomId!);
    const owed = room?.roomIncomes[0]?.period;
    const paid = a ? a.paid : room?.roomIncomes[0]?.amount ?? 0;
    const year = a ? a.payTermStart.getUTCFullYear() : owed?.year ?? today.getUTCFullYear();
    const month = a ? a.payTermStart.getUTCMonth() + 1 : owed?.month ?? today.getUTCMonth() + 1;
    const text = room?.tenant ? promiseReminderText({
      name: room.tenant.name, roomNumber: room.number, year, month, date: r.dueDate!,
      amount: a ? a.rent : room.monthlyRent, paid, annualTerm: a?.termLabel,
    }, today) : null;
    return [r.roomId!, {
      id: r.id, roomId: r.roomId!, date: r.dueDate!, year, month, annual: Boolean(a),
      text, waHref: text ? waLink(room!.tenant!.phone, text) : null,
    }];
  }));
}

import "server-only";
import { db } from "./db";
import { PROMISE_TAG } from "./reminder-items";

export type OpenPromise = { id: string; roomId: string; date: Date };

// Open payment promises keyed by room id (at most one per room: saving a new one moves the date).
export async function openPromises(): Promise<Map<string, OpenPromise>> {
  const rows = await db.reminder.findMany({
    where: { tag: PROMISE_TAG, isDone: false, roomId: { not: null }, dueDate: { not: null } },
    select: { id: true, roomId: true, dueDate: true },
  });
  return new Map(rows.map((r) => [r.roomId!, { id: r.id, roomId: r.roomId!, date: r.dueDate! }]));
}

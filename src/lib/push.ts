import "server-only";
import webpush from "web-push";
import { db } from "./db";

export type PushPayload = { title: string; body: string; url: string };

export function pushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

// Sends to every saved device; subscriptions the push service reports as gone (404/410) are dropped.
export async function sendPushToAll(payload: PushPayload) {
  if (!pushConfigured()) throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set");
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@hamidkost.local",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

  const subs = await db.pushSubscription.findMany();
  let sent = 0;
  const errors: string[] = [];
  await Promise.all(subs.map(async (s) => {
    try {
      // urgency high + a TTL: Apple holds low-urgency pushes until the phone wakes on its own.
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload),
        { TTL: 24 * 60 * 60, urgency: "high" });
      sent++;
    } catch (err) {
      const e = err as { statusCode?: number; body?: string };
      errors.push(`${new URL(s.endpoint).host} ${e.statusCode ?? "?"}${e.body ? ` ${e.body.slice(0, 80)}` : ""}`);
      if (e.statusCode === 404 || e.statusCode === 410) await db.pushSubscription.delete({ where: { id: s.id } });
      else console.error("[hamid] push failed", e.statusCode, err);
    }
  }));
  return { devices: subs.length, sent, errors };
}

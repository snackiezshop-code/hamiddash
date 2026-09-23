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
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload));
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await db.pushSubscription.delete({ where: { id: s.id } });
      else console.error("[hamid] push failed", status, err);
    }
  }));
  return { devices: subs.length, sent };
}

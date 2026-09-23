"use client";

import { useEffect, useState } from "react";
import { sendTestPush, subscribePush, unsubscribePush } from "@/app/actions";
import { IconBell } from "./icons";

type State = "loading" | "unsupported" | "needs-install" | "denied" | "off" | "on";

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

// Per-device switch for the daily reminder push. iPhones only allow web push once the
// dashboard has been added to the home screen and opened from there.
export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState(ios && !standalone ? "needs-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") { setState("denied"); return; }
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      setState((await reg.pushManager.getSubscription()) ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    if (!publicKey) return;
    setBusy(true);
    setNote(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
      await subscribePush(JSON.parse(JSON.stringify(sub)));
      setState("on");
      await sendTestPush();
      setNote("Sent a test alert to this device.");
    } catch {
      setState(Notification.permission === "denied" ? "denied" : "off");
      setNote("Couldn't turn alerts on. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setNote(null);
    try {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      if (sub) {
        await unsubscribePush(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  const message: Record<State, string> = {
    loading: "Checking this device…",
    unsupported: "This browser can't receive push alerts.",
    "needs-install": "On iPhone: tap Share → Add to Home Screen, open Hamid from the home screen, then come back here.",
    denied: "Notifications are blocked for this site. Allow them in the browser or iPhone settings, then reload.",
    off: "Get an alert at 09:00 when rent is due in 3 days, due today, or still unpaid after the due date.",
    on: "Alerts are on for this device. You'll get one at 09:00 on days a reminder is due.",
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${state === "on" ? "bg-mint text-mint-deep" : "bg-cream text-ink"}`}>
        <IconBell width={20} height={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm">{message[state]}</p>
        {!publicKey && state === "off" && (
          <p className="mt-1 text-xs text-blush-deep">Push isn&apos;t configured on the server yet (VAPID keys missing).</p>
        )}
        {note && <p className="mt-1 text-xs text-ink-soft" aria-live="polite">{note}</p>}
      </div>
      {state === "off" && (
        <button type="button" onClick={enable} disabled={busy || !publicKey} className="btn-primary btn-sm disabled:opacity-50">
          {busy ? "Turning on…" : "Turn on alerts"}
        </button>
      )}
      {state === "on" && (
        <button type="button" onClick={disable} disabled={busy} className="btn-secondary btn-sm disabled:opacity-50">
          {busy ? "Turning off…" : "Turn off"}
        </button>
      )}
    </div>
  );
}

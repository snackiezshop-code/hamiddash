"use client";

import { useEffect, useState } from "react";
import { sendTestPush, subscribePush, unsubscribePush } from "@/app/actions";
import { IconBell } from "./icons";

// Only called after mount (states other than "loading" are set client-side), so no hydration mismatch.
const isIosDevice = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

type State = "loading" | "unsupported" | "embedded" | "needs-install" | "denied" | "off" | "on";

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

  // Resolves this device's alert state; applied in a callback so it never sets state mid-render.
  async function detect(): Promise<State> {
    const isIos = isIosDevice();
    // In-app browsers (the Claude desktop app, Electron shells) always report notifications as blocked.
    if (/\b(Claude|Electron)\//.test(navigator.userAgent)) return "embedded";
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return isIos && !standalone ? "needs-install" : "unsupported";
    if (Notification.permission === "denied") return "denied";
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
    return (await reg.pushManager.getSubscription()) ? "on" : "off";
  }

  function check() {
    detect().then(setState, () => setState("unsupported"));
  }

  useEffect(() => {
    detect().then(setState, () => setState("unsupported"));
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
    unsupported: "This browser can't receive push alerts. Open Hamid on your phone to turn them on.",
    embedded: "This built-in browser can't show notifications. Open Hamid on your phone to turn alerts on.",
    "needs-install": "On iPhone: tap Share → Add to Home Screen, open Hamid from the home screen, then come back here.",
    denied: state === "denied" && isIosDevice()
      ? "Notifications are turned off for Hamid. On your iPhone go to Settings → Notifications → Hamid, turn on Allow Notifications, then tap Check again."
      : "Notifications are blocked for this site. Tap the icon left of the address bar → Notifications → Allow, then tap Check again.",
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
      {state === "denied" && (
        <button type="button" onClick={check} className="btn-secondary btn-sm">
          Check again
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

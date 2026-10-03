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
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return "off";
    // The phone still has its subscription: save it again in case the server lost it (a deleted
    // row, a restored database), otherwise the switch says "on" while nothing can be sent.
    void subscribePush(JSON.parse(JSON.stringify(sub))).catch(() => {});
    return "on";
  }

  function check() {
    detect().then(setState, () => setState("unsupported"));
  }

  useEffect(() => {
    detect().then(setState, () => setState("unsupported"));
  }, []);

  async function enable() {
    if (!publicKey) return;
    // Ask first, straight from the tap: iPhone only shows the permission prompt while the tap is
    // still "fresh", and drops it if other awaits run before it.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState(permission === "denied" ? "denied" : "off");
      setNote(permission === "denied" ? null : "Izin notifikasi belum diberikan. Ketuk lagi lalu pilih Izinkan.");
      return;
    }
    setBusy(true);
    setNote(null);
    let step = "mendaftarkan perangkat";
    try {
      const reg = (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }));
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription())
        ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
      step = "menyimpan ke server";
      await subscribePush(JSON.parse(JSON.stringify(sub)));
      setState("on");
      step = "mengirim uji coba";
      const res = await sendTestPush();
      setNote(res.sent > 0
        ? "Peringatan uji coba sudah dikirim. Kalau tidak muncul dalam 1 menit, kunci HP sebentar lalu cek layar kunci."
        : `Perangkat tersimpan, tapi uji coba gagal terkirim${res.errors.length ? ` (${res.errors.join(", ")})` : ""}.`);
    } catch (err) {
      setState(Notification.permission === "denied" ? "denied" : "off");
      const why = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      setNote(`Gagal saat ${step}. ${why}`);
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
    loading: "Memeriksa perangkat ini…",
    unsupported: "Browser ini tidak bisa menerima peringatan. Buka HamidKost di HP untuk menyalakannya.",
    embedded: "Browser bawaan ini tidak bisa menampilkan notifikasi. Buka HamidKost di HP untuk menyalakan peringatan.",
    "needs-install": "Di iPhone: ketuk Bagikan → Tambah ke Layar Utama, buka HamidKost dari layar utama, lalu kembali ke sini.",
    denied: state === "denied" && isIosDevice()
      ? "Notifikasi HamidKost dimatikan. Di iPhone buka Pengaturan → Notifikasi → HamidKost, nyalakan Izinkan Notifikasi, lalu ketuk Cek lagi."
      : "Notifikasi diblokir untuk situs ini. Ketuk ikon di kiri bilah alamat → Notifikasi → Izinkan, lalu ketuk Cek lagi.",
    off: "Dapatkan peringatan jam 09.00 saat sewa jatuh tempo 3 hari lagi, hari ini, atau masih belum dibayar setelah jatuh tempo.",
    on: "Peringatan menyala di perangkat ini. Kamu akan menerimanya jam 09.00 pada hari ada pengingat yang jatuh tempo.",
  };

  return (
    <div className="flex flex-wrap items-start gap-3">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[4px] border-[1.5px] border-ink ${state === "on" ? "bg-navy text-white" : "bg-card text-ink"}`}>
        <IconBell width={20} height={20} />
      </span>
      <div className="min-w-0 flex-1 basis-[calc(100%-3.25rem)]">
        <p className="text-sm">{message[state]}</p>
        {!publicKey && state === "off" && (
          <p className="mt-1 text-xs text-blush-deep">Peringatan push belum disiapkan di server (kunci VAPID belum ada).</p>
        )}
        {note && <p className="mt-1 text-xs text-ink-soft" aria-live="polite">{note}</p>}
      </div>
      {state === "off" && (
        <button type="button" onClick={enable} disabled={busy || !publicKey} className="btn-primary btn-sm ml-[52px] disabled:opacity-50">
          {busy ? "Menyalakan…" : "Nyalakan peringatan"}
        </button>
      )}
      {state === "denied" && (
        <button type="button" onClick={check} className="btn-secondary btn-sm ml-[52px]">
          Cek lagi
        </button>
      )}
      {state === "on" && (
        <button type="button" onClick={disable} disabled={busy} className="btn-secondary btn-sm ml-[52px] disabled:opacity-50">
          {busy ? "Mematikan…" : "Matikan"}
        </button>
      )}
    </div>
  );
}

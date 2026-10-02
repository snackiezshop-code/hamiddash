"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const SEEN = "hk-session";
const AWAY_MS = 30 * 60 * 1000;

// Opening HamidKost should land on Ringkasan. iPhone home-screen apps resume (or relaunch) on the
// last page, and a shortcut saved from another page always opens that page, so: on a fresh start
// (first load of this browser session) or after 30 minutes away, go to "/". A page opened from a
// push notification (?notif=1, added by sw.js) is left where it is.
export function HomeOnOpen() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fromNotification = new URLSearchParams(window.location.search).has("notif");
    let fresh = false;
    try {
      fresh = !sessionStorage.getItem(SEEN);
      sessionStorage.setItem(SEEN, "1");
    } catch { /* storage blocked: treat as not fresh */ }
    if (fresh && pathname !== "/" && !fromNotification) router.replace("/");
    // Run once per mount; later navigation inside the app must not bounce back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return; }
      if (hiddenAt && Date.now() - hiddenAt > AWAY_MS && window.location.pathname !== "/") router.replace("/");
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [router]);

  return null;
}

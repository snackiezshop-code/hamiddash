"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconBell } from "./icons";

export type Notification = {
  id: string;
  tone: "blush" | "butter" | "peri";
  title: string;
  detail: string;
  href: string;
};

const DOT: Record<Notification["tone"], string> = {
  blush: "bg-blush-deep",
  butter: "bg-butter-deep",
  peri: "bg-peri-deep",
};

export function NotificationBell({ notifications }: { notifications: Notification[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = notifications.length;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={count ? `Notifications (${count})` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border border-line bg-white transition-colors hover:bg-cream-2"
      >
        <IconBell width={20} height={20} />
        {count > 0 && (
          <span className="num absolute -top-1.5 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-blush-deep px-1 text-[10px] font-semibold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-line bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <span className="h-display text-base">Notifications</span>
            {count > 0 && <span className="pill bg-cream">{count}</span>}
          </div>
          {count === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-soft">You&apos;re all caught up.</p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id}>
                  <Link href={n.href} onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-5 py-3 hover:bg-cream/60">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[n.tone]}`} aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{n.title}</span>
                      <span className="block text-xs text-ink-soft">{n.detail}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

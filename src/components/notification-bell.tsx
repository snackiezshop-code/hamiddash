"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconBell } from "./icons";
import { RoomLink } from "./room-drawer";

export type Notification = {
  id: string;
  tone: "blush" | "butter" | "peri";
  title: string;
  detail: string;
  href: string;
  external?: boolean; // e.g. a wa.me link: opens in a new tab
  roomNumber?: number; // opens the room drawer on phones instead of navigating
};

const DOT: Record<Notification["tone"], string> = {
  blush: "bg-orange",
  butter: "bg-butter-deep",
  peri: "bg-navy",
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
    // The panel anchors to the header row (positioned), so it stays on screen on phones.
    <div ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={count ? `Notifikasi (${count})` : "Notifikasi"}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="press relative grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-[4px] border-[1.5px] border-ink bg-card shadow-[2px_2px_0_var(--color-ink)] hover:bg-cream"
      >
        <IconBell width={20} height={20} />
        {count > 0 && (
          <span className="num absolute -top-2 -right-2 grid h-[18px] min-w-[18px] place-items-center rounded-[3px] border border-ink bg-orange px-1 text-[10px] font-semibold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Notifikasi"
          className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-[4px] border-[1.5px] border-ink bg-card shadow-[5px_5px_0_var(--color-ink)]">
          <div className="flex items-center justify-between border-b-[1.5px] border-ink px-4 py-3">
            <span className="eyebrow">Notifikasi</span>
            {count > 0 && <span className="eyebrow num text-ink-soft">{String(count).padStart(2, "0")}</span>}
          </div>
          {count === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-soft">Tidak ada yang perlu diurus.</p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id}>
                  <NotificationLink n={n} onClick={() => setOpen(false)}>
                    <span className={`mt-1.5 h-2 w-2 shrink-0 ${DOT[n.tone]}`} aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{n.title}</span>
                      <span className="block text-xs text-ink-soft">{n.detail}</span>
                    </span>
                  </NotificationLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationLink({ n, onClick, children }: { n: Notification; onClick: () => void; children: React.ReactNode }) {
  const className = "flex items-start gap-3 px-4 py-3 hover:bg-cream";
  if (n.external) {
    return <a href={n.href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={className}>{children}</a>;
  }
  if (n.roomNumber !== undefined) {
    return <RoomLink roomNumber={n.roomNumber} onClick={onClick} className={className}>{children}</RoomLink>;
  }
  return <Link href={n.href} onClick={onClick} className={className}>{children}</Link>;
}

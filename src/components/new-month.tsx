"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { RobotSvg } from "./robot";

export const NEW_MONTH_COOKIE = "hk-month-seen";

// Shown in the first week of a month until dismissed. Dismissal is a cookie (not localStorage) so
// the server leaves the card out on the next load instead of flashing it in and out.
export function NewMonthCard({ periodKey, title, href, children }: {
  periodKey: string;
  title: string;
  href: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  const dismiss = () => {
    document.cookie = `${NEW_MONTH_COOKIE}=${periodKey}; path=/; max-age=${60 * 60 * 24 * 40}; samesite=lax`;
    setOpen(false);
  };

  return (
    <section aria-labelledby="new-month-title" className="card mb-4 flex flex-col gap-4 bg-butter text-butter-deep sm:flex-row sm:items-center">
      <RobotSvg className="robot-hello h-14 w-14 shrink-0" />
      <div className="min-w-0 flex-1">
        <h2 id="new-month-title" className="h-display text-xl text-ink">{title}</h2>
        <div className="mt-1 text-sm">{children}</div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link href={href} className="btn-secondary btn-sm">Open cash book</Link>
        <button type="button" onClick={dismiss} className="btn-primary btn-sm cursor-pointer">Got it</button>
      </div>
    </section>
  );
}

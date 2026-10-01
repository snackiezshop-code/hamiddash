"use client";

import Link from "next/link";
import { useState } from "react";
import { rupiah } from "@/lib/format";
import { dueLabel } from "@/lib/reminder-items";
import { IconChevronRight, IconWhatsApp } from "./icons";
import { PaidButton } from "./paid-button";

export type CollectItem = {
  roomNumber: number;
  tenant: string;
  amount: number;
  periodLabel: string;
  daysUntilDue: number; // 0 today, negative once late
  waHref: string | null;
  incomeId: string | null; // set when the row is in the current cash book, so it can be marked paid here
};

// Rent to collect now (due today or late), one tenant at a time: send the WhatsApp reminder or
// mark it paid, then step to the next with Berikutnya.
export function CollectCard({ items }: { items: CollectItem[] }) {
  const [i, setI] = useState(0);
  const item = items.length ? items[i % items.length] : null;
  return (
    <section className="card" aria-labelledby="collect-title">
      <div className="flex items-center justify-between">
        <h2 id="collect-title" className="eyebrow flex items-center gap-1.5 text-ink-soft">
          <span aria-hidden className="h-1.5 w-1.5 bg-orange" />Tagih sekarang
        </h2>
        {items.length > 1 && <span className="eyebrow num text-ink-soft">{(i % items.length) + 1} / {items.length}</span>}
      </div>
      {!item ? (
        <p className="mt-3 text-lg font-medium">Tidak ada sewa yang jatuh tempo atau telat hari ini.</p>
      ) : (
        <div aria-live="polite">
          <p className="mt-2 text-2xl leading-tight font-medium tracking-[-0.01em] break-words">{item.tenant}</p>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            <Link href={`/kamar/${item.roomNumber}`} className="pill text-ink">Kamar {item.roomNumber}</Link>
            <span className="num"><b className="font-semibold text-ink">{rupiah(item.amount)}</b> · {item.periodLabel}</span>
            <span className={`font-medium ${item.daysUntilDue < 0 ? "text-orange-text" : "text-ink"}`}>{dueLabel(item.daysUntilDue)}</span>
          </p>
          <div className="mt-4 h-[5px] bg-navy" aria-hidden />
          <div className="mt-4 flex items-center gap-3">
            {item.waHref ? (
              <a href={item.waHref} target="_blank" rel="noopener noreferrer" className="group flex min-w-0 flex-1 items-center gap-3">
                <span className="press grid h-12 w-12 shrink-0 place-items-center rounded-[4px] border-[1.5px] border-ink bg-orange text-white shadow-[3px_3px_0_var(--color-ink)] group-active:translate-x-[3px] group-active:translate-y-[3px] group-active:shadow-none">
                  <IconWhatsApp width={22} />
                </span>
                <span className="min-w-0">
                  <span className="eyebrow block text-ink-soft">Pengingat sewa</span>
                  <span className="block truncate font-medium">Kirim WhatsApp</span>
                </span>
              </a>
            ) : <span className="min-w-0 flex-1 text-sm text-ink-soft">Nomor WhatsApp belum disimpan.</span>}
            {item.incomeId && <PaidButton incomeId={item.incomeId} roomNumber={item.roomNumber} />}
            {items.length > 1 && (
              <button type="button" onClick={() => setI((n) => n + 1)} aria-label="Penghuni berikutnya"
                className="press grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-[4px] border-[1.5px] border-ink bg-card shadow-[2px_2px_0_var(--color-ink)] hover:bg-cream">
                <IconChevronRight width={20} />
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

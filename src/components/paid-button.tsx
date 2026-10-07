"use client";

import { useTransition } from "react";
import { markRoomPaid, updateRoomIncome } from "@/app/actions";
import { IconCheck } from "./icons";
import { toast } from "./toast";

// Marks a room's rent paid for the month, then offers a WhatsApp thank-you to the tenant and
// Batalkan, which puts it back to unpaid.
export function PaidButton({ incomeId, roomNumber, className = "" }: { incomeId: string; roomNumber: number; className?: string }) {
  const [pending, start] = useTransition();
  const pay = () => start(async () => {
    const fd = new FormData();
    fd.set("incomeId", incomeId);
    const { thanksHref } = await markRoomPaid(fd);
    toast(`Kamar ${roomNumber} lunas`, [
      ...(thanksHref ? [{ label: "Terima kasih", href: thanksHref }] : []),
      {
        label: "Batalkan",
        onClick: () => {
          const undo = new FormData();
          undo.set("incomeId", incomeId);
          undo.set("status", "TUNDA_BAYAR");
          void updateRoomIncome(undo);
        },
      },
    ]);
  });
  return (
    <button type="button" onClick={pay} disabled={pending} aria-label={`Tandai kamar ${roomNumber} lunas`} title="Tandai lunas"
      className={`press grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-[4px] border-[1.5px] border-ink bg-navy text-white shadow-[2px_2px_0_var(--color-ink)] hover:bg-navy-hover disabled:opacity-60 ${className}`}>
      {pending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden /> : <IconCheck width={20} strokeWidth={2.4} />}
    </button>
  );
}

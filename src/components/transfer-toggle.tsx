"use client";

import type { ReactNode } from "react";
import { toggleTransfer } from "@/app/actions";
import { rupiah } from "@/lib/format";
import { SubmitButton } from "./forms";
import { SwitchSubmit } from "./kit-client";
import { toast } from "./toast";

// Ticking a transfer records its expense on the server; the toast confirms the amount and offers
// Batalkan (unticking removes the expense again).
export function TransferToggle({ id, sent, amount, name, variant, className = "", children }: {
  id: string;
  sent: boolean;
  amount: number | null;
  name: string;
  variant: "switch" | "pill";
  className?: string;
  children?: ReactNode;
}) {
  const run = async (fd: FormData) => {
    const sending = !sent;
    await toggleTransfer(fd);
    if (sending) {
      toast(amount ? `Transfer ${rupiah(amount)} ke ${name} dicatat sebagai pengeluaran` : `Transfer ke ${name} ditandai terkirim. Isi nominalnya di Pengaturan supaya tercatat sebagai pengeluaran.`, {
        label: "Batalkan",
        onClick: () => {
          const undo = new FormData();
          undo.set("id", id);
          void toggleTransfer(undo);
        },
      });
    } else if (amount) {
      toast(`Transfer ${rupiah(amount)} ke ${name} dihapus dari pengeluaran`);
    }
  };

  return (
    <form action={run} className="relative">
      <input type="hidden" name="id" value={id} />
      {variant === "switch"
        ? <SwitchSubmit checked={sent} label={`Transfer ke ${name} terkirim`} />
        : <SubmitButton className={className} aria-pressed={sent}>{children}</SubmitButton>}
    </form>
  );
}

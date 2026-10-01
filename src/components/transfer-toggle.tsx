"use client";

import { useState, type ReactNode } from "react";
import { toggleTransfer } from "@/app/actions";
import { rupiah } from "@/lib/format";
import { CoinBurst } from "./delight";
import { SubmitButton } from "./forms";
import { SwitchSubmit } from "./kit-client";
import { toast } from "./toast";

// Ticking a transfer records its expense on the server; here it pops coins and confirms the amount,
// with Undo in the toast (unticking removes the expense again).
export function TransferToggle({ id, sent, amount, name, variant, className = "", children }: {
  id: string;
  sent: boolean;
  amount: number | null;
  name: string;
  variant: "switch" | "pill";
  className?: string;
  children?: ReactNode;
}) {
  const [burst, setBurst] = useState(0);

  const run = async (fd: FormData) => {
    const sending = !sent;
    if (sending && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) setBurst((b) => b + 1);
    await toggleTransfer(fd);
    if (sending) {
      toast(amount ? `${rupiah(amount)} to ${name} added to expenses` : `Transfer to ${name} marked sent. Set its amount in Settings to record the expense.`, {
        label: "Undo",
        onClick: () => {
          const undo = new FormData();
          undo.set("id", id);
          void toggleTransfer(undo);
        },
      });
    } else if (amount) {
      toast(`${rupiah(amount)} to ${name} removed from expenses`);
    }
  };

  return (
    <form action={run} className="relative">
      <input type="hidden" name="id" value={id} />
      {variant === "switch"
        ? <SwitchSubmit checked={sent} label={`Transfer to ${name} sent`} />
        : <SubmitButton className={className} aria-pressed={sent}>{children}</SubmitButton>}
      {burst > 0 && <span key={burst} className="pointer-events-none absolute inset-0"><CoinBurst /></span>}
    </form>
  );
}

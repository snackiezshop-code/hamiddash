"use client";

import { useState } from "react";
import { IconCheck, IconCopy } from "./icons";

// Simple brand-colour marks; swap in official logo files if provided.
const BANK_MARKS: Record<string, { bg: string; fg: string; accent?: string }> = {
  BSI: { bg: "#00A39D", fg: "#FFFFFF", accent: "#F8AD3C" },
  BNI: { bg: "#F15A23", fg: "#FFFFFF", accent: "#005E6A" },
};

export function BankBadge({ bank }: { bank: string }) {
  const mark = BANK_MARKS[bank.toUpperCase()];
  if (!mark) return <span className="pill bg-white text-ink-soft">{bank}</span>;
  return (
    <span
      className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-[11px] font-extrabold tracking-wide"
      style={{ background: mark.bg, color: mark.fg }}
      aria-label={`Bank ${bank}`}
    >
      {mark.accent && <span className="h-2 w-2 rounded-full" style={{ background: mark.accent }} aria-hidden />}
      {bank.toUpperCase()}
    </span>
  );
}

export function BankAccount({ bank, account, holder }: { bank: string | null; account: string | null; holder?: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!account) return bank ? <BankBadge bank={bank} /> : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(account);
    } catch {
      const el = document.createElement("textarea");
      el.value = account;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <span className="flex items-center gap-2">
      {bank && <BankBadge bank={bank} />}
      <span className="flex flex-col leading-tight">
        <span className="num text-sm">{account}</span>
        {holder && <span className="text-xs opacity-70">{holder}</span>}
      </span>
      <button type="button" onClick={copy} aria-label={copied ? "Copied" : `Copy account number ${account}`}
        title={copied ? "Copied" : "Copy account number"}
        className={`grid h-8 w-8 cursor-pointer place-items-center rounded-full transition-colors ${
          copied ? "bg-mint text-mint-deep" : "text-ink-soft hover:bg-white hover:text-ink"
        }`}>
        {copied ? <IconCheck width={16} height={16} strokeWidth={3} /> : <IconCopy width={16} height={16} />}
      </button>
    </span>
  );
}

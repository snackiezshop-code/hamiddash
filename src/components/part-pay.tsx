"use client";

import { useState } from "react";
import { recordRentPayment, undoRentPayment } from "@/app/actions";
import { rupiah } from "@/lib/format";
import { errorDetails, reportClientIssue } from "@/lib/client-log";
import { Sheet } from "./kit-client";
import { AmountInput, SubmitButton } from "./forms";
import { IconBanknote } from "./icons";
import { toast } from "./toast";

export type PartPayTarget = {
  incomeId: string;
  roomNumber: number;
  tenantName: string;
  periodLabel: string;
  rent: number;
  paid: number; // already received toward this month
};

// Records part of a month's rent ("bayar sebagian"): the room stays Belum bayar and reminders ask for
// the rest; reaching the full rent marks it Lunas. The toast offers a WhatsApp thank-you and Batalkan.
export function PartPayButton({ target, className = "btn-secondary btn-sm", label = "Bayar sebagian" }: { target: PartPayTarget; className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = target;
  const rest = Math.max(0, t.rent - t.paid);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={className}
        aria-label={`Catat bayar sebagian kamar ${t.roomNumber}`}>
        <IconBanknote width={16} /> {label}
      </button>
      <Sheet open={open} onClose={() => { setOpen(false); setError(null); }} title="Bayar sebagian">
        <form className="flex flex-col gap-4"
          action={async (fd) => {
            setError(null);
            try {
              const res = await recordRentPayment(fd);
              if (typeof res === "string") { setError(res); return; }
              setOpen(false);
              const amount = Number(String(fd.get("amount")).replace(/\D/g, ""));
              toast(res.remaining > 0 ? `${rupiah(amount)} diterima · sisa ${rupiah(res.remaining)}` : `Kamar ${t.roomNumber} lunas`, [
                ...(res.thanksHref ? [{ label: "Terima kasih", href: res.thanksHref }] : []),
                {
                  label: "Batalkan",
                  onClick: () => { const u = new FormData(); u.set("incomeId", t.incomeId); u.set("amount", String(res.prevAmount)); void undoRentPayment(u); },
                },
              ]);
            } catch (err) {
              reportClientIssue("form-save-failed", { form: "Part payment", ...errorDetails(err) });
              setError("Gagal menyimpan. Periksa koneksi, lalu coba lagi.");
            }
          }}>
          <input type="hidden" name="incomeId" value={t.incomeId} />
          <dl className="divide-y divide-line border-y-[1.5px] border-ink text-sm">
            {[
              ["Penghuni", `${t.tenantName} · Kamar ${t.roomNumber}`],
              ["Periode", t.periodLabel],
              ["Sewa", rupiah(t.rent)],
              ...(t.paid > 0 ? [["Sudah dibayar", rupiah(t.paid)]] : []),
              ["Sisa", rupiah(rest)],
            ].map(([k, v]) => (
              <div key={k} className="flex min-h-10 items-center justify-between gap-3">
                <dt className="text-ink-soft">{k}</dt><dd className="num text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <div>
            <label className="label" htmlFor={`part-${t.incomeId}`}>Jumlah diterima sekarang (Rp)</label>
            <AmountInput id={`part-${t.incomeId}`} name="amount" required
              pattern="[0-9.,\s]*[1-9][0-9.,\s]*" title="Isi jumlah lebih dari 0" className="field num" />
          </div>
          <p className="-mt-2 text-xs text-ink-soft">Kamar tetap belum lunas dan pengingat menagih sisanya. Kalau jumlahnya menutup sisa, kamar jadi lunas.</p>
          {error && <p role="alert" className="rounded-[4px] border-[1.5px] border-blush-deep bg-blush px-4 py-3 text-sm font-semibold text-blush-deep">{error}</p>}
          <SubmitButton className="btn-primary w-full" pendingText="Menyimpan…">Simpan pembayaran</SubmitButton>
        </form>
      </Sheet>
    </>
  );
}

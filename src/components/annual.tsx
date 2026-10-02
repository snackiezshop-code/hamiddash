"use client";

import { useState } from "react";
import { recordAnnualPayment, undoAnnualPayment } from "@/app/actions";
import { rupiah } from "@/lib/format";
import { errorDetails, reportClientIssue } from "@/lib/client-log";
import { Sheet } from "./kit-client";
import { AmountInput, SubmitButton } from "./forms";
import { IconBanknote } from "./icons";
import { toast } from "./toast";

export type AnnualTarget = {
  roomId: string;
  roomNumber: number;
  tenantName: string;
  rent: number;
  remaining: number;
  paid: number;
  partial: boolean;
  termLabel: string;
};

// Records a yearly-rent payment (a full year or one instalment) into this month's cash book. The
// toast offers Batalkan, which removes the row and, for a first instalment, moves the term back.
export function AnnualPayButton({ target, className = "btn-primary btn-sm", label = "Catat bayar tahunan" }: { target: AnnualTarget; className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = target;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={className}
        aria-label={`Catat bayar sewa tahunan kamar ${t.roomNumber}`}>
        <IconBanknote width={16} /> {label}
      </button>
      <Sheet open={open} onClose={() => { setOpen(false); setError(null); }} title="Bayar sewa tahunan">
        <form className="flex flex-col gap-4"
          action={async (fd) => {
            setError(null);
            try {
              const res = await recordAnnualPayment(fd);
              if (typeof res === "string") { setError(res); return; }
              setOpen(false);
              const amount = Number(fd.get("amount"));
              toast(`${rupiah(amount)} sewa tahunan Kamar ${t.roomNumber} dicatat`, {
                label: "Batalkan",
                onClick: () => { const u = new FormData(); u.set("id", res.id); void undoAnnualPayment(u); },
              });
            } catch (err) {
              reportClientIssue("form-save-failed", { form: "Annual payment", ...errorDetails(err) });
              setError("Gagal menyimpan. Periksa koneksi, lalu coba lagi.");
            }
          }}>
          <input type="hidden" name="roomId" value={t.roomId} />
          <dl className="divide-y divide-line border-y-[1.5px] border-ink text-sm">
            {[
              ["Penghuni", `${t.tenantName} · Kamar ${t.roomNumber}`],
              [t.partial ? "Periode" : "Perpanjangan", t.termLabel],
              ["Sewa setahun", rupiah(t.rent)],
              ...(t.partial ? [["Sudah dibayar", rupiah(t.paid)], ["Sisa", rupiah(t.remaining)]] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex min-h-10 items-center justify-between gap-3">
                <dt className="text-ink-soft">{k}</dt><dd className="num text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <div>
            <label className="label" htmlFor={`annual-${t.roomId}`}>Jumlah diterima (Rp)</label>
            <AmountInput id={`annual-${t.roomId}`} name="amount" required defaultValue={t.remaining}
              pattern="[0-9.,\s]*[1-9][0-9.,\s]*" title="Isi jumlah lebih dari 0" className="field num" />
          </div>
          <p className="-mt-2 text-xs text-ink-soft">
            {t.partial
              ? "Masuk ke Pemasukan lain bulan ini dan mengurangi sisanya."
              : "Masuk ke Pemasukan lain bulan ini. Kontrak otomatis diperpanjang 12 bulan; kalau dibayar sebagian, sisanya tetap ditagih."}
          </p>
          {error && <p role="alert" className="rounded-[4px] border-[1.5px] border-blush-deep bg-blush px-4 py-3 text-sm font-semibold text-blush-deep">{error}</p>}
          <SubmitButton className="btn-primary w-full" pendingText="Menyimpan…">Simpan pembayaran</SubmitButton>
        </form>
      </Sheet>
    </>
  );
}

"use client";

import { useState } from "react";
import { deletePaymentPromise, savePaymentPromise } from "@/app/actions";
import { MONTHS_SHORT, longDateId, promiseText, waLink } from "@/lib/format";
import { errorDetails, reportClientIssue } from "@/lib/client-log";
import { Sheet } from "./kit-client";
import { ConfirmButton, SubmitButton } from "./forms";
import { IconCalendar, IconWhatsApp } from "./icons";

export type PromiseTarget = {
  roomId: string;
  roomNumber: number;
  tenantName: string; // already in proper case
  phone: string | null;
  year: number; // the month whose rent is promised
  month: number;
  current: { id: string; date: Date } | null; // the open promise, if any
};

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const short = (d: Date) => `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;

// Records a tenant's promise to pay by a date. After saving, the sheet offers a pre-filled WhatsApp
// confirmation so the promise is in writing. With an open promise the button shows its date and the
// sheet can move or delete it.
export function PromiseButton({ target, className = "btn-secondary btn-sm", label }: { target: PromiseTarget; className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = target;
  const today = new Date();
  const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const confirmHref = saved ? waLink(t.phone, promiseText({ name: t.tenantName, roomNumber: t.roomNumber, year: t.year, month: t.month, date: saved })) : null;

  const close = () => { setOpen(false); setSaved(null); setError(null); };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={className}
        aria-label={t.current ? `Janji bayar kamar ${t.roomNumber} tanggal ${short(t.current.date)}, ubah` : `Catat janji bayar kamar ${t.roomNumber}`}>
        <IconCalendar width={16} /> {label ?? (t.current ? `Janji ${short(t.current.date)}` : "Janji bayar")}
      </button>
      <Sheet open={open} onClose={close} title={saved ? "Janji tercatat" : "Janji bayar"}>
        {saved ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              <b className="font-semibold">{t.tenantName}</b> (Kamar {t.roomNumber}) janji melunasi pada <b className="font-semibold">{longDateId(saved)}</b>.
              Sampai tanggal itu kamar ini tidak masuk daftar tagih; kamu diingatkan pada harinya.
            </p>
            {confirmHref ? (
              <a href={confirmHref} target="_blank" rel="noopener noreferrer" className="btn w-full bg-orange text-white">
                <IconWhatsApp width={18} /> Kirim konfirmasi WA
              </a>
            ) : <p className="text-xs text-ink-soft">Nomor WhatsApp belum disimpan, jadi konfirmasi tidak bisa dikirim dari sini.</p>}
            <button type="button" onClick={close} className="btn-secondary w-full">Selesai</button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-soft">{t.tenantName} · Kamar {t.roomNumber} · sewa {MONTHS_SHORT[t.month - 1]} {t.year}</p>
            <form className="flex flex-col gap-4"
              action={async (fd) => {
                setError(null);
                try {
                  const res = await savePaymentPromise(fd);
                  if (typeof res === "string") setError(res);
                  else setSaved(new Date(`${String(fd.get("date"))}T00:00:00.000Z`));
                } catch (err) {
                  reportClientIssue("form-save-failed", { form: "Payment promise", ...errorDetails(err) });
                  setError("Gagal menyimpan. Periksa koneksi, lalu coba lagi.");
                }
              }}>
              <input type="hidden" name="roomId" value={t.roomId} />
              <div>
                <label className="label" htmlFor={`promise-${t.roomId}`}>Janji lunas tanggal</label>
                <input id={`promise-${t.roomId}`} name="date" type="date" required min={todayYmd}
                  defaultValue={t.current ? ymd(t.current.date) : ""} className="field num" />
              </div>
              {error && <p role="alert" className="rounded-[4px] border-[1.5px] border-blush-deep bg-blush px-4 py-3 text-sm font-semibold text-blush-deep">{error}</p>}
              <SubmitButton className="btn-primary w-full" pendingText="Menyimpan…">{t.current ? "Pindahkan janji" : "Simpan janji"}</SubmitButton>
            </form>
            {t.current && (
              <form action={async (fd) => { await deletePaymentPromise(fd); close(); }} className="flex justify-center">
                <input type="hidden" name="id" value={t.current.id} />
                <ConfirmButton message={`Hapus janji bayar ${t.tenantName}?`} aria-label={`Hapus janji bayar ${t.tenantName}`} className="btn-secondary btn-sm">
                  Hapus janji
                </ConfirmButton>
              </form>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}

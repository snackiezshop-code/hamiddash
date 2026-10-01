"use client";

import Link from "next/link";
import { useEffect } from "react";
import { errorDetails, reportClientIssue } from "@/lib/client-log";

// Catches anything that throws while the Cash Book saves or switches tabs/months, logs it with
// its stack (and digest, for server errors) instead of leaving a dead screen.
export default function CashBookError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportClientIssue("cash-book-error", errorDetails(error));
  }, [error]);

  return (
    <div className="card mt-6">
      <p className="eyebrow text-orange-text">Terjadi kesalahan</p>
      <h1 className="h-display mt-2 text-2xl">Buku kas gagal dimuat</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Perubahan terakhirmu mungkin belum tersimpan. Coba lagi, lalu periksa angkanya.
      </p>
      {error.digest && <p className="num mt-2 text-xs text-ink-soft">Kode {error.digest}</p>}
      <div className="mt-5 flex flex-col gap-2">
        <button type="button" onClick={() => retry()} className="btn-primary w-full">Coba lagi</button>
        <Link href="/kas" className="btn-secondary w-full">Kembali ke bulan ini</Link>
      </div>
    </div>
  );
}

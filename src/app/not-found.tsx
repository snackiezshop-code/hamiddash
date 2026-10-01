import Link from "next/link";

export default function NotFound() {
  return (
    <main className="safe-gutter grid min-h-screen place-items-center pb-4">
      <div className="card w-full max-w-sm">
        <p className="eyebrow text-ink-soft">Error 404</p>
        <h1 className="h-display mt-2 text-3xl">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm text-ink-soft">Halaman ini tidak ada. Mungkin nomor kamar atau bulannya salah ketik.</p>
        <Link href="/" className="btn-primary press mt-5 w-full">Kembali ke Ringkasan</Link>
      </div>
    </main>
  );
}

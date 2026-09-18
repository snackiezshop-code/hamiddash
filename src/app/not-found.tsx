import Link from "next/link";

// Replaces Next's default 404 (white page, default font) with one in the app's own look.
export default function NotFound() {
  return (
    <main className="safe-gutter grid min-h-screen place-items-center pb-4">
      <div className="card w-full max-w-sm bg-white text-center">
        <h1 className="font-greeting text-4xl">Not found</h1>
        <p className="mt-2 text-sm text-ink-soft">This page doesn&apos;t exist. The room or month may have been typed wrong.</p>
        <Link href="/" className="btn-primary mt-5 w-full">Back to overview</Link>
      </div>
    </main>
  );
}

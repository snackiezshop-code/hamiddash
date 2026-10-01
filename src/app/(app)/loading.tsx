// Shown the moment a tab is tapped, while the next screen's data loads (the header stays interactive).
// Shapes echo every screen's opening: a small label, the title, then stacked cards.
export default function Loading() {
  return (
    <div role="status" aria-label="Memuat" className="animate-pulse">
      <div className="mb-2 h-3 w-24 bg-cream-2" />
      <div className="mb-6 h-9 w-56 bg-cream-2" />
      <div className="card mb-3 h-40 border-cream-2 bg-cream shadow-[4px_4px_0_var(--color-cream-2)]" />
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div className="card h-20 border-cream-2 bg-cream shadow-[4px_4px_0_var(--color-cream-2)]" />
        <div className="card h-20 border-cream-2 bg-cream shadow-[4px_4px_0_var(--color-cream-2)]" />
      </div>
      <div className="card h-56 border-cream-2 bg-cream shadow-[4px_4px_0_var(--color-cream-2)]" />
      <span className="sr-only">Memuat…</span>
    </div>
  );
}

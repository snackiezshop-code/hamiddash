// Shown the moment a tab is tapped, while the next screen's data loads (the nav stays interactive).
// Shapes echo every screen's opening: serif title, a pill row, then stacked cards.
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="animate-pulse">
      <div className="mb-3 h-10 w-56 rounded-2xl bg-cream-2 md:h-14 md:w-80" />
      <div className="mb-6 h-11 w-full max-w-md rounded-full bg-cream-2" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card h-40 bg-cream-2" />
        <div className="card h-40 bg-cream-2" />
        <div className="card hidden h-40 bg-cream-2 sm:block" />
        <div className="card hidden h-40 bg-cream-2 xl:block" />
      </div>
      <div className="card mt-4 h-64 bg-cream-2" />
    </div>
  );
}

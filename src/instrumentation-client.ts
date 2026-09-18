import { errorDetails, reportClientIssue } from "@/lib/client-log";

// Uncaught errors anywhere in the app, with their stack.
window.addEventListener("error", (e) => reportClientIssue("uncaught-error", errorDetails(e.error ?? e.message)));
window.addEventListener("unhandledrejection", (e) => reportClientIssue("unhandled-rejection", errorDetails(e.reason)));

// A navigation that starts but never lands (seen once on the Cash Book after a save: the tab
// link fetched fine but the screen never changed, with no error) doesn't throw, so no boundary
// sees it. Report it if the URL still hasn't changed well after the tap.
const STALL_MS = 12_000;
let latestTransition = 0;

export function onRouterTransitionStart(url: string, navigationType: "push" | "replace" | "traverse") {
  const id = ++latestTransition;
  const from = location.href;
  const to = new URL(url, from).href;
  if (to === from) return;
  setTimeout(() => {
    if (id === latestTransition && location.href === from) {
      reportClientIssue("navigation-stalled", { from, to, navigationType, waitedMs: STALL_MS });
    }
  }, STALL_MS);
}

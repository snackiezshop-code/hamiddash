import type { Instrumentation } from "next";

// Server-side errors (page renders, server actions) with the route they came from, so a digest
// shown by an error boundary can be matched to a line in the Vercel logs.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const e = err as Error & { digest?: string };
  console.error("[hamid] server error", JSON.stringify({
    message: e?.message, digest: e?.digest, stack: e?.stack,
    path: request.path, method: request.method, route: context.routePath, type: context.routeType,
  }));
};

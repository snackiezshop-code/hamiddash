// Client-side problem reporting. There's no error service on this app, so reports go to
// /api/client-log, which writes them to the server log (Vercel → Logs in production).
export function reportClientIssue(kind: string, details: Record<string, unknown>) {
  const payload = { kind, url: location.href, at: new Date().toISOString(), ...details };
  console.error(`[hamid] ${kind}`, payload);
  try {
    fetch("/api/client-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload).slice(0, 8000),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Reporting must never break the page.
  }
}

export function errorDetails(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack, digest: (error as Error & { digest?: string }).digest };
  }
  return { message: String(error) };
}

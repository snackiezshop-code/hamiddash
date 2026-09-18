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
    <div className="card mx-auto mt-6 max-w-md bg-white text-center">
      <h1 className="font-greeting text-3xl">Something went wrong</h1>
      <p className="mt-2 text-sm text-ink-soft">
        The cash book couldn&apos;t load. Your last change may or may not have saved, so check it after retrying.
      </p>
      {error.digest && <p className="num mt-2 text-xs text-ink-soft">Ref {error.digest}</p>}
      <div className="mt-5 flex flex-col gap-2">
        <button type="button" onClick={() => retry()} className="btn-primary w-full">Try again</button>
        <Link href="/kas" className="btn-secondary w-full">Back to this month</Link>
      </div>
    </div>
  );
}

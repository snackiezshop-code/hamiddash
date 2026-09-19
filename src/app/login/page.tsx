"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <main className="safe-gutter grid min-h-screen place-items-center pb-4">
      <div className="flex w-full max-w-sm flex-col items-center">
        <div className="robot-wrap" aria-hidden="true">
          <svg className="robot" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <rect x="7" y="18" width="3" height="4" fill="var(--robot-dark)" />
            <rect x="14" y="18" width="3" height="4" fill="var(--robot-dark)" />
            <rect className="arm left" x="2" y="11" width="4" height="3" fill="var(--robot)" />
            <rect className="arm right" x="18" y="11" width="4" height="3" fill="var(--robot)" />
            <rect x="6" y="6" width="12" height="12" rx="1" fill="var(--robot)" />
            <rect className="eye left" x="9" y="10" width="2" height="3" fill="var(--ink)" />
            <rect className="eye right" x="13" y="10" width="2" height="3" fill="var(--ink)" />
          </svg>
        </div>
        <div className="splash-shadow mb-8" />

        <h1 className="font-splash mb-1 text-4xl tracking-tight">Hamid</h1>
        <p className="mb-8 text-sm text-ink-soft">Kost Mujair 12</p>

        <form action={action} className="card w-full bg-white">
          <label htmlFor="password" className="label">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus className="field" />
          {error && <p className="pill mt-3 bg-blush text-[#F6F1E5]">{error}</p>}
          <button type="submit" disabled={pending}
            className="btn mt-4 w-full bg-[#C96A52] text-[#F6F1E5] transition-colors hover:bg-[#A6543F] disabled:opacity-50">
            {pending ? "Checking…" : "Log in"}
          </button>
        </form>
      </div>
    </main>
  );
}

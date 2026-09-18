"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <main className="safe-gutter grid min-h-screen place-items-center pb-4">
      <div className="w-full max-w-sm">
        <div className="card mb-3 bg-ink text-cream">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-white p-2">
            <Logo className="h-full w-full" />
          </span>
          <h1 className="font-greeting mt-6 text-4xl">Hamid</h1>
          <p className="mt-1 text-sm text-cream/60">Kost Mujair 12</p>
        </div>
        <form action={action} className="card bg-white">
          <label htmlFor="password" className="label">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus className="field" />
          {error && <p className="pill mt-3 bg-blush text-blush-deep">{error}</p>}
          <button type="submit" disabled={pending} className="btn-primary mt-4 w-full">
            {pending ? "Checking…" : "Log in"}
          </button>
        </form>
      </div>
    </main>
  );
}

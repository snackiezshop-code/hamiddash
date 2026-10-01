"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <main className="safe-gutter grid min-h-screen place-items-center pb-4">
      <div className="flex w-full max-w-sm flex-col">
        {/* The app icon (option B): the HK mark on a card, orange block top right. */}
        <svg viewBox="0 0 132 132" className="h-16 w-16" aria-hidden>
          <rect x="18" y="18" width="106" height="106" rx="10" fill="#14171C" />
          <rect x="8" y="8" width="106" height="106" rx="10" fill="#FAF8F3" stroke="#14171C" strokeWidth="4" />
          <rect x="83" y="20" width="19" height="19" fill="#D9390F" stroke="#14171C" strokeWidth="3" />
          <path d="M30 44h10v19h18V44h10v48H58V71H40v21H30zM76 44h10v20l17-20h12L96 66l20 26h-12L89 72l-3 3v17H76z" fill="#14171C" />
        </svg>
        <p className="eyebrow mt-6 text-ink-soft">Kost Mujair 12</p>
        <h1 className="h-display mt-1.5 text-[2.25rem] leading-none">HamidKost.</h1>

        <form action={action} className="card mt-8 w-full">
          <label htmlFor="password" className="label">Kata sandi</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus className="field" />
          {error && <p role="alert" className="mt-3 rounded-[4px] border-[1.5px] border-blush-deep bg-blush px-4 py-2.5 text-sm font-semibold text-blush-deep">{error}</p>}
          <button type="submit" disabled={pending} className="btn-primary mt-4 w-full">
            {pending ? "Memeriksa…" : "Masuk"}
          </button>
        </form>
      </div>
    </main>
  );
}

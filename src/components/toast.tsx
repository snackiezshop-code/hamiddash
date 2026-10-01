"use client";

import { useEffect, useRef, useState } from "react";
import { IconClose } from "./icons";

// One toast at a time, raised from anywhere with toast(...). The <Toaster /> in the app layout shows it.
type ToastData = { id: number; message: string; action?: { label: string; onClick: () => void } };
const EVENT = "hk-toast";
let nextId = 1;

export function toast(message: string, action?: ToastData["action"]) {
  window.dispatchEvent(new CustomEvent<ToastData>(EVENT, { detail: { id: nextId++, message, action } }));
}

export function Toaster() {
  const [current, setCurrent] = useState<ToastData | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const show = (e: Event) => {
      const t = (e as CustomEvent<ToastData>).detail;
      setCurrent(t);
      clearTimeout(timer.current);
      // Long enough to read the amount and reach Undo.
      timer.current = setTimeout(() => setCurrent(null), 6000);
    };
    window.addEventListener(EVENT, show);
    return () => {
      window.removeEventListener(EVENT, show);
      clearTimeout(timer.current);
    };
  }, []);

  return (
    <div role="status" aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4">
      {current && (
        <div key={current.id}
          className="toast-in pointer-events-auto flex max-w-md min-w-0 items-center gap-1 rounded-2xl bg-ink py-1.5 pr-1.5 pl-4 text-sm text-cream shadow-lg">
          <span className="min-w-0 flex-1 py-1.5">{current.message}</span>
          {current.action && (
            <button type="button" onClick={() => { current.action!.onClick(); setCurrent(null); }}
              className="min-h-11 shrink-0 cursor-pointer rounded-xl px-3 font-semibold text-butter hover:bg-cream/10">
              {current.action.label}
            </button>
          )}
          <button type="button" onClick={() => setCurrent(null)} aria-label="Dismiss"
            className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl text-cream/70 hover:bg-cream/10 hover:text-cream">
            <IconClose width={16} height={16} />
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { markRoomPaid } from "@/app/actions";
import { rupiah } from "@/lib/format";
import { IconCheck } from "./icons";
import { RobotSvg, type RobotEyes } from "./robot";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── Greeting robot: keeps its idle hop, and each tap plays the next of three reactions. ──
const REACTIONS = [
  { className: "robot-react-hop", ms: 600, eyes: null },
  { className: "robot-react-spin", ms: 600, eyes: null },
  { className: "robot-react-love", ms: 1000, eyes: "hearts" as const },
];

export function GreetingRobot({ mood }: { mood: "morning" | "day" | "night" }) {
  const [taps, setTaps] = useState(0);
  const [active, setActive] = useState<(typeof REACTIONS)[number] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const count = useRef(0);
  const react = () => {
    const r = REACTIONS[count.current++ % REACTIONS.length];
    setTaps(count.current);
    setActive(r);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setActive(null), r.ms);
  };
  const eyes: RobotEyes = active?.eyes ?? (mood === "night" ? "sleepy" : "open");

  return (
    <button type="button" onClick={react} aria-label="Say hi to the robot"
      className="-m-1 flex h-14 w-12 shrink-0 cursor-pointer flex-col items-center justify-center rounded-full p-1 md:h-16 md:w-16">
      {/* key restarts the reaction animation on every tap */}
      <span key={taps} className={`block origin-center ${active?.className ?? ""}`}>
        <RobotSvg className="robot-bounce h-9 w-9 md:h-12 md:w-12" eyes={eyes} cup={mood === "morning"} />
      </span>
      <span className="robot-bounce-shadow h-1 w-5 rounded-full md:h-1.5 md:w-7" aria-hidden />
    </button>
  );
}

// ── Balance that counts up from last month's figure, once per browser session. ──
const COUNT_KEY = "hk-balance-counted";

export function CountUpRupiah({ from, to }: { from: number; to: number }) {
  const [value, setValue] = useState(to);
  // Decided once per mount, so StrictMode's effect replay doesn't read the flag it just wrote.
  const run = useRef<boolean | null>(null);

  useEffect(() => {
    if (run.current === null) {
      let seen = true;
      try {
        seen = sessionStorage.getItem(COUNT_KEY) === "1";
        sessionStorage.setItem(COUNT_KEY, "1");
      } catch { /* storage blocked: just show the number */ }
      run.current = !seen && from !== to && !reducedMotion();
    }
    if (!run.current) return;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const p = Math.min((now - start) / 500, 1);
      setValue(Math.round(from + (to - from) * (1 - (1 - p) ** 3)));
      if (p < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [from, to]);

  return (
    <>
      <span className="sr-only">{rupiah(to)}</span>
      <span aria-hidden>{rupiah(value)}</span>
    </>
  );
}

// ── Mark paid: the row flashes mint, coins pop, the check draws in, then the row folds away
// before the server action runs (the refreshed list no longer has the row). ──
type Phase = "idle" | "flash" | "collapse";
const PaidCtx = createContext<{ phase: Phase; start: () => number } | null>(null);

export function PaidRow({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Returns how long to wait before submitting.
  const start = () => {
    if (reducedMotion()) return 0;
    setPhase("flash");
    timers.current.push(
      setTimeout(() => setPhase("collapse"), 450),
      // Still here long after submitting means the save failed; bring the row back.
      setTimeout(() => setPhase("idle"), 6000),
    );
    return 700;
  };

  return (
    <PaidCtx.Provider value={{ phase, start }}>
      <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${phase === "collapse" ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr]"}`}>
        <div className={`min-h-0 ${phase === "collapse" ? "overflow-hidden" : ""}`}>
          <div className={`-mx-2 rounded-2xl px-2 transition-colors duration-200 ${phase === "idle" ? "" : "bg-mint"}`}>{children}</div>
        </div>
      </div>
    </PaidCtx.Provider>
  );
}

const COIN_COLORS = ["bg-butter", "bg-terra", "bg-mint-deep", "bg-peri-deep"];
const COINS = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
  const dist = i % 2 ? 30 : 38;
  return {
    color: COIN_COLORS[i % COIN_COLORS.length],
    style: { "--dx": `${Math.round(Math.cos(angle) * dist)}px`, "--dy": `${Math.round(Math.sin(angle) * dist)}px` } as CSSProperties,
  };
});

export function PaidButton({ incomeId, roomNumber }: { incomeId: string; roomNumber: number }) {
  const ctx = useContext(PaidCtx);
  const form = useRef<HTMLFormElement>(null);
  const [sent, setSent] = useState(false);
  const celebrating = ctx ? ctx.phase !== "idle" : sent;

  return (
    <form ref={form} action={markRoomPaid}>
      <input type="hidden" name="incomeId" value={incomeId} />
      <button type="submit" disabled={celebrating} aria-label={`Mark room ${roomNumber} paid`} title="Mark paid"
        onClick={(e) => {
          e.preventDefault();
          if (celebrating) return;
          if (!ctx) setSent(true);
          const wait = ctx?.start() ?? 0;
          setTimeout(() => form.current?.requestSubmit(), wait);
        }}
        className={`relative grid h-11 w-11 cursor-pointer place-items-center rounded-full transition-[background-color,transform] duration-200 active:scale-90 ${
          celebrating ? "scale-110 bg-mint-deep text-cream" : "bg-ink text-cream hover:bg-ink/85"
        }`}>
        {celebrating ? (
          <>
            <svg viewBox="0 0 24 24" width={20} height={20} className="check-draw" aria-hidden>
              <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {COINS.map((c, i) => <span key={i} className={`coin ${c.color}`} style={c.style} aria-hidden />)}
          </>
        ) : (
          <IconCheck width={18} height={18} strokeWidth={3} />
        )}
      </button>
    </form>
  );
}

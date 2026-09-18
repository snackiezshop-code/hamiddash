"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RoomStatus } from "@/generated/prisma/enums";
import { STATUS_LABEL, STATUS_TONE, TONE_CLASS } from "@/lib/format";
import { IconSearch } from "./icons";

export type SearchRoom = { number: number; status: RoomStatus; tenant: string | null; phone: string | null };

export function RoomSearch({ rooms }: { rooms: SearchRoom[] }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const digits = q.replace(/\D/g, "");
    return rooms.filter((r) =>
      String(r.number) === q.replace(/^(room|kamar|r|k)\s*/, "") ||
      r.tenant?.toLowerCase().includes(q) ||
      (digits.length >= 3 && r.phone?.replace(/\D/g, "").includes(digits)),
    );
  }, [query, rooms]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (n: number) => {
    setOpen(false);
    setQuery("");
    router.push(`/kamar/${n}`);
  };

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <label className="flex items-center gap-2 h-11 rounded-full border border-line bg-white px-4 focus-within:border-ink">
        <IconSearch width={18} height={18} className="shrink-0 text-ink-soft" />
        <input
          type="search"
          value={query}
          placeholder="Room or tenant"
          aria-label="Search rooms and tenants"
          role="combobox"
          aria-expanded={open && query.trim() !== ""}
          aria-controls="room-search-results"
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-soft/70"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (!results.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => (a + 1) % results.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => (a - 1 + results.length) % results.length);
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(results[active].number);
            }
          }}
        />
      </label>

      {open && query.trim() !== "" && (
        <ul id="room-search-results" role="listbox"
          className="absolute z-40 mt-2 max-h-80 w-full overflow-y-auto rounded-3xl border border-line bg-white py-1.5 shadow-xl">
          {results.length === 0 ? (
            <li className="px-5 py-3 text-sm text-ink-soft">No matches</li>
          ) : results.map((r, i) => (
            <li key={r.number} role="option" aria-selected={i === active}>
              <Link href={`/kamar/${r.number}`} onClick={() => go(r.number)} onMouseEnter={() => setActive(i)}
                className={`flex items-center justify-between gap-3 px-5 py-2.5 ${i === active ? "bg-cream" : ""}`}>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">Room {r.number} · {r.tenant ?? "No tenant"}</span>
                  {r.phone && <span className="num block text-xs text-ink-soft">{r.phone}</span>}
                </span>
                <span className={`pill ${TONE_CLASS[STATUS_TONE[r.status]]}`}>{STATUS_LABEL[r.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

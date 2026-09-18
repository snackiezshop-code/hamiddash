import type { ReactNode } from "react";
import {
  Broom, CaretRight, ClipboardText, DoorOpen, DotsThreeOutline, Drop, HandCoins, Lightning,
  Package, Receipt, SprayBottle, Toolbox, UserGear, WifiHigh, Wrench,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { ExpenseCategory, RoomStatus } from "@/generated/prisma/enums";

export type Pastel = "mint" | "blush" | "butter" | "peri";

export const PASTEL_BG: Record<Pastel, string> = {
  mint: "bg-mint",
  blush: "bg-blush",
  butter: "bg-butter",
  peri: "bg-peri",
};

// Bold two-tone glyph in a soft pastel circle (brief 6.10). Icons stay ink so they read on every pastel.
export function IconBadge({ icon: Glyph, tone, size = 40 }: { icon: Icon; tone: Pastel; size?: number }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full text-ink ${PASTEL_BG[tone]}`}
      style={{ width: size, height: size }} aria-hidden>
      <Glyph size={Math.round(size * 0.5)} weight="duotone" />
    </span>
  );
}

export function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?";
}

export function Avatar({ name, tone, size = 40, className = "" }: { name: string; tone: Pastel; size?: number; className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full font-display font-extrabold text-ink ${PASTEL_BG[tone]} ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }} aria-hidden>
      {initials(name)}
    </span>
  );
}

export const STATUS_PASTEL: Record<RoomStatus, Pastel> = {
  LUNAS: "mint",
  TUNDA_BAYAR: "blush",
  RUSAK: "butter",
  KOSONG: "peri",
  TAHUNAN: "peri",
};

// Leading badge → label (+ secondary line) → one trailing element (brief 6.2).
// wrapTitle: for rows whose title is the whole content (tasks), so nothing is cut off with no way to read it.
export function ListRow({ leading, title, subtitle, trailing, wrapTitle = false }: {
  leading: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  wrapTitle?: boolean;
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 py-2">
      {leading}
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-semibold ${wrapTitle ? "break-words" : "truncate"}`}>{title}</div>
        {subtitle && <div className="truncate text-xs text-ink-soft">{subtitle}</div>}
      </div>
      {trailing}
    </div>
  );
}

export function CountPill({ n }: { n: number }) {
  return <span className="num grid h-6 min-w-6 place-items-center rounded-full bg-ink px-2 text-xs font-semibold text-cream">{n}</span>;
}

export function Chevron() {
  return <CaretRight size={18} weight="bold" className="shrink-0 text-ink-soft" aria-hidden />;
}

type CategoryMeta = { tone: Pastel; icon: Icon };

export const TASK_CATEGORIES: ({ value: string } & CategoryMeta)[] = [
  { value: "Cleaning", tone: "mint", icon: Broom },
  { value: "Maintenance", tone: "butter", icon: Wrench },
  { value: "Admin", tone: "peri", icon: ClipboardText },
  { value: "Other", tone: "blush", icon: DotsThreeOutline },
];

export function taskCategoryMeta(category: string | null | undefined): CategoryMeta {
  const legacy: Record<string, string> = { Perawatan: "Maintenance", Kebersihan: "Cleaning", Lainnya: "Other" };
  const key = category ? legacy[category] ?? category : "Other";
  return TASK_CATEGORIES.find((c) => c.value === key) ?? TASK_CATEGORIES[3];
}

// Lightning here literally means the electricity bill, not decoration.
export const EXPENSE_META: Record<ExpenseCategory, CategoryMeta> = {
  LISTRIK: { tone: "butter", icon: Lightning },
  PDAM: { tone: "peri", icon: Drop },
  CLEANING_SERVICE: { tone: "mint", icon: Broom },
  KEBERSIHAN: { tone: "mint", icon: SprayBottle },
  PERBAIKAN: { tone: "butter", icon: Wrench },
  INTERNET: { tone: "peri", icon: WifiHigh },
  PERLENGKAPAN: { tone: "butter", icon: Toolbox },
  ADMINISTRASI: { tone: "peri", icon: Receipt },
  PENGURUS: { tone: "mint", icon: UserGear },
  BAGI_HASIL: { tone: "blush", icon: HandCoins },
  LAINNYA: { tone: "blush", icon: DotsThreeOutline },
};

const RING_STROKE: Record<Pastel, string> = {
  mint: "var(--color-mint)",
  blush: "var(--color-blush)",
  butter: "var(--color-butter)",
  peri: "var(--color-peri)",
};

export const OCCUPANCY_SEGMENTS = {
  occupied: { label: "Occupied", tone: "mint" as Pastel, icon: DoorOpen },
  vacant: { label: "Vacant", tone: "peri" as Pastel, icon: Package },
  damaged: { label: "Damaged", tone: "butter" as Pastel, icon: Wrench },
};

// Thick rounded-cap ring, one arc per room status, sized by room count (brief 6.5).
export function SegmentedRing({ segments, center, caption, size = 200 }: {
  segments: { key: string; value: number; label: string; tone: Pastel; icon: Icon }[];
  center: string;
  caption: string;
  size?: number;
}) {
  const stroke = Math.round(size * 0.12);
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  const shown = segments.filter((s) => s.value > 0);
  const single = shown.length === 1;
  const gap = single ? 0 : stroke + 8;

  // A 1-of-16 slice would vanish behind the gap, so small segments get a floor; the legend keeps exact counts.
  const minLen = gap + stroke * 1.4;
  const total = shown.reduce((s, x) => s + x.value, 0) || 1;
  const raw = shown.map((s) => (s.value / total) * c);
  const small = raw.map((l) => !single && l < minLen);
  const reserved = small.reduce((sum, isSmall) => sum + (isSmall ? minLen : 0), 0);
  const bigTotal = raw.reduce((sum, l, i) => sum + (small[i] ? 0 : l), 0) || 1;
  const lens = raw.map((l, i) => (small[i] ? minLen : (l / bigTotal) * (c - reserved)));

  const arcs = shown.map((s, i) => {
    const start = lens.slice(0, i).reduce((sum, l) => sum + l, 0);
    const len = lens[i];
    return { ...s, start, len, visible: Math.max(single ? len : len - gap, 0.5) };
  });
  const summary = segments.map((s) => `${s.value} ${s.label.toLowerCase()}`).join(", ");

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }} role="img" aria-label={`${center} ${caption}: ${summary}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        {arcs.map((a) => (
          <circle key={a.key} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={RING_STROKE[a.tone]} strokeWidth={stroke}
            strokeLinecap={single ? "butt" : "round"}
            strokeDasharray={`${a.visible} ${c}`}
            strokeDashoffset={-(a.start + (single ? 0 : gap / 2))} />
        ))}
      </svg>
      {arcs.map((a) => {
        const angle = ((a.start + a.len / 2) / c) * 2 * Math.PI - Math.PI / 2;
        const x = size / 2 + r * Math.cos(angle);
        const y = size / 2 + r * Math.sin(angle);
        const Glyph = a.icon;
        return (
          <span key={a.key} className="absolute grid place-items-center rounded-full bg-white/80 text-ink"
            style={{ width: stroke - 2, height: stroke - 2, left: x - (stroke - 2) / 2, top: y - (stroke - 2) / 2 }} aria-hidden>
            <Glyph size={Math.round(stroke * 0.55)} weight="duotone" />
          </span>
        );
      })}
      <div className="absolute inset-0 grid place-content-center text-center" aria-hidden>
        <span className="font-display text-4xl leading-none font-extrabold tracking-tight">{center}</span>
        <span className="mt-1 text-xs text-ink-soft">{caption}</span>
      </div>
    </div>
  );
}

// Blush callout with a faint corner blob; the emphasized number is passed in by the caller (brief 6.6).
export function AlertCallout({ eyebrow, children, action, tone = "blush" }: {
  eyebrow: string;
  children: ReactNode;
  action?: ReactNode;
  tone?: "blush" | "mint";
}) {
  return (
    <section className={`card relative overflow-hidden ${tone === "blush" ? "bg-blush" : "bg-mint"}`}>
      <svg viewBox="0 0 120 120" className="pointer-events-none absolute -right-6 -bottom-8 h-32 w-32 text-ink/[0.06]" aria-hidden>
        <path fill="currentColor" d="M60 8c16 0 24 14 36 22s22 22 16 40-24 20-36 32-26 16-40 6S14 80 10 64 12 30 26 20 44 8 60 8Z" />
      </svg>
      <p className="relative text-xs font-semibold text-ink-soft">{eyebrow}</p>
      <div className="relative mt-1.5 font-display text-xl leading-snug font-bold tracking-tight">{children}</div>
      {action && <div className="relative mt-4">{action}</div>}
    </section>
  );
}

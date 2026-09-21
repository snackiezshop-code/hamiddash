import type { ReactNode } from "react";
import {
  Broom, CaretRight, ClipboardText, DotsThreeOutline, Drop, HandCoins, Lightning,
  Receipt, SprayBottle, Toolbox, UserGear, WifiHigh, Wrench,
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

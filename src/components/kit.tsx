import type { ReactNode } from "react";
import {
  IconChevronRight, IconClipboard, IconCoins, IconHuman, IconInvoice, IconMore, IconSpray, IconSprayCan,
  IconStickyNote, IconToolCase, IconTools, IconWaves, IconWifi, IconZap, type AppIcon,
} from "./icons";
import type { ExpenseCategory, RoomStatus } from "@/generated/prisma/enums";

export type Pastel = "mint" | "blush" | "butter" | "peri";

export const PASTEL_BG: Record<Pastel, string> = {
  mint: "bg-mint",
  blush: "bg-blush",
  butter: "bg-butter",
  peri: "bg-peri",
};

// Line icon in a small outlined square tinted by category. Icons stay ink so they read on every tint.
export function IconBadge({ icon: Glyph, tone, size = 40 }: { icon: AppIcon; tone: Pastel; size?: number }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-[4px] border-[1.5px] border-ink text-ink ${PASTEL_BG[tone]}`}
      style={{ width: size, height: size }} aria-hidden>
      <Glyph width={Math.round(size * 0.5)} />
    </span>
  );
}

export function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?";
}

export function Avatar({ name, tone, size = 40, className = "" }: { name: string; tone: Pastel; size?: number; className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-[4px] border-[1.5px] border-ink font-semibold text-ink ${PASTEL_BG[tone]} ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }} aria-hidden>
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
    <div className="flex min-h-14 items-center gap-3 py-2.5">
      {leading}
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-medium ${wrapTitle ? "break-words" : "truncate"}`}>{title}</div>
        {subtitle && <div className="truncate text-xs text-ink-soft">{subtitle}</div>}
      </div>
      {trailing}
    </div>
  );
}

export function CountPill({ n }: { n: number }) {
  return <span className="num grid h-6 min-w-6 place-items-center rounded-[3px] bg-navy px-1.5 text-xs font-semibold text-white">{n}</span>;
}

export function Chevron() {
  return <IconChevronRight width={16} className="shrink-0 text-ink-soft" />;
}

type CategoryMeta = { tone: Pastel; icon: AppIcon };

// `value` is what the database stores (kept in English so old rows still match); `label` is shown.
export const TASK_CATEGORIES: ({ value: string; label: string } & CategoryMeta)[] = [
  { value: "Cleaning", label: "Kebersihan", tone: "mint", icon: IconSpray },
  { value: "Maintenance", label: "Perawatan", tone: "butter", icon: IconTools },
  { value: "Admin", label: "Admin", tone: "peri", icon: IconClipboard },
  { value: "Other", label: "Lainnya", tone: "blush", icon: IconStickyNote },
];

export function taskCategoryMeta(category: string | null | undefined): CategoryMeta {
  const legacy: Record<string, string> = { Perawatan: "Maintenance", Kebersihan: "Cleaning", Lainnya: "Other" };
  const key = category ? legacy[category] ?? category : "Other";
  return TASK_CATEGORIES.find((c) => c.value === key) ?? TASK_CATEGORIES[3];
}

// Zap literally means the electricity bill here, waves the water (PDAM) bill: not decoration.
export const EXPENSE_META: Record<ExpenseCategory, CategoryMeta> = {
  LISTRIK: { tone: "butter", icon: IconZap },
  PDAM: { tone: "peri", icon: IconWaves },
  CLEANING_SERVICE: { tone: "mint", icon: IconSpray },
  KEBERSIHAN: { tone: "mint", icon: IconSprayCan },
  PERBAIKAN: { tone: "butter", icon: IconTools },
  INTERNET: { tone: "peri", icon: IconWifi },
  PERLENGKAPAN: { tone: "butter", icon: IconToolCase },
  ADMINISTRASI: { tone: "peri", icon: IconInvoice },
  PENGURUS: { tone: "mint", icon: IconHuman },
  BAGI_HASIL: { tone: "blush", icon: IconCoins },
  LAINNYA: { tone: "blush", icon: IconMore },
};

// Rent collected this month: one segment per room that owes rent (empty and broken rooms don't
// count; yearly payers count as paid), inside an outlined bar. Paid segments are orange and fill in
// room order on load.
export function RentProgress({ rooms }: { rooms: { id: string; number: number; paid: boolean }[] }) {
  const paid = rooms.filter((r) => r.paid).length;
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={rooms.length} aria-valuenow={paid}
      aria-label={`Sewa masuk: ${paid} dari ${rooms.length} kamar`}
      className="flex h-3.5 gap-[2px] border-[1.5px] border-ink p-[2px]">
      {rooms.map((r, i) => (
        <span key={r.id} title={`Kamar ${r.number} · ${r.paid ? "lunas" : "belum bayar"}`}
          className={`min-w-0 flex-1 ${r.paid ? "seg-fill bg-orange" : ""}`}
          style={{ animationDelay: `${i * 40}ms` }} />
      ))}
    </div>
  );
}

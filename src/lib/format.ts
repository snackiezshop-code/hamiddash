import type { ExpenseCategory, RoomStatus } from "@/generated/prisma/enums";

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function rupiah(n: number) {
  return (n < 0 ? "-Rp" : "Rp") + Math.abs(n).toLocaleString("id-ID");
}

export function rupiahShort(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}Rp${(abs / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}M`;
  if (abs >= 1_000) return `${sign}Rp${Math.round(abs / 1_000)}k`;
  return rupiah(n);
}

export function periodLabel(year: number, month: number) {
  return `${MONTHS[month - 1]} ${year}`;
}

export function periodSlug(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parsePeriodSlug(slug: string) {
  const m = /^(\d{4})-(\d{2})$/.exec(slug);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

// Later than Jakarta's current month.
export function isFuturePeriod(year: number, month: number) {
  const now = todayJakarta();
  return year * 12 + month > now.getUTCFullYear() * 12 + now.getUTCMonth() + 1;
}

export function shiftMonth(year: number, month: number, delta: number) {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export const TZ = "Asia/Jakarta";

export function formatDate(d: Date | null | undefined) {
  if (!d) return "Not set";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
}

// "Today" for business logic (new month rollover, reminder days, overdue checks) must follow
// Jakarta's calendar date, not the server process's — Vercel runs functions in UTC.
export function todayJakarta() {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return new Date(`${ymd}T00:00:00.000Z`);
}

export function dateInputValue(d: Date | null | undefined) {
  return d ? d.toISOString().slice(0, 10) : "";
}

export const STATUS_OPTIONS: RoomStatus[] = ["LUNAS", "TUNDA_BAYAR", "KOSONG", "RUSAK", "TAHUNAN"];

export const STATUS_LABEL: Record<RoomStatus, string> = {
  LUNAS: "Paid",
  TUNDA_BAYAR: "Unpaid",
  KOSONG: "Vacant",
  RUSAK: "Damaged",
  TAHUNAN: "Annual",
};

// Tailwind classes per the approved palette: mint=paid, blush=unpaid, butter=damaged, periwinkle=vacant/annual.
export const STATUS_TONE: Record<RoomStatus, "mint" | "blush" | "butter" | "peri"> = {
  LUNAS: "mint",
  TUNDA_BAYAR: "blush",
  RUSAK: "butter",
  KOSONG: "peri",
  TAHUNAN: "peri",
};

export const TONE_CLASS = {
  mint: "bg-mint text-mint-deep",
  blush: "bg-blush text-blush-deep",
  butter: "bg-butter text-butter-deep",
  peri: "bg-peri text-peri-deep",
  ink: "bg-ink text-cream",
  white: "bg-white text-ink",
} as const;

export type Tone = keyof typeof TONE_CLASS;

export const CATEGORY_OPTIONS: ExpenseCategory[] = [
  "LISTRIK", "PDAM", "CLEANING_SERVICE", "KEBERSIHAN", "PERBAIKAN", "INTERNET",
  "PERLENGKAPAN", "ADMINISTRASI", "PENGURUS", "BAGI_HASIL", "LAINNYA",
];

export const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  LISTRIK: "Electricity",
  PDAM: "Water (PDAM)",
  CLEANING_SERVICE: "Cleaning service",
  KEBERSIHAN: "Cleaning supplies",
  PERBAIKAN: "Repairs",
  INTERNET: "Internet",
  PERLENGKAPAN: "Equipment",
  ADMINISTRASI: "Admin fees",
  PENGURUS: "Caretaker",
  BAGI_HASIL: "Profit share",
  LAINNYA: "Other",
};

// Indonesian local numbers (08xx) → wa.me international format (628xx).
export function waNumber(phone: string | null | undefined) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  else if (digits.startsWith("8")) digits = "62" + digits;
  return digits.length >= 10 ? digits : null;
}

export function waLink(phone: string | null | undefined, text?: string) {
  const n = waNumber(phone);
  if (!n) return null;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// Sent to tenants, so it stays in Indonesian.
export function reminderText(name: string, roomNumber: number, amount: number, year: number, month: number) {
  const period = `${MONTHS_ID[month - 1]} ${year}`;
  return `Halo ${name}, mengingatkan pembayaran sewa Kamar ${roomNumber} untuk ${period} sebesar ${rupiah(amount)}. Terima kasih 🙏`;
}

export function parseAmount(v: FormDataEntryValue | null) {
  const n = Number(String(v ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

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
  blush: "bg-terra-strong text-[#F6F1E5]",
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

const DAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// Where tenants transfer rent; printed in every reminder.
export const PAYMENT_ACCOUNT = { bank: "BSI", number: "1059866024", holder: "Angga Roynanda" };

const DAY_MS = 24 * 60 * 60 * 1000;

// The rent due date for a period: the tenant's reminder day, clamped to short months (31 → 30 Sep).
export function dueDateOf(year: number, month: number, dueDay: number) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1, Math.min(dueDay, last)));
}

export function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

export type ReminderInput = {
  name: string;
  roomNumber: number;
  amount: number;
  year: number;
  month: number;
  dueDay: number | null;
};

// Sent to tenants over WhatsApp, so it stays in Indonesian. *bold* is WhatsApp formatting.
// The opening line adapts to how far the due date is from `today` (before, on, or after it).
export function reminderText(r: ReminderInput, today: Date = todayJakarta()) {
  const period = `${MONTHS_ID[r.month - 1]} ${r.year}`;
  const due = r.dueDay ? dueDateOf(r.year, r.month, r.dueDay) : null;
  const dueLabel = due ? `${DAYS_ID[due.getUTCDay()]}, ${due.getUTCDate()} ${MONTHS_ID[due.getUTCMonth()]} ${due.getUTCFullYear()}` : null;
  const days = due ? daysBetween(today, due) : null;

  let opening: string;
  let dueLine: string;
  if (days === null) {
    opening = `Kami ingin mengingatkan pembayaran sewa kamar untuk bulan ${period}.`;
    dueLine = "";
  } else if (days > 1) {
    opening = `Kami ingin mengingatkan bahwa sewa kamar akan jatuh tempo dalam ${days} hari.`;
    dueLine = `• Jatuh tempo: *${dueLabel}*\n`;
  } else if (days === 1) {
    opening = "Kami ingin mengingatkan bahwa sewa kamar akan jatuh tempo *besok*.";
    dueLine = `• Jatuh tempo: *${dueLabel}*\n`;
  } else if (days === 0) {
    opening = "Kami ingin mengingatkan bahwa *hari ini* adalah tanggal jatuh tempo sewa kamar.";
    dueLine = `• Jatuh tempo: *${dueLabel}*\n`;
  } else {
    opening = `Kami ingin menginformasikan bahwa sewa kamar telah melewati jatuh tempo ${-days} hari dan kami belum menerima pembayarannya.`;
    dueLine = `• Jatuh tempo: ${dueLabel}\n`;
  }

  // Names are often stored in caps ("KIKI"); greet as "Kiki".
  const name = r.name.trim().toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  const greeting = name ? `Assalamualaikum ${name},` : "Assalamualaikum,";
  return [
    greeting,
    "",
    opening,
    "",
    `• Kamar: *${r.roomNumber}* (Kost Mujair 12)`,
    `• Periode: ${period}`,
    `• Jumlah: *${rupiah(r.amount)}*`,
    ...(dueLine ? [dueLine.trimEnd()] : []),
    "",
    "Pembayaran dapat ditransfer ke:",
    `*Bank ${PAYMENT_ACCOUNT.bank} ${PAYMENT_ACCOUNT.number}*`,
    `a.n. ${PAYMENT_ACCOUNT.holder}`,
    "",
    "Setelah transfer, mohon kirimkan bukti pembayaran di chat ini.",
    days !== null && days < 0
      ? "Apabila ada kendala pembayaran atau tidak berencana melanjutkan sewa, mohon segera kabari kami."
      : "Apabila tidak berencana melanjutkan sewa atau membutuhkan tambahan waktu, mohon kabari kami sebelum tanggal jatuh tempo.",
    "",
    "Terima kasih atas kerja samanya 🙏",
    "Wassalamualaikum.",
  ].join("\n");
}

export function parseAmount(v: FormDataEntryValue | null) {
  const n = Number(String(v ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

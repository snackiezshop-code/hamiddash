import type { ExpenseCategory, RoomStatus } from "@/generated/prisma/enums";

export const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
// Three-letter Indonesian month names (Agu, Okt, Des), for tight spots.
export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function rupiah(n: number) {
  return (n < 0 ? "-Rp" : "Rp") + Math.abs(n).toLocaleString("id-ID");
}

export function rupiahShort(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}Rp${(abs / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} jt`;
  if (abs >= 1_000) return `${sign}Rp${Math.round(abs / 1_000)} rb`;
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
  if (!d) return "Belum diisi";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
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
  LUNAS: "Lunas",
  TUNDA_BAYAR: "Belum bayar",
  KOSONG: "Kosong",
  RUSAK: "Rusak",
  TAHUNAN: "Tahunan",
};

// Status tints: mint = paid, blush = unpaid, butter = damaged, peri = vacant / annual.
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
  ink: "bg-navy text-white",
  white: "bg-card text-ink",
} as const;

export type Tone = keyof typeof TONE_CLASS;

export const CATEGORY_OPTIONS: ExpenseCategory[] = [
  "LISTRIK", "PDAM", "CLEANING_SERVICE", "KEBERSIHAN", "PERBAIKAN", "INTERNET",
  "PERLENGKAPAN", "ADMINISTRASI", "PENGURUS", "BAGI_HASIL", "LAINNYA",
];

export const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  LISTRIK: "Listrik",
  PDAM: "Air (PDAM)",
  CLEANING_SERVICE: "Jasa kebersihan",
  KEBERSIHAN: "Alat kebersihan",
  PERBAIKAN: "Perbaikan",
  INTERNET: "Internet",
  PERLENGKAPAN: "Perlengkapan",
  ADMINISTRASI: "Biaya admin",
  PENGURUS: "Pengurus",
  BAGI_HASIL: "Bagi hasil",
  LAINNYA: "Lainnya",
};

// "Other" expenses carry a typed-in name ("PBB", "Iuran RT"); every other category uses its fixed label.
export function expenseCategoryName(e: { category: ExpenseCategory; categoryLabel?: string | null }) {
  return e.category === "LAINNYA" && e.categoryLabel ? e.categoryLabel : CATEGORY_LABEL[e.category];
}

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
  amount: number; // the month's full rent
  year: number;
  month: number;
  dueDay: number | null;
  paid?: number; // already received toward this month (bayar sebagian); the message asks for the rest
};

// "• Sudah dibayar / • Sisa" lines for a part-paid month, or the single "• Jumlah" line.
function amountLines(total: number, paid = 0) {
  return paid > 0
    ? [`• Sewa: ${rupiah(total)}`, `• Sudah dibayar: ${rupiah(paid)}`, `• Sisa: *${rupiah(Math.max(0, total - paid))}*`]
    : [`• Jumlah: *${rupiah(total)}*`];
}

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
    opening = `Kami ingin mengingatkan ${r.paid ? "sisa " : ""}pembayaran sewa kamar untuk bulan ${period}.`;
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
    opening = r.paid
      ? `Kami ingin menginformasikan bahwa sewa kamar telah melewati jatuh tempo ${-days} hari dan pembayarannya belum lunas.`
      : `Kami ingin menginformasikan bahwa sewa kamar telah melewati jatuh tempo ${-days} hari dan kami belum menerima pembayarannya.`;
    dueLine = `• Jatuh tempo: ${dueLabel}\n`;
  }

  const name = properName(r.name);
  const greeting = name ? `Assalamualaikum ${name},` : "Assalamualaikum,";
  return [
    greeting,
    "",
    opening,
    "",
    `• Kamar: *${r.roomNumber}* (Kost Mujair 12)`,
    `• Periode: ${period}`,
    ...amountLines(r.amount, r.paid),
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

// Names are often stored in caps ("KIKI"); show them as "Kiki".
export function properName(name: string | null | undefined) {
  return (name ?? "").trim().toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

// "Selasa, 6 Oktober 2026" for a Jakarta calendar date stored as UTC midnight.
export function longDateId(d: Date) {
  return `${DAYS_ID[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS_ID[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// WhatsApp confirmation after a tenant promises to pay by a date, so the promise is in writing.
export function promiseText(p: { name: string; roomNumber: number; year: number; month: number; date: Date }) {
  const name = properName(p.name);
  return [
    name ? `Assalamualaikum ${name},` : "Assalamualaikum,",
    "",
    `Kami catat pembayaran sewa *Kamar ${p.roomNumber}* bulan ${MONTHS_ID[p.month - 1]} ${p.year} akan dilunasi pada *${longDateId(p.date)}*.`,
    "",
    "Pembayaran dapat ditransfer ke:",
    `*Bank ${PAYMENT_ACCOUNT.bank} ${PAYMENT_ACCOUNT.number}*`,
    `a.n. ${PAYMENT_ACCOUNT.holder}`,
    "",
    "Terima kasih 🙏",
  ].join("\n");
}

// What a rent payment is for, as it reads inside a message: "sewa *Kamar 3* bulan Oktober 2026",
// or for yearly rent "sewa tahunan *Kamar 15* periode Okt 2026–Sep 2027".
export type RentSubject = { roomNumber: number; year: number; month: number; annualTerm?: string | null };

function rentSubject(s: RentSubject) {
  return s.annualTerm
    ? `sewa tahunan *Kamar ${s.roomNumber}* periode ${s.annualTerm}`
    : `sewa *Kamar ${s.roomNumber}* bulan ${MONTHS_ID[s.month - 1]} ${s.year}`;
}

// WhatsApp reminder while a payment promise is open: ahead of the promised date, on it, or once it
// has passed unpaid. The opening adapts like reminderText.
export function promiseReminderText(p: RentSubject & { name: string; amount: number; paid?: number; date: Date }, today: Date = todayJakarta()) {
  const name = properName(p.name);
  const days = daysBetween(today, p.date);
  const when = longDateId(p.date);
  const what = rentSubject(p);
  const opening = days > 1 ? `Kami ingin mengingatkan janji pembayaran ${what} yang akan dilunasi pada *${when}* (${days} hari lagi).`
    : days === 1 ? `Kami ingin mengingatkan janji pembayaran ${what} yang akan dilunasi *besok*, ${when}.`
    : days === 0 ? `Kami ingin mengingatkan bahwa *hari ini*, ${when}, adalah tanggal janji pelunasan ${what}.`
    : `Kami ingin menginformasikan bahwa tanggal janji pelunasan ${what} (${when}) telah lewat ${-days} hari dan kami belum menerima pembayarannya.`;
  return [
    name ? `Assalamualaikum ${name},` : "Assalamualaikum,",
    "",
    opening,
    "",
    ...amountLines(p.amount, p.paid),
    "",
    "Pembayaran dapat ditransfer ke:",
    `*Bank ${PAYMENT_ACCOUNT.bank} ${PAYMENT_ACCOUNT.number}*`,
    `a.n. ${PAYMENT_ACCOUNT.holder}`,
    "",
    "Setelah transfer, mohon kirimkan bukti pembayaran di chat ini.",
    ...(days < 0 ? ["Apabila ada kendala pembayaran, mohon segera kabari kami."] : []),
    "",
    "Terima kasih atas kerja samanya 🙏",
    "Wassalamualaikum.",
  ].join("\n");
}

// WhatsApp thank-you once a payment is confirmed received: one line, nothing else.
export function thanksText(t: RentSubject & { name: string; amount: number }) {
  const name = properName(t.name);
  return [
    name ? `Assalamualaikum ${name},` : "Assalamualaikum,",
    "",
    `Terima kasih, pembayaran ${rentSubject(t)} sebesar *${rupiah(t.amount)}* sudah kami terima. 🙏`,
  ].join("\n");
}

// WhatsApp reminder for yearly rent: a renewal (the term ends or has ended) or the rest of a
// term already part-paid. The opening adapts to how far the due date is from today.
export function annualText(a: {
  name: string; roomNumber: number; amount: number; paid: number; partial: boolean;
  dueDate: Date; daysUntilDue: number; termLabel: string;
}) {
  const name = properName(a.name);
  const d = a.daysUntilDue;
  const when = longDateId(a.dueDate);
  const room = `*Kamar ${a.roomNumber}* (Kost Mujair 12)`;
  const opening = a.partial
    ? `Kami ingin mengingatkan sisa pembayaran sewa tahunan ${room} untuk periode ${a.termLabel}.`
    : d > 1 ? `Kami ingin mengingatkan bahwa masa sewa tahunan ${room} akan berakhir dalam ${d} hari, pada *${when}*.`
    : d === 1 ? `Kami ingin mengingatkan bahwa masa sewa tahunan ${room} berakhir *besok*, ${when}.`
    : d === 0 ? `Kami ingin mengingatkan bahwa masa sewa tahunan ${room} berakhir *hari ini*, ${when}.`
    : `Kami ingin menginformasikan bahwa masa sewa tahunan ${room} telah berakhir pada ${when} (${-d} hari lalu).`;
  const lines = a.partial
    ? [`• Periode: ${a.termLabel}`, `• Sudah dibayar: ${rupiah(a.paid)}`, `• Sisa: *${rupiah(a.amount)}*`]
    : [`• Perpanjangan: ${a.termLabel}`, `• Jumlah: *${rupiah(a.amount)}*`];
  return [
    name ? `Assalamualaikum ${name},` : "Assalamualaikum,",
    "",
    opening,
    "",
    ...lines,
    "",
    "Pembayaran dapat ditransfer ke:",
    `*Bank ${PAYMENT_ACCOUNT.bank} ${PAYMENT_ACCOUNT.number}*`,
    `a.n. ${PAYMENT_ACCOUNT.holder}`,
    "",
    a.partial ? "Setelah transfer, mohon kirimkan bukti pembayaran di chat ini." : "Mohon kabari kami apakah akan melanjutkan sewa. Setelah transfer, kirimkan bukti pembayaran di chat ini.",
    "",
    "Terima kasih atas kerja samanya 🙏",
    "Wassalamualaikum.",
  ].join("\n");
}

export function parseAmount(v: FormDataEntryValue | null) {
  const n = Number(String(v ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

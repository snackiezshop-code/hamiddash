"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { SESSION_COOKIE, SESSION_DAYS, createToken, timingSafeEqual } from "@/lib/session";
import { createPeriod, isLatestPeriod, recarryBalances } from "@/lib/cashbook";
import { sendPushToAll } from "@/lib/push";
import { dueReminders } from "@/lib/reminders";
import {
  CATEGORY_OPTIONS, STATUS_OPTIONS, formatDate, isFuturePeriod, parseAmount, periodLabel, periodSlug, todayJakarta,
} from "@/lib/format";
import { REMIND_OPTIONS, REPEAT_OPTIONS, nextDueDate } from "@/lib/reminder-items";
import type { ExpenseCategory, Repeat, RoomStatus } from "@/generated/prisma/enums";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const optStr = (f: FormData, k: string) => str(f, k) || null;
const optDate = (f: FormData, k: string) => (str(f, k) ? new Date(str(f, k)) : null);
const optAccount = (f: FormData) => str(f, "accountNumber").replace(/\s/g, "") || null;
const optAmount = (f: FormData) => parseAmount(f.get("monthlyAmount")) || null;
const optReminderDay = (f: FormData, k: string) => {
  const n = Number(str(f, k));
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
};

function asStatus(v: string): RoomStatus {
  if (!STATUS_OPTIONS.includes(v as RoomStatus)) throw new Error("Invalid status");
  return v as RoomStatus;
}

function refresh() {
  revalidatePath("/", "layout");
}

// ---------- Auth ----------

export async function login(_prev: string | null, form: FormData) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return "ADMIN_PASSWORD belum diisi di .env";
  if (!timingSafeEqual(str(form, "password"), expected)) return "Kata sandi salah";
  (await cookies()).set(SESSION_COOKIE, await createToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/",
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

// ---------- Rooms & tenants ----------

export async function updateRoom(form: FormData) {
  await requireAdmin();
  const roomId = str(form, "roomId");
  const status = asStatus(str(form, "status"));
  const monthlyRent = parseAmount(form.get("monthlyRent"));
  const tenantName = str(form, "tenantName");

  await db.room.update({ where: { id: roomId }, data: { status, monthlyRent } });

  if (tenantName) {
    const data = {
      name: tenantName,
      phone: optStr(form, "phone"),
      reminderDay: optReminderDay(form, "reminderDay"),
      moveInDate: optDate(form, "moveInDate"),
      leaseEndDate: optDate(form, "leaseEndDate"),
      notes: optStr(form, "notes"),
    };
    await db.tenant.upsert({ where: { roomId }, create: { roomId, ...data }, update: data });
  } else {
    await db.tenant.deleteMany({ where: { roomId } });
  }

  await syncLatestIncome(roomId, status, monthlyRent);
  refresh();
  redirect("/kamar");
}

// Returns an error message for the sheet to show, or undefined on success.
export async function addTenant(form: FormData) {
  await requireAdmin();
  const roomId = str(form, "roomId");
  const name = str(form, "tenantName");
  if (!name) return "Isi nama penghuni.";
  const room = await db.room.findUnique({ where: { id: roomId }, include: { tenant: true } });
  if (!room) return "Kamar itu sudah tidak ada.";
  if (room.tenant) return `Room ${room.number} already has a tenant (${room.tenant.name}).`;

  await db.tenant.create({
    data: {
      roomId,
      name,
      phone: optStr(form, "phone"),
      reminderDay: optReminderDay(form, "reminderDay"),
      moveInDate: optDate(form, "moveInDate"),
    },
  });
  if (room.status === "KOSONG") {
    await db.room.update({ where: { id: roomId }, data: { status: "TUNDA_BAYAR" } });
    await syncLatestIncome(roomId, "TUNDA_BAYAR", room.monthlyRent);
  }
  refresh();
}

export async function checkoutTenant(form: FormData) {
  await requireAdmin();
  const room = await db.room.findUniqueOrThrow({ where: { id: str(form, "roomId") } });
  await db.tenant.deleteMany({ where: { roomId: room.id } });
  await db.room.update({ where: { id: room.id }, data: { status: "KOSONG" } });
  await syncLatestIncome(room.id, "KOSONG", room.monthlyRent);
  refresh();
}

async function syncLatestIncome(roomId: string, status: RoomStatus, rent: number) {
  const latest = await db.cashPeriod.findFirst({ orderBy: [{ year: "desc" }, { month: "desc" }] });
  if (!latest) return;
  const income = await db.roomIncome.findUnique({ where: { periodId_roomId: { periodId: latest.id, roomId } } });
  if (!income || income.status === status) return;
  await db.roomIncome.update({
    where: { id: income.id },
    data: { status, amount: incomeAmountFor(status, income.amount, rent) },
  });
}

function incomeAmountFor(status: RoomStatus, current: number, rent: number) {
  if (status === "LUNAS") return current > 0 ? current : rent;
  if (status === "TAHUNAN") return current;
  return 0;
}

// ---------- Cash book ----------

export async function startPeriod(form: FormData) {
  await requireAdmin();
  const year = Number(str(form, "year"));
  const month = Number(str(form, "month"));
  // Cash books can't be started ahead of time: there's no undo for creating a period.
  if (isFuturePeriod(year, month)) redirect("/kas");
  const existing = await db.cashPeriod.findUnique({ where: { year_month: { year, month } } });
  if (!existing) {
    await createPeriod(year, month);
    await db.room.updateMany({ where: { status: "LUNAS" }, data: { status: "TUNDA_BAYAR" } });
  }
  refresh();
  redirect(`/kas/${periodSlug(year, month)}`);
}

export async function updateRoomIncome(form: FormData) {
  await requireAdmin();
  const income = await db.roomIncome.findUniqueOrThrow({
    where: { id: str(form, "incomeId") },
    include: { room: true, period: true },
  });
  const status = asStatus(str(form, "status"));
  const typed = form.has("amount") ? parseAmount(form.get("amount")) : income.amount;
  const amount = status !== income.status ? incomeAmountFor(status, typed, income.room.monthlyRent) : typed;

  await db.roomIncome.update({ where: { id: income.id }, data: { status, amount } });
  if (await isLatestPeriod(income.periodId)) {
    await db.room.update({ where: { id: income.roomId }, data: { status } });
  }
  await recarryBalances(income.period.year, income.period.month);
  refresh();
}

export async function markRoomPaid(form: FormData) {
  await requireAdmin();
  form.set("status", "LUNAS");
  form.delete("amount");
  await updateRoomIncome(form);
}

async function periodOf(periodId: string) {
  return db.cashPeriod.findUniqueOrThrow({ where: { id: periodId } });
}

export async function addAdditionalIncome(form: FormData) {
  await requireAdmin();
  const period = await periodOf(str(form, "periodId"));
  const amount = parseAmount(form.get("amount"));
  const description = str(form, "description");
  if (!description || amount <= 0) return;
  await db.additionalIncome.create({
    data: { periodId: period.id, description, source: optStr(form, "source"), amount },
  });
  await recarryBalances(period.year, period.month);
  refresh();
}

export async function deleteAdditionalIncome(form: FormData) {
  await requireAdmin();
  const row = await db.additionalIncome.delete({ where: { id: str(form, "id") }, include: { period: true } });
  await recarryBalances(row.period.year, row.period.month);
  refresh();
}

// "Other" needs a typed-in name so the cash book says what the money was for.
function expenseCategory(form: FormData) {
  const category = str(form, "category") as ExpenseCategory;
  if (!CATEGORY_OPTIONS.includes(category)) return { error: "Choose a category." } as const;
  const categoryLabel = category === "LAINNYA" ? optStr(form, "categoryLabel") : null;
  if (category === "LAINNYA" && !categoryLabel) return { error: "Type a name for the Other category." } as const;
  return { category, categoryLabel } as const;
}

export async function addExpense(form: FormData) {
  await requireAdmin();
  const period = await periodOf(str(form, "periodId"));
  const cat = expenseCategory(form);
  if ("error" in cat) return cat.error;
  const amount = parseAmount(form.get("amount"));
  if (amount <= 0) return;
  await db.expense.create({
    data: { periodId: period.id, ...cat, description: str(form, "description") || "-", amount },
  });
  await recarryBalances(period.year, period.month);
  refresh();
}

// Returns an error message for the sheet to show, or undefined on success.
export async function updateExpense(form: FormData) {
  await requireAdmin();
  const cat = expenseCategory(form);
  if ("error" in cat) return cat.error;
  const amount = parseAmount(form.get("amount"));
  if (amount <= 0) return "Isi jumlah lebih dari 0.";
  const row = await db.expense.update({
    where: { id: str(form, "id") },
    data: { ...cat, description: str(form, "description") || "-", amount },
    include: { period: true },
  });
  await recarryBalances(row.period.year, row.period.month);
  refresh();
}

export async function deleteExpense(form: FormData) {
  await requireAdmin();
  const row = await db.expense.delete({ where: { id: str(form, "id") }, include: { period: true } });
  await recarryBalances(row.period.year, row.period.month);
  refresh();
}

// Ticking a transfer as sent records it as an expense of that month (caretaker fee or the heirs'
// profit share); unticking removes that expense again.
export async function toggleTransfer(form: FormData) {
  await requireAdmin();
  const check = await db.transferCheck.findUniqueOrThrow({
    where: { id: str(form, "id") },
    include: { recipient: true, period: true, expense: true },
  });
  const sending = !check.isSent;
  const amount = check.amount ?? check.recipient.monthlyAmount ?? 0;
  await db.$transaction(async (tx) => {
    await tx.transferCheck.update({
      where: { id: check.id },
      data: { isSent: sending, sentAt: sending ? new Date() : null },
    });
    if (!sending && check.expense) await tx.expense.delete({ where: { id: check.expense.id } });
    if (sending && !check.expense && amount > 0) {
      await tx.expense.create({ data: { periodId: check.periodId, transferCheckId: check.id, amount, ...transferExpense(check.recipient) } });
    }
  });
  await recarryBalances(check.period.year, check.period.month);
  refresh();
}

function transferExpense(r: { name: string; role: string | null }) {
  const role = r.role ?? "";
  // The caretaker is named by role only: the report goes to the family group.
  if (/pengurus|caretaker/i.test(role)) return { category: "PENGURUS" as const, categoryLabel: null, description: "Transfer ke pengurus" };
  if (/pewaris|heir/i.test(role)) return { category: "BAGI_HASIL" as const, categoryLabel: null, description: `Transfer ke ${r.name}` };
  return { category: "LAINNYA" as const, categoryLabel: role || "Transfer", description: `Transfer ke ${r.name}` };
}

// ---------- Reminders (bills, repairs, admin) ----------

// A category makes the reminder a bill: Paid records the expense, using the fixed amount or,
// when the bill changes every month (electricity, water), the amount typed in at payment.
function reminderData(form: FormData) {
  const repeat = str(form, "repeat") as Repeat;
  const amount = parseAmount(form.get("amount"));
  const category = str(form, "category") as ExpenseCategory;
  const remindBefore = Number(str(form, "remindBefore"));
  return {
    title: str(form, "title"),
    tag: optStr(form, "tag"),
    roomId: optStr(form, "roomId"),
    dueDate: optDate(form, "dueDate"),
    repeat: REPEAT_OPTIONS.includes(repeat) ? repeat : "NONE",
    remindBefore: REMIND_OPTIONS.includes(remindBefore) ? remindBefore : 1,
    amount: amount > 0 ? amount : null,
    category: CATEGORY_OPTIONS.includes(category) ? category : amount > 0 ? "LAINNYA" : null,
  } as const;
}

function reminderError(data: ReturnType<typeof reminderData>) {
  if (!data.title) return "Isi apa yang perlu diingat.";
  if (data.dueDate && Number.isNaN(data.dueDate.getTime())) return "Pilih tanggal yang benar.";
  if (data.repeat !== "NONE" && !data.dueDate) return "Pengingat berulang butuh tanggal mulai.";
}

// These return an error message for the sheet to show, or undefined on success.
export async function addReminder(form: FormData) {
  await requireAdmin();
  const data = reminderData(form);
  const error = reminderError(data);
  if (error) return error;
  await db.reminder.create({ data });
  refresh();
}

export async function updateReminder(form: FormData) {
  await requireAdmin();
  const data = reminderData(form);
  const error = reminderError(data);
  if (error) return error;
  await db.reminder.update({ where: { id: str(form, "id") }, data });
  refresh();
}

// Done (or Paid, for a bill). A bill records its expense in this month's cash book first: its fixed
// amount, or the amount typed in when paying. A repeating reminder then moves on to its next date,
// a one-off one is ticked off.
export async function completeReminder(_prev: string | null | undefined, form: FormData) {
  await requireAdmin();
  const r = await db.reminder.findUniqueOrThrow({ where: { id: str(form, "id") } });
  const paid = r.amount ?? (parseAmount(form.get("amount")) || null);
  if (paid) {
    const today = todayJakarta();
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth() + 1;
    const period = await db.cashPeriod.findUnique({ where: { year_month: { year, month } } });
    if (!period) return `Mulai buku kas ${periodLabel(year, month)} dulu.`;
    const category = r.category ?? "LAINNYA";
    await db.expense.create({
      data: {
        periodId: period.id, category, categoryLabel: category === "LAINNYA" ? r.title : null, amount: paid,
        description: r.dueDate ? `${r.title} · jatuh tempo ${formatDate(r.dueDate)}` : r.title,
      },
    });
    await recarryBalances(year, month);
  }
  if (r.repeat !== "NONE" && r.dueDate) {
    await db.reminder.update({ where: { id: r.id }, data: { dueDate: nextDueDate(r.dueDate, r.repeat), doneAt: new Date() } });
  } else {
    await db.reminder.update({ where: { id: r.id }, data: { isDone: true, doneAt: new Date() } });
  }
  refresh();
}

export async function reopenReminder(form: FormData) {
  await requireAdmin();
  await db.reminder.update({ where: { id: str(form, "id") }, data: { isDone: false, doneAt: null } });
  refresh();
}

export async function deleteReminder(form: FormData) {
  await requireAdmin();
  await db.reminder.delete({ where: { id: str(form, "id") } });
  refresh();
}

// ---------- Recipients (Pengaturan) ----------

export async function addRecipient(form: FormData) {
  await requireAdmin();
  const name = str(form, "name");
  if (!name) return;
  const r = await db.recipient.create({
    data: {
      name, role: optStr(form, "role"), bankName: optStr(form, "bankName"), accountNumber: optAccount(form),
      accountHolder: optStr(form, "accountHolder"), monthlyAmount: optAmount(form),
    },
  });
  await ensureTransferCheck(r.id);
  refresh();
}

export async function updateRecipientBank(form: FormData) {
  await requireAdmin();
  await db.recipient.update({
    where: { id: str(form, "id") },
    data: { bankName: optStr(form, "bankName"), accountNumber: optAccount(form), accountHolder: optStr(form, "accountHolder"), monthlyAmount: optAmount(form) },
  });
  refresh();
}

export async function toggleRecipient(form: FormData) {
  await requireAdmin();
  const r = await db.recipient.findUniqueOrThrow({ where: { id: str(form, "id") } });
  await db.recipient.update({ where: { id: r.id }, data: { isActive: !r.isActive } });
  if (!r.isActive) await ensureTransferCheck(r.id);
  refresh();
}

async function ensureTransferCheck(recipientId: string) {
  const latest = await db.cashPeriod.findFirst({ orderBy: [{ year: "desc" }, { month: "desc" }] });
  if (!latest) return;
  await db.transferCheck.upsert({
    where: { periodId_recipientId: { periodId: latest.id, recipientId } },
    create: { periodId: latest.id, recipientId },
    update: {},
  });
}

// ---------- Reminder push alerts ----------

export async function subscribePush(sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  await requireAdmin();
  if (!sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) throw new Error("Invalid subscription");
  const data = { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth };
  await db.pushSubscription.upsert({ where: { endpoint: sub.endpoint }, create: data, update: data });
}

export async function unsubscribePush(endpoint: string) {
  await requireAdmin();
  await db.pushSubscription.deleteMany({ where: { endpoint } });
}

export async function sendTestPush() {
  await requireAdmin();
  const due = await dueReminders();
  return sendPushToAll({
    title: "Peringatan pengingat menyala",
    body: due.length
      ? `${due.length} pengingat jatuh tempo sekarang. Ketuk untuk membukanya.`
      : "Kamu akan menerima peringatan di sini jam 09.00 saat sewa atau pengingat segera jatuh tempo, jatuh tempo hari ini, atau telat.",
    url: "/pengingat",
  });
}

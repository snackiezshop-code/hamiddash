"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { SESSION_COOKIE, SESSION_DAYS, createToken, timingSafeEqual } from "@/lib/session";
import { createPeriod, isLatestPeriod, recarryBalances } from "@/lib/cashbook";
import { CATEGORY_OPTIONS, STATUS_OPTIONS, parseAmount, periodSlug } from "@/lib/format";
import type { ExpenseCategory, RoomStatus } from "@/generated/prisma/enums";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const optStr = (f: FormData, k: string) => str(f, k) || null;
const optDate = (f: FormData, k: string) => (str(f, k) ? new Date(str(f, k)) : null);
const optAccount = (f: FormData) => str(f, "accountNumber").replace(/\s/g, "") || null;
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
  if (!expected) return "ADMIN_PASSWORD is not set in .env";
  if (!timingSafeEqual(str(form, "password"), expected)) return "Wrong password";
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
  if (!name) return "Enter the tenant's name.";
  const room = await db.room.findUnique({ where: { id: roomId }, include: { tenant: true } });
  if (!room) return "That room no longer exists.";
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

export async function addExpense(form: FormData) {
  await requireAdmin();
  const period = await periodOf(str(form, "periodId"));
  const category = str(form, "category") as ExpenseCategory;
  if (!CATEGORY_OPTIONS.includes(category)) throw new Error("Invalid category");
  const amount = parseAmount(form.get("amount"));
  if (amount <= 0) return;
  await db.expense.create({
    data: { periodId: period.id, category, description: str(form, "description") || "-", amount },
  });
  await recarryBalances(period.year, period.month);
  refresh();
}

export async function deleteExpense(form: FormData) {
  await requireAdmin();
  const row = await db.expense.delete({ where: { id: str(form, "id") }, include: { period: true } });
  await recarryBalances(row.period.year, row.period.month);
  refresh();
}

export async function toggleTransfer(form: FormData) {
  await requireAdmin();
  const check = await db.transferCheck.findUniqueOrThrow({ where: { id: str(form, "id") } });
  await db.transferCheck.update({
    where: { id: check.id },
    data: { isSent: !check.isSent, sentAt: check.isSent ? null : new Date() },
  });
  refresh();
}

// ---------- Checklist ----------

export async function addChecklistItem(form: FormData) {
  await requireAdmin();
  const title = str(form, "title");
  if (!title) return;
  await db.checklistItem.create({
    data: {
      title,
      category: optStr(form, "category"),
      dueDate: optDate(form, "dueDate"),
      roomId: optStr(form, "roomId"),
    },
  });
  refresh();
}

export async function toggleChecklistItem(form: FormData) {
  await requireAdmin();
  const item = await db.checklistItem.findUniqueOrThrow({ where: { id: str(form, "id") } });
  await db.checklistItem.update({
    where: { id: item.id },
    data: { isDone: !item.isDone, completedAt: item.isDone ? null : new Date() },
  });
  refresh();
}

export async function deleteChecklistItem(form: FormData) {
  await requireAdmin();
  await db.checklistItem.delete({ where: { id: str(form, "id") } });
  refresh();
}

// ---------- Recipients (Pengaturan) ----------

export async function addRecipient(form: FormData) {
  await requireAdmin();
  const name = str(form, "name");
  if (!name) return;
  const r = await db.recipient.create({
    data: { name, role: optStr(form, "role"), bankName: optStr(form, "bankName"), accountNumber: optAccount(form), accountHolder: optStr(form, "accountHolder") },
  });
  await ensureTransferCheck(r.id);
  refresh();
}

export async function updateRecipientBank(form: FormData) {
  await requireAdmin();
  await db.recipient.update({
    where: { id: str(form, "id") },
    data: { bankName: optStr(form, "bankName"), accountNumber: optAccount(form), accountHolder: optStr(form, "accountHolder") },
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

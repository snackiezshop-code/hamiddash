import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { periodSlug, todayJakarta } from "@/lib/format";
import { ensureCurrentPeriod } from "@/lib/cashbook";

export default async function CashIndexPage() {
  await ensureCurrentPeriod();
  const latest = await db.cashPeriod.findFirst({ orderBy: [{ year: "desc" }, { month: "desc" }] });
  const now = todayJakarta();
  redirect(`/kas/${latest ? periodSlug(latest.year, latest.month) : periodSlug(now.getUTCFullYear(), now.getUTCMonth() + 1)}`);
}

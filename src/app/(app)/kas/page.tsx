import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { periodSlug } from "@/lib/format";

export default async function CashIndexPage() {
  const latest = await db.cashPeriod.findFirst({ orderBy: [{ year: "desc" }, { month: "desc" }] });
  const now = new Date();
  redirect(`/kas/${latest ? periodSlug(latest.year, latest.month) : periodSlug(now.getFullYear(), now.getMonth() + 1)}`);
}

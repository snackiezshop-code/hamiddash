import { renderToBuffer } from "@react-pdf/renderer";
import { requireAdmin } from "@/lib/auth";
import { getPeriod, summarize } from "@/lib/cashbook";
import { parsePeriodSlug } from "@/lib/format";
import { MonthlyReport, bulanLabel } from "@/lib/report-pdf";

export async function GET(_req: Request, ctx: RouteContext<"/kas/[period]/report">) {
  await requireAdmin();
  const { period: slug } = await ctx.params;
  const ym = parsePeriodSlug(slug);
  const period = ym && (await getPeriod(ym.year, ym.month));
  if (!period) return new Response("Period not found", { status: 404 });

  const pdf = await renderToBuffer(MonthlyReport({ period, summary: summarize(period) }));
  const filename = `Laporan Bulanan Kost Mujair 12 - ${bulanLabel(period.year, period.month).toUpperCase()}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

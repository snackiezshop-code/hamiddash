import "server-only";
import path from "node:path";
import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ExpenseCategory, RoomStatus } from "@/generated/prisma/enums";
import type { getPeriod, summarize } from "./cashbook";
import { CATEGORY_LABEL, shiftMonth, todayJakarta } from "./format";

// Monthly report for the family (it gets forwarded to the heirs' group), in Indonesian. The layout
// follows the original "Laporan Bulanan Kost Mujair 12" sheet: totals on top, every room's rent on
// the left, expenses and the cash-flow summary on the right. The look follows the app (Panel):
// outlined boxes with a hard shadow edge, navy headers, orange for what's unpaid, Space Grotesk.
// Tenants appear by room number only, never by name.

const FONT_DIR = path.join(process.cwd(), "src/assets/fonts");
Font.register({
  family: "Space Grotesk",
  fonts: [
    { src: path.join(FONT_DIR, "SpaceGrotesk-Regular.woff"), fontWeight: 400 },
    { src: path.join(FONT_DIR, "SpaceGrotesk-SemiBold.woff"), fontWeight: 600 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const STATUS_ID: Record<RoomStatus, string> = {
  LUNAS: "Lunas", TUNDA_BAYAR: "Belum bayar", KOSONG: "Kosong", RUSAK: "Rusak", TAHUNAN: "Tahunan",
};
const KATEGORI_ID: Record<ExpenseCategory, string> = {
  LISTRIK: "Listrik", PDAM: "PDAM", CLEANING_SERVICE: "Cleaning service", KEBERSIHAN: "Kebersihan",
  PERBAIKAN: "Perbaikan", INTERNET: "Internet", PERLENGKAPAN: "Perlengkapan", ADMINISTRASI: "Administrasi",
  PENGURUS: "Pengurus", BAGI_HASIL: "Bagi hasil", LAINNYA: "Lainnya",
};

export const bulanLabel = (year: number, month: number) => `${BULAN[month - 1]} ${year}`;
const tanggal = (d: Date) => `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const rp = (n: number) => `${n < 0 ? "-" : ""}Rp${Math.abs(n).toLocaleString("id-ID")}`;
const rpOrDash = (n: number) => (n ? rp(n) : "-");
type ExpenseLike = { category: ExpenseCategory; categoryLabel: string | null; description: string };
const kategori = (e: Omit<ExpenseLike, "description">) =>
  e.category === "LAINNYA" && e.categoryLabel ? e.categoryLabel : KATEGORI_ID[e.category];
// What the money was for; empty when the description only repeats the category ("Listrik" under Listrik).
const keterangan = (e: ExpenseLike) => {
  const d = e.description.trim();
  return ["", "-", kategori(e).toLowerCase(), CATEGORY_LABEL[e.category].toLowerCase()].includes(d.toLowerCase()) ? "" : d;
};

// The app's Panel palette.
const C = {
  paper: "#FAF8F3",
  cream: "#F1EDE5",
  ink: "#14171C",
  soft: "#55524B",
  line: "#CBC5BA",
  navy: "#1C2A3A",
  orange: "#D9390F",
  orangeText: "#B8300C",
  blush: "#F7DED3",
  mint: "#DDE4EC",
};

const s = StyleSheet.create({
  page: { paddingTop: 30, paddingBottom: 44, paddingHorizontal: 28, fontSize: 7.6, fontFamily: "Space Grotesk", color: C.ink, backgroundColor: C.paper, lineHeight: 1.3 },
  eyebrow: { fontSize: 6.6, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: C.soft },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1.5, borderColor: C.ink, paddingBottom: 9 },
  title: { fontSize: 20, fontWeight: 600, letterSpacing: -0.4, marginTop: 4, lineHeight: 1.2 },
  // A box with the app's hard shadow: a thicker right and bottom edge.
  box: { borderWidth: 1.2, borderRightWidth: 3, borderBottomWidth: 3, borderColor: C.ink, borderRadius: 2.5, backgroundColor: C.paper },
  kpiRow: { flexDirection: "row", gap: 7, marginTop: 12 },
  kpi: { flex: 1, paddingVertical: 7, paddingHorizontal: 8 },
  kpiValue: { fontSize: 12.5, fontWeight: 600, letterSpacing: -0.3, marginTop: 4 },
  cols: { flexDirection: "row", gap: 9, marginTop: 12, alignItems: "flex-start" },
  section: { marginBottom: 10 },
  sectionTitle: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 1.2, borderColor: C.ink },
  headRow: { flexDirection: "row", backgroundColor: C.navy, color: "#FFFFFF" },
  head: { fontSize: 6.4, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", paddingVertical: 4, paddingHorizontal: 4 },
  row: { flexDirection: "row", alignItems: "center", borderBottomWidth: 0.5, borderColor: C.line, minHeight: 14.5 },
  cell: { paddingVertical: 2.6, paddingHorizontal: 4 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, paddingHorizontal: 6, borderTopWidth: 1.2, borderColor: C.ink, fontWeight: 600 },
  right: { textAlign: "right" },
  center: { textAlign: "center" },
  bold: { fontWeight: 600 },
  muted: { color: C.soft },
  chip: { fontSize: 6.2, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", borderWidth: 0.9, borderRadius: 1.5, paddingTop: 1.6, paddingBottom: 0.8, paddingHorizontal: 3, lineHeight: 1, alignSelf: "center" },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 0.5, borderColor: C.line },
  footer: { position: "absolute", bottom: 18, left: 28, right: 28, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderColor: C.line, paddingTop: 5 },
  footerText: { fontSize: 6.6, color: C.soft },
});

type Period = NonNullable<Awaited<ReturnType<typeof getPeriod>>>;
type Summary = ReturnType<typeof summarize>;
type Props = { period: Period; summary: Summary };

function chipStyle(status: RoomStatus) {
  if (status === "LUNAS") return { color: C.navy, borderColor: C.navy, backgroundColor: C.mint };
  if (status === "TUNDA_BAYAR") return { color: C.orangeText, borderColor: C.orangeText, backgroundColor: C.blush };
  if (status === "TAHUNAN") return { color: C.navy, borderColor: C.navy, backgroundColor: C.paper };
  return { color: C.soft, borderColor: C.soft, backgroundColor: C.cream };
}

function SectionTitle({ title, note }: { title: string; note?: string }) {
  return (
    <View style={s.sectionTitle}>
      <Text style={s.eyebrow}>{title}</Text>
      {note ? <Text style={[s.eyebrow, { color: C.ink }]}>{note}</Text> : null}
    </View>
  );
}

export function MonthlyReport({ period, summary }: Props) {
  const bulan = BULAN[period.month - 1];
  const prev = shiftMonth(period.year, period.month, -1);
  const rooms = period.roomIncomes;
  const monthly = rooms.filter((r) => r.status !== "TAHUNAN" && r.status !== "KOSONG" && r.status !== "RUSAK");
  const paid = monthly.filter((r) => r.status === "LUNAS").length;

  const kpis = [
    { label: "Saldo kas awal", value: summary.openingBalance },
    { label: `Pemasukan ${bulan}`, value: summary.incomeTotal },
    { label: `Pengeluaran ${bulan}`, value: summary.expenseTotal },
  ];

  const summaryRows: [string, number, boolean][] = [
    ["Total sewa kamar", summary.roomTotal, false],
    ["Pemasukan tambahan", summary.additionalTotal, false],
    [`Total pemasukan ${bulan}`, summary.incomeTotal, true],
    [`Total pengeluaran ${bulan}`, -summary.expenseTotal, false],
    [`Arus kas bersih ${bulan}`, summary.netFlow, true],
    ["Saldo kas awal", summary.openingBalance, false],
  ];

  return (
    <Document title={`Laporan Bulanan Kost Mujair 12 - ${bulan.toUpperCase()} ${period.year}`} author="HamidKost">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.eyebrow}>Laporan arus kas · Kost Mujair 12</Text>
            <Text style={s.title}>{bulan} {period.year}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1 }}>HAMIDKOST</Text>
            <Text style={[s.muted, { fontSize: 6.8, marginTop: 2 }]}>Dibuat {tanggal(todayJakarta())}</Text>
          </View>
        </View>

        <View style={s.kpiRow}>
          {kpis.map((k) => (
            <View key={k.label} style={[s.box, s.kpi]}>
              <Text style={s.eyebrow}>{k.label}</Text>
              <Text style={s.kpiValue}>{rp(k.value)}</Text>
            </View>
          ))}
          <View style={[s.box, s.kpi, { backgroundColor: C.navy }]}>
            <Text style={[s.eyebrow, { color: "#FFFFFF" }]}>Saldo kas akhir</Text>
            <Text style={[s.kpiValue, { color: "#FFFFFF" }]}>{rp(summary.closingBalance)}</Text>
          </View>
        </View>

        <View style={s.cols}>
          {/* Left: every room, then other income with the opening balance. */}
          <View style={{ flex: 1 }}>
            <View style={[s.box, s.section]}>
              <SectionTitle title="Pemasukan sewa kamar" note={`${paid}/${monthly.length} lunas`} />
              <View style={s.headRow}>
                <Text style={[s.head, s.center, { width: 18 }]}>No</Text>
                <Text style={[s.head, { flex: 1 }]}>Kamar</Text>
                <Text style={[s.head, s.center, { width: 58 }]}>Status</Text>
                <Text style={[s.head, s.right, { width: 60 }]}>Harga sewa</Text>
                <Text style={[s.head, s.right, { width: 60 }]}>Diterima</Text>
              </View>
              {rooms.map((r, i) => {
                const yearly = r.status === "TAHUNAN";
                const price = yearly ? r.room.annualRent ?? 0 : r.room.monthlyRent;
                return (
                  <View key={r.id} style={s.row} wrap={false}>
                    <Text style={[s.cell, s.center, s.muted, { width: 18 }]}>{i + 1}</Text>
                    <Text style={[s.cell, { flex: 1 }]}>Kamar {r.room.number}</Text>
                    <View style={{ width: 58 }}><Text style={[s.chip, chipStyle(r.status)]}>{STATUS_ID[r.status]}</Text></View>
                    <Text style={[s.cell, s.right, s.muted, { width: 60 }]}>{price ? `${rp(price)}${yearly ? "/th" : ""}` : "-"}</Text>
                    <Text style={[s.cell, s.right, { width: 60 }, r.status === "TUNDA_BAYAR" ? { color: C.orangeText } : {}]}>
                      {yearly ? "-" : rpOrDash(r.amount)}
                    </Text>
                  </View>
                );
              })}
              {rooms.some((r) => r.status === "TAHUNAN") && (
                <Text style={[s.cell, s.muted, { fontSize: 6.6, paddingHorizontal: 6 }]}>
                  Kamar tahunan dibayar sekali setahun; pembayarannya tercatat di Pemasukan tambahan pada bulan dibayar.
                </Text>
              )}
              <View style={s.totalRow}>
                <Text>Total sewa kamar</Text>
                <Text>{rp(summary.roomTotal)}</Text>
              </View>
            </View>

            <View style={[s.box, s.section]}>
              <SectionTitle title="Pemasukan tambahan & saldo awal" />
              <View style={s.headRow}>
                <Text style={[s.head, s.center, { width: 18 }]}>No</Text>
                <Text style={[s.head, { flex: 1 }]}>Keterangan</Text>
                <Text style={[s.head, s.right, { width: 66 }]}>Nominal</Text>
              </View>
              <View style={s.row} wrap={false}>
                <Text style={[s.cell, s.center, s.muted, { width: 18 }]}>—</Text>
                <Text style={[s.cell, s.bold, { flex: 1 }]}>Saldo kas awal (saldo akhir {bulanLabel(prev.year, prev.month)})</Text>
                <Text style={[s.cell, s.right, s.bold, { width: 66 }]}>{rp(summary.openingBalance)}</Text>
              </View>
              {period.additionalIncomes.length === 0 ? (
                <View style={s.row}><Text style={[s.cell, s.muted]}>Tidak ada pemasukan tambahan.</Text></View>
              ) : period.additionalIncomes.map((a, i) => (
                <View key={a.id} style={s.row} wrap={false}>
                  <Text style={[s.cell, s.center, s.muted, { width: 18 }]}>{i + 1}</Text>
                  <Text style={[s.cell, { flex: 1 }]}>{a.description}{a.source ? ` (${a.source})` : ""}</Text>
                  <Text style={[s.cell, s.right, { width: 66 }]}>{rp(a.amount)}</Text>
                </View>
              ))}
              <View style={s.totalRow}>
                <Text>Total pemasukan tambahan</Text>
                <Text>{rp(summary.additionalTotal)}</Text>
              </View>
            </View>
          </View>

          {/* Right: expenses, then the cash-flow summary. */}
          <View style={{ flex: 1.08 }}>
            <View style={[s.box, s.section]}>
              <SectionTitle title="Pengeluaran operasional" note={`${period.expenses.length} transaksi`} />
              <View style={s.headRow}>
                <Text style={[s.head, s.center, { width: 18 }]}>No</Text>
                <Text style={[s.head, { width: 74 }]}>Kategori</Text>
                <Text style={[s.head, { flex: 1 }]}>Keterangan</Text>
                <Text style={[s.head, s.right, { width: 62 }]}>Nominal</Text>
              </View>
              {period.expenses.length === 0 ? (
                <View style={s.row}><Text style={[s.cell, s.muted]}>Tidak ada pengeluaran.</Text></View>
              ) : period.expenses.map((e, i) => (
                <View key={e.id} style={s.row} wrap={false}>
                  <Text style={[s.cell, s.center, s.muted, { width: 18 }]}>{i + 1}</Text>
                  <Text style={[s.cell, { width: 74 }]}>{kategori(e)}</Text>
                  <Text style={[s.cell, s.muted, { flex: 1 }]}>{keterangan(e)}</Text>
                  <Text style={[s.cell, s.right, { width: 62 }]}>{rp(e.amount)}</Text>
                </View>
              ))}
              <View style={s.totalRow}>
                <Text>Total pengeluaran</Text>
                <Text>{rp(summary.expenseTotal)}</Text>
              </View>
            </View>

            <View style={[s.box, s.section]}>
              <SectionTitle title="Ringkasan arus kas" />
              {summaryRows.map(([label, value, strong]) => (
                <View key={label} style={s.sumRow}>
                  <Text style={strong ? s.bold : {}}>{label}</Text>
                  <Text style={[s.bold, value < 0 ? { color: C.orangeText } : {}]}>{rp(value)}</Text>
                </View>
              ))}
              <View style={[s.sumRow, { backgroundColor: C.navy, color: "#FFFFFF", borderBottomWidth: 0, paddingVertical: 6 }]}>
                <Text style={s.bold}>Saldo kas akhir</Text>
                <Text style={[s.bold, { fontSize: 9 }]}>{rp(summary.closingBalance)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>HamidKost · Laporan bulanan Kost Mujair 12 · {bulan} {period.year}</Text>
          <Text style={s.footerText}>Dibuat dari aplikasi HamidKost</Text>
        </View>
      </Page>
    </Document>
  );
}

import "server-only";
import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ExpenseCategory, RoomStatus } from "@/generated/prisma/enums";
import type { getPeriod, summarize } from "./cashbook";
import { CATEGORY_LABEL, shiftMonth } from "./format";

Font.registerHyphenationCallback((word) => [word]);

// Mirrors "Laporan Bulanan Kost Mujair 12" (the Google Sheets report), so labels stay in Indonesian.
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const STATUS_ID: Record<RoomStatus, string> = {
  LUNAS: "Lunas", TUNDA_BAYAR: "Tunda Bayar", KOSONG: "Kosong", RUSAK: "Rusak", TAHUNAN: "Tahunan",
};
const KATEGORI_ID: Record<ExpenseCategory, string> = {
  LISTRIK: "Listrik", PDAM: "PDAM", CLEANING_SERVICE: "Cleaning Service", KEBERSIHAN: "Kebersihan",
  PERBAIKAN: "Perbaikan", INTERNET: "Internet", PERLENGKAPAN: "Perlengkapan", ADMINISTRASI: "Administrasi",
  PENGURUS: "Pengurus", BAGI_HASIL: "Bagi Hasil", LAINNYA: "Lainnya",
};

export const bulanLabel = (year: number, month: number) => `${BULAN[month - 1]} ${year}`;
// Hide descriptions that only repeat the category (e.g. "Listrik" under Listrik).
const keterangan = (c: ExpenseCategory, d: string) =>
  [ "-", KATEGORI_ID[c].toLowerCase(), CATEGORY_LABEL[c].toLowerCase()].includes(d.trim().toLowerCase()) ? "" : d;
// Dot thousands separators, same as the app (rupiah() in format.ts).
const rp = (n: number) => (n ? `Rp${n.toLocaleString("id-ID")}` : "-");

const C = {
  navy: "#1F3B57",
  navySoft: "#DCE6F0",
  paleBlue: "#EAF1F8",
  line: "#C9D4DF",
  cell: "#FFF6DA",
  green: "#2E7D4F",
  greenSoft: "#E6F2E8",
  red: "#B23A2E",
  redSoft: "#FBEDEA",
  ink: "#1B1B1B",
};

const s = StyleSheet.create({
  page: { paddingVertical: 36, paddingHorizontal: 32, fontSize: 7.5, fontFamily: "Helvetica", color: C.ink },
  title: { backgroundColor: C.navy, color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 12, textAlign: "center", paddingVertical: 7 },
  subtitle: { backgroundColor: C.paleBlue, color: C.navy, fontFamily: "Helvetica-Bold", fontSize: 7, textAlign: "center", paddingVertical: 4 },
  kpiRow: { flexDirection: "row", marginTop: 12, borderWidth: 1, borderColor: C.line },
  kpi: { flex: 1, borderRightWidth: 1, borderColor: C.line },
  kpiLabel: { fontFamily: "Helvetica-Bold", fontSize: 7, textAlign: "center", paddingVertical: 3 },
  kpiValue: { fontFamily: "Helvetica-Bold", fontSize: 11, textAlign: "center", paddingVertical: 5 },
  cols: { flexDirection: "row", marginTop: 12, gap: 2 },
  col: { flex: 1 },
  sectionTitle: { backgroundColor: C.navySoft, color: C.navy, fontFamily: "Helvetica-Bold", fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 3 },
  headRow: { flexDirection: "row", backgroundColor: C.navy },
  head: { color: "#fff", fontFamily: "Helvetica-Bold", paddingVertical: 4, paddingHorizontal: 3, textAlign: "center" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: C.line, minHeight: 15, alignItems: "center" },
  cell: { paddingVertical: 3, paddingHorizontal: 3 },
  input: { backgroundColor: C.cell, alignSelf: "stretch", justifyContent: "center" },
  right: { textAlign: "right" },
  center: { textAlign: "center" },
  bold: { fontFamily: "Helvetica-Bold" },
  sumRow: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderColor: C.line, paddingVertical: 3.5, paddingHorizontal: 3 },
});

type Period = NonNullable<Awaited<ReturnType<typeof getPeriod>>>;
type Summary = ReturnType<typeof summarize>;

export function MonthlyReport({ period, summary }: { period: Period; summary: Summary }) {
  const bulan = BULAN[period.month - 1];
  const BULAN_UP = bulan.toUpperCase();
  const prev = shiftMonth(period.year, period.month, -1);

  const kpis = [
    { label: "SALDO KAS AWAL", value: summary.openingBalance, bg: C.paleBlue, color: C.navy, valueColor: C.ink },
    { label: `PEMASUKAN ${BULAN_UP}`, value: summary.incomeTotal, bg: C.greenSoft, color: C.green, valueColor: C.ink },
    { label: `PENGELUARAN ${BULAN_UP}`, value: summary.expenseTotal, bg: C.redSoft, color: C.red, valueColor: C.ink },
    { label: "SALDO KAS AKHIR", value: summary.closingBalance, bg: C.greenSoft, color: C.green, valueColor: C.green },
  ];

  const summaryRows: [string, number, boolean][] = [
    ["Total Sewa Kamar", summary.roomTotal, false],
    ["Pemasukan Tambahan", summary.additionalTotal, false],
    [`Total Pemasukan ${bulan}`, summary.incomeTotal, true],
    [`Total Pengeluaran ${bulan}`, summary.expenseTotal, false],
    [`Arus Kas Bersih ${bulan}`, summary.netFlow, true],
    ["Saldo Kas Awal", summary.openingBalance, false],
  ];

  return (
    <Document title={`Laporan Bulanan Kost Mujair 12 - ${BULAN_UP} ${period.year}`} author="Hamid">
      <Page size="A4" style={s.page}>
        <Text style={s.title}>LAPORAN ARUS KAS KOST MUJAIR 12</Text>
        <Text style={s.subtitle}>PERIODE {BULAN_UP} {period.year}</Text>

        <View style={s.kpiRow}>
          {kpis.map((k, i) => (
            <View key={k.label} style={[s.kpi, i === kpis.length - 1 ? { borderRightWidth: 0 } : {}]}>
              <Text style={[s.kpiLabel, { backgroundColor: k.bg, color: k.color }]}>{k.label}</Text>
              <Text style={[s.kpiValue, { color: k.valueColor }]}>{rp(k.value)}</Text>
            </View>
          ))}
        </View>

        <View style={s.cols}>
          <View style={s.col}>
            <Text style={s.sectionTitle}>PEMASUKAN SEWA KAMAR</Text>
            <View style={s.headRow}>
              <Text style={[s.head, { width: 24 }]}>No.</Text>
              <Text style={[s.head, { flex: 1.3 }]}>Unit / Kamar</Text>
              <Text style={[s.head, { flex: 1.2 }]}>Status</Text>
              <Text style={[s.head, { flex: 1.2 }]}>Nominal (Rp)</Text>
            </View>
            {period.roomIncomes.map((r, i) => (
              <View key={r.id} style={s.row}>
                <Text style={[s.cell, s.center, { width: 24 }]}>{i + 1}</Text>
                <Text style={[s.cell, { flex: 1.3 }]}>Kamar {r.room.number}</Text>
                <View style={[s.input, { flex: 1.2 }]}><Text style={[s.cell, s.center]}>{STATUS_ID[r.status]}</Text></View>
                <View style={[s.input, { flex: 1.2 }]}><Text style={[s.cell, s.right]}>{rp(r.amount)}</Text></View>
              </View>
            ))}

            <Text style={[s.sectionTitle, { marginTop: 12 }]}>PEMASUKAN TAMBAHAN &amp; SALDO AWAL</Text>
            <View style={s.headRow}>
              <Text style={[s.head, { width: 24 }]}>No.</Text>
              <Text style={[s.head, { flex: 1.3 }]}>Keterangan</Text>
              <Text style={[s.head, { flex: 1.2 }]}>Sumber</Text>
              <Text style={[s.head, { flex: 1.2 }]}>Nominal (Rp)</Text>
            </View>
            <View style={s.row}>
              <Text style={[s.cell, s.center, s.bold, { width: 24 }]}>—</Text>
              <Text style={[s.cell, s.bold, { flex: 1.3 }]}>Saldo Kas Awal</Text>
              <Text style={[s.cell, s.bold, { flex: 1.2 }]}>Saldo akhir {bulanLabel(prev.year, prev.month)}</Text>
              <Text style={[s.cell, s.bold, s.right, { flex: 1.2 }]}>{rp(summary.openingBalance)}</Text>
            </View>
            {period.additionalIncomes.length === 0 ? (
              <View style={s.row}><Text style={[s.cell, { color: "#777" }]}>Tidak ada pemasukan tambahan</Text></View>
            ) : period.additionalIncomes.map((a, i) => (
              <View key={a.id} style={s.row}>
                <Text style={[s.cell, s.center, { width: 24 }]}>{i + 1}</Text>
                <View style={[s.input, { flex: 1.3 }]}><Text style={s.cell}>{a.description}</Text></View>
                <View style={[s.input, { flex: 1.2 }]}><Text style={s.cell}>{a.source ?? ""}</Text></View>
                <View style={[s.input, { flex: 1.2 }]}><Text style={[s.cell, s.right]}>{rp(a.amount)}</Text></View>
              </View>
            ))}
            <View style={[s.sumRow, { backgroundColor: C.greenSoft }]}>
              <Text style={s.bold}>TOTAL PEMASUKAN TAMBAHAN</Text>
              <Text style={s.bold}>{rp(summary.additionalTotal)}</Text>
            </View>
          </View>

          <View style={[s.col, { flex: 1.35 }]}>
            <Text style={s.sectionTitle}>PENGELUARAN OPERASIONAL</Text>
            <View style={s.headRow}>
              <Text style={[s.head, { width: 24 }]}>No.</Text>
              <Text style={[s.head, { flex: 1.1 }]}>Kategori</Text>
              <Text style={[s.head, { flex: 1.5 }]}>Keterangan</Text>
              <Text style={[s.head, { flex: 1 }]}>Nominal (Rp)</Text>
            </View>
            {period.expenses.length === 0 ? (
              <View style={s.row}><Text style={[s.cell, { color: "#777" }]}>Tidak ada pengeluaran</Text></View>
            ) : period.expenses.map((e, i) => (
              <View key={e.id} style={s.row}>
                <Text style={[s.cell, s.center, { width: 24 }]}>{i + 1}</Text>
                <Text style={[s.cell, { flex: 1.1 }]}>{KATEGORI_ID[e.category]}</Text>
                <View style={[s.input, { flex: 1.5 }]}><Text style={s.cell}>{keterangan(e.category, e.description)}</Text></View>
                <View style={[s.input, { flex: 1 }]}><Text style={[s.cell, s.right]}>{rp(e.amount)}</Text></View>
              </View>
            ))}

            <Text style={[s.sectionTitle, { marginTop: 12 }]}>RINGKASAN ARUS KAS</Text>
            {summaryRows.map(([label, value, strong]) => (
              <View key={label} style={s.sumRow}>
                <Text style={strong ? s.bold : {}}>{label}</Text>
                <Text style={s.bold}>{value < 0 ? `-${rp(-value)}` : rp(value)}</Text>
              </View>
            ))}
            <View style={[s.sumRow, { backgroundColor: C.greenSoft, borderBottomWidth: 1, borderColor: C.green }]}>
              <Text style={[s.bold, { color: C.green }]}>Saldo Kas Akhir</Text>
              <Text style={[s.bold, { color: C.green }]}>{rp(summary.closingBalance)}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

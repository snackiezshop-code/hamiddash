import "server-only";
import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ExpenseCategory, RoomStatus } from "@/generated/prisma/enums";
import type { getPeriod, summarize } from "./cashbook";
import { CATEGORY_LABEL, todayJakarta } from "./format";

Font.registerHyphenationCallback((word) => [word]);

// Monthly report for the family (it gets forwarded to the heirs' group), in Indonesian.
// Tenants appear by room number only, never by name.
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const STATUS_ID: Record<RoomStatus, string> = {
  LUNAS: "Lunas", TUNDA_BAYAR: "Belum bayar", KOSONG: "Kosong", RUSAK: "Rusak", TAHUNAN: "Bayar tahunan",
};
const KATEGORI_ID: Record<ExpenseCategory, string> = {
  LISTRIK: "Listrik", PDAM: "PDAM", CLEANING_SERVICE: "Cleaning service", KEBERSIHAN: "Kebersihan",
  PERBAIKAN: "Perbaikan", INTERNET: "Internet", PERLENGKAPAN: "Perlengkapan", ADMINISTRASI: "Administrasi",
  PENGURUS: "Pengurus", BAGI_HASIL: "Bagi hasil", LAINNYA: "Lainnya",
};

export const bulanLabel = (year: number, month: number) => `${BULAN[month - 1]} ${year}`;
const tanggal = (d: Date) => `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const rp = (n: number) => `${n < 0 ? "-" : ""}Rp${Math.abs(n).toLocaleString("id-ID")}`;
type ExpenseLike = { category: ExpenseCategory; categoryLabel: string | null; description: string };
const kategori = (e: Omit<ExpenseLike, "description">) =>
  e.category === "LAINNYA" && e.categoryLabel ? e.categoryLabel : KATEGORI_ID[e.category];
// What the money was for. A description that only repeats the category ("Listrik" under Listrik,
// or "-") falls back to the category name, so every row says something.
const keterangan = (e: ExpenseLike) => {
  const d = e.description.trim();
  return ["", "-", kategori(e).toLowerCase(), CATEGORY_LABEL[e.category].toLowerCase()].includes(d.toLowerCase()) ? kategori(e) : d;
};

// The app's palette: ink on white, terracotta for the one number that matters (the closing balance).
const C = {
  ink: "#211D19",
  soft: "#6B635A",
  line: "#E8E2D9",
  cream: "#F7F4F0",
  terra: "#A0533D",
  mintDeep: "#2F6446",
  blushDeep: "#8E3A26",
};

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 56, paddingHorizontal: 44, fontSize: 10, fontFamily: "Helvetica", color: C.ink, lineHeight: 1.35 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1, borderColor: C.line, paddingBottom: 10 },
  title: { fontFamily: "Times-Bold", fontSize: 22, lineHeight: 1.15 },
  sub: { color: C.soft, fontSize: 10, marginTop: 4 },
  h2: { fontFamily: "Times-Bold", fontSize: 14, marginBottom: 6 },
  section: { marginTop: 22 },
  muted: { color: C.soft },
  small: { fontSize: 8.5, color: C.soft },
  bold: { fontFamily: "Helvetica-Bold" },
  right: { textAlign: "right" },
  // Tables
  th: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, backgroundColor: C.cream, fontSize: 8.5, color: C.soft, fontFamily: "Helvetica-Bold" },
  tr: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 0.5, borderColor: C.line },
  trTotal: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 6, fontFamily: "Helvetica-Bold", borderTopWidth: 1, borderColor: C.ink },
  footer: { position: "absolute", bottom: 24, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: C.soft },
});

type Period = NonNullable<Awaited<ReturnType<typeof getPeriod>>>;
type Summary = ReturnType<typeof summarize>;
type Props = { period: Period; summary: Summary };

export function MonthlyReport({ period, summary }: Props) {
  const label = bulanLabel(period.year, period.month);
  return (
    <Document title={`Laporan Kas Kost Mujair 12 - ${label}`} author="Hamid">
      <Page size="A4" style={s.page}>
        <BukuKas period={period} summary={summary} />
        <View style={s.footer} fixed>
          <Text>Kost Mujair 12 · Laporan kas {label} · dibuat {tanggal(todayJakarta())}</Text>
          <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

function Header({ period }: { period: Period }) {
  return (
    <View style={s.header}>
      <View>
        <Text style={s.title}>Kost Mujair 12</Text>
        <Text style={s.sub}>Laporan kas bulan {bulanLabel(period.year, period.month)}</Text>
      </View>
    </View>
  );
}

function rentFacts(period: Period) {
  const rooms = period.roomIncomes;
  const paid = rooms.filter((r) => r.status === "LUNAS" || r.status === "TAHUNAN").length;
  const owing = rooms.filter((r) => r.status !== "KOSONG" && r.status !== "RUSAK").length;
  const notPaid = rooms.filter((r) => r.status !== "LUNAS" && r.status !== "TAHUNAN");
  return { paid, owing, notPaid };
}

// Rooms that brought in no rent, in one line: "Belum bayar: kamar 3, 7 · Kosong: kamar 4".
function notPaidLine(period: Period) {
  const { notPaid } = rentFacts(period);
  const byStatus = new Map<string, number[]>();
  for (const r of notPaid) byStatus.set(STATUS_ID[r.status], [...(byStatus.get(STATUS_ID[r.status]) ?? []), r.room.number]);
  return [...byStatus].map(([st, nums]) => `${st}: kamar ${nums.join(", ")}`).join(" · ");
}

// One passbook-style table: saldo awal, rent and other income, then every expense, with the
// balance after each row on the right and saldo akhir at the bottom.
function BukuKas({ period, summary }: Props) {
  const { paid, owing } = rentFacts(period);
  type Row = { label: string; note?: string; masuk?: number; keluar?: number };
  const rows: Row[] = [
    { label: `Sewa kamar (${paid} dari ${owing} kamar lunas)`, note: notPaidLine(period) || undefined, masuk: summary.roomTotal },
    ...period.additionalIncomes.map((a) => ({ label: `${a.description}${a.source ? ` (${a.source})` : ""}`, masuk: a.amount })),
    ...period.expenses.map((e) => ({ label: keterangan(e), note: keterangan(e) !== kategori(e) ? kategori(e) : undefined, keluar: e.amount })),
  ];
  let saldo = summary.openingBalance;
  const W = { no: 22, amt: 78, saldo: 86 };

  return (
    <>
      <Header period={period} />
      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        {([
          ["Uang masuk", summary.incomeTotal, C.mintDeep],
          ["Uang keluar", summary.expenseTotal, C.blushDeep],
          [summary.netFlow >= 0 ? "Kas bertambah" : "Kas berkurang", Math.abs(summary.netFlow), C.ink],
        ] as const).map(([k, v, color]) => (
          <View key={k} style={{ flex: 1, borderWidth: 0.5, borderColor: C.line, borderRadius: 6, padding: 8 }}>
            <Text style={s.small}>{k}</Text>
            <Text style={[s.bold, { fontSize: 12, marginTop: 2, color }]}>{rp(v)}</Text>
          </View>
        ))}
      </View>

      <View style={s.section}>
        <Text style={s.h2}>Buku kas {bulanLabel(period.year, period.month)}</Text>
        <View style={s.th} fixed>
          <Text style={{ width: W.no }}>No</Text>
          <Text style={{ flex: 1 }}>Keterangan</Text>
          <Text style={[s.right, { width: W.amt }]}>Masuk</Text>
          <Text style={[s.right, { width: W.amt }]}>Keluar</Text>
          <Text style={[s.right, { width: W.saldo }]}>Saldo</Text>
        </View>
        <View style={[s.tr, { backgroundColor: C.cream }]}>
          <Text style={{ width: W.no }} />
          <Text style={[s.bold, { flex: 1 }]}>Saldo awal</Text>
          <Text style={{ width: W.amt * 2 }} />
          <Text style={[s.right, s.bold, { width: W.saldo }]}>{rp(saldo)}</Text>
        </View>
        {rows.map((r, i) => {
          saldo += (r.masuk ?? 0) - (r.keluar ?? 0);
          return (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={[s.muted, { width: W.no }]}>{i + 1}</Text>
              <View style={{ flex: 1, paddingRight: 6 }}>
                <Text>{r.label}</Text>
                {r.note ? <Text style={s.small}>{r.note}</Text> : null}
              </View>
              <Text style={[s.right, { width: W.amt, color: C.mintDeep }]}>{r.masuk ? rp(r.masuk) : ""}</Text>
              <Text style={[s.right, { width: W.amt, color: C.blushDeep }]}>{r.keluar ? rp(r.keluar) : ""}</Text>
              <Text style={[s.right, s.muted, { width: W.saldo }]}>{rp(saldo)}</Text>
            </View>
          );
        })}
        <View style={s.trTotal}>
          <Text style={{ width: W.no }} />
          <Text style={{ flex: 1 }}>Jumlah</Text>
          <Text style={[s.right, { width: W.amt, color: C.mintDeep }]}>{rp(summary.incomeTotal)}</Text>
          <Text style={[s.right, { width: W.amt, color: C.blushDeep }]}>{rp(summary.expenseTotal)}</Text>
          <Text style={{ width: W.saldo }} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: C.terra, borderRadius: 6 }}>
          <Text style={[s.bold, { color: "#FFFFFF", fontSize: 11 }]}>Saldo akhir</Text>
          <Text style={[s.bold, { color: "#FFFFFF", fontSize: 13 }]}>{rp(summary.closingBalance)}</Text>
        </View>
      </View>
    </>
  );
}

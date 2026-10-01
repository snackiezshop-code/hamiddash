import "server-only";
import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ExpenseCategory, RoomStatus } from "@/generated/prisma/enums";
import type { getPeriod, summarize } from "./cashbook";
import { CATEGORY_LABEL, shiftMonth, todayJakarta } from "./format";
import { isDue, transferDue } from "./transfers";

Font.registerHyphenationCallback((word) => [word]);

// One-page monthly report for the family (it gets forwarded to the heirs' group), in Indonesian.
// Reads top to bottom: the balance sum, where the money came from, where it went, who was sent what.
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

// The caretaker is named by role only.
const isCaretaker = (role: string | null) => /pengurus|caretaker/i.test(role ?? "");

export const bulanLabel = (year: number, month: number) => `${BULAN[month - 1]} ${year}`;
const tanggal = (d: Date) => `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const rp = (n: number) => `${n < 0 ? "-" : ""}Rp${Math.abs(n).toLocaleString("id-ID")}`;
const kategori = (e: { category: ExpenseCategory; categoryLabel: string | null }) =>
  e.category === "LAINNYA" && e.categoryLabel ? e.categoryLabel : KATEGORI_ID[e.category];
// Hide descriptions that only repeat the category (e.g. "Listrik" under Listrik).
const keterangan = (e: { category: ExpenseCategory; categoryLabel: string | null; description: string }) => {
  const d = e.description.trim();
  return ["-", kategori(e).toLowerCase(), CATEGORY_LABEL[e.category].toLowerCase()].includes(d.toLowerCase()) ? "" : d;
};

// The app's palette: ink on white, terracotta for the one number that matters (the closing balance).
const C = {
  ink: "#211D19",
  soft: "#6B635A",
  line: "#E8E2D9",
  cream: "#F7F4F0",
  terra: "#A0533D",
  mint: "#E4EFE6",
  mintDeep: "#2F6446",
  blush: "#F6E6DF",
  blushDeep: "#8E3A26",
};

const s = StyleSheet.create({
  page: { paddingVertical: 40, paddingHorizontal: 44, fontSize: 10, fontFamily: "Helvetica", color: C.ink, lineHeight: 1.35 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1, borderColor: C.line, paddingBottom: 10 },
  title: { fontFamily: "Times-Bold", fontSize: 22, lineHeight: 1.15 },
  sub: { color: C.soft, fontSize: 10, marginTop: 4 },
  sumRow: { flexDirection: "row", alignItems: "center", marginTop: 18 },
  sumBox: { flex: 1, backgroundColor: C.cream, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 8 },
  sumLabel: { fontSize: 8.5, color: C.soft },
  sumValue: { fontFamily: "Helvetica-Bold", fontSize: 12.5, marginTop: 2 },
  op: { width: 18, textAlign: "center", fontFamily: "Helvetica-Bold", fontSize: 14, color: C.soft },
  note: { marginTop: 8, color: C.soft },
  section: { marginTop: 20 },
  h2: { fontFamily: "Times-Bold", fontSize: 14, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 0.5, borderColor: C.line },
  total: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, marginTop: 2, fontFamily: "Helvetica-Bold" },
  muted: { color: C.soft },
  small: { fontSize: 8.5, color: C.soft },
  pill: { fontSize: 8.5, paddingVertical: 1.5, paddingHorizontal: 5, borderRadius: 6 },
  footer: { position: "absolute", bottom: 24, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: C.soft },
});

type Period = NonNullable<Awaited<ReturnType<typeof getPeriod>>>;
type Summary = ReturnType<typeof summarize>;

export function MonthlyReport({ period, summary }: { period: Period; summary: Summary }) {
  const label = bulanLabel(period.year, period.month);
  const prev = shiftMonth(period.year, period.month, -1);

  const rooms = period.roomIncomes;
  const paid = rooms.filter((r) => r.status === "LUNAS").length;
  const notPaid = rooms.filter((r) => r.status !== "LUNAS");

  // Expenses grouped by category (a typed-in "Other" name counts as its own group), biggest first.
  const groups = new Map<string, { name: string; total: number; count: number }>();
  for (const e of period.expenses) {
    const name = kategori(e);
    const g = groups.get(name) ?? { name, total: 0, count: 0 };
    g.total += e.amount;
    g.count += 1;
    groups.set(name, g);
  }
  const byCategory = [...groups.values()].sort((a, b) => b.total - a.total);

  const transfers = period.transferChecks
    .filter((t) => t.recipient.isActive || t.isSent)
    .filter((t) => isDue(transferDue(t.recipientId, period.year, period.month)));

  const net = summary.netFlow;

  return (
    <Document title={`Laporan Kas Kost Mujair 12 - ${label}`} author="Hamid">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Kost Mujair 12</Text>
            <Text style={s.sub}>Laporan kas bulan {label}</Text>
          </View>
          <Text style={s.small}>Dibuat {tanggal(todayJakarta())}</Text>
        </View>

        {/* The whole month in one sum. */}
        <View style={s.sumRow}>
          <View style={s.sumBox}>
            <Text style={s.sumLabel}>Saldo awal</Text>
            <Text style={s.sumValue}>{rp(summary.openingBalance)}</Text>
          </View>
          <Text style={s.op}>+</Text>
          <View style={s.sumBox}>
            <Text style={s.sumLabel}>Uang masuk</Text>
            <Text style={[s.sumValue, { color: C.mintDeep }]}>{rp(summary.incomeTotal)}</Text>
          </View>
          <Text style={s.op}>-</Text>
          <View style={s.sumBox}>
            <Text style={s.sumLabel}>Uang keluar</Text>
            <Text style={[s.sumValue, { color: C.blushDeep }]}>{rp(summary.expenseTotal)}</Text>
          </View>
          <Text style={s.op}>=</Text>
          <View style={[s.sumBox, { backgroundColor: C.terra }]}>
            <Text style={[s.sumLabel, { color: "#FFFFFF" }]}>Saldo akhir</Text>
            <Text style={[s.sumValue, { color: "#FFFFFF" }]}>{rp(summary.closingBalance)}</Text>
          </View>
        </View>
        <Text style={s.note}>
          Saldo awal adalah saldo akhir {bulanLabel(prev.year, prev.month)}. Bulan ini kas {net >= 0 ? "bertambah" : "berkurang"} {rp(Math.abs(net))}.
        </Text>

        <View style={s.section}>
          <Text style={s.h2}>Uang masuk</Text>
          <View style={s.row}>
            <Text>Sewa kamar: {paid} dari {rooms.length} kamar lunas</Text>
            <Text>{rp(summary.roomTotal)}</Text>
          </View>
          {notPaid.map((r) => (
            <View key={r.id} style={s.row}>
              <Text style={[s.muted, { paddingLeft: 12 }]}>Kamar {r.room.number}</Text>
              <Text style={[s.pill, r.status === "TUNDA_BAYAR" ? { backgroundColor: C.blush, color: C.blushDeep } : { backgroundColor: C.cream, color: C.soft }]}>
                {STATUS_ID[r.status]}{r.amount ? ` · ${rp(r.amount)}` : ""}
              </Text>
            </View>
          ))}
          {period.additionalIncomes.map((a) => (
            <View key={a.id} style={s.row}>
              <Text>{a.description}{a.source ? ` (${a.source})` : ""}</Text>
              <Text>{rp(a.amount)}</Text>
            </View>
          ))}
          <View style={s.total}>
            <Text>Total uang masuk</Text>
            <Text>{rp(summary.incomeTotal)}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.h2}>Uang keluar</Text>
          {byCategory.length === 0 ? <Text style={s.muted}>Tidak ada pengeluaran bulan ini.</Text> : byCategory.map((g) => (
            <View key={g.name} style={s.row}>
              <Text>{g.name}{g.count > 1 ? <Text style={s.muted}>  ({g.count}x)</Text> : null}</Text>
              <Text>{rp(g.total)}</Text>
            </View>
          ))}
          <View style={s.total}>
            <Text>Total uang keluar</Text>
            <Text>{rp(summary.expenseTotal)}</Text>
          </View>
          {period.expenses.length > 0 && (
            <View style={{ marginTop: 6 }}>
              <Text style={[s.small, { marginBottom: 2 }]}>Rincian</Text>
              {period.expenses.map((e) => (
                <View key={e.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 }}>
                  <Text style={s.small}>{kategori(e)}{keterangan(e) ? `: ${keterangan(e)}` : ""}</Text>
                  <Text style={s.small}>{rp(e.amount)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {transfers.length > 0 && (
          <View style={s.section}>
            <Text style={s.h2}>Uang dikirim bulan ini</Text>
            {transfers.map((t) => (
              <View key={t.id} style={s.row}>
                <Text>{isCaretaker(t.recipient.role) ? "Pengurus" : <>{t.recipient.name}{t.recipient.role ? <Text style={s.muted}>  ({t.recipient.role})</Text> : null}</>}</Text>
                <Text style={[s.pill, t.isSent ? { backgroundColor: C.mint, color: C.mintDeep } : { backgroundColor: C.blush, color: C.blushDeep }]}>
                  {t.isSent ? `Sudah dikirim${t.sentAt ? ` ${tanggal(new Date(t.sentAt.getTime() + 7 * 60 * 60 * 1000))}` : ""}` : "Belum dikirim"}
                  {t.amount ? ` · ${rp(t.amount)}` : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.footer} fixed>
          <Text>Kost Mujair 12 · Laporan kas {label}</Text>
          <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

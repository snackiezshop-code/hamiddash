# HamidKost Dashboard — Brief (v3)

Status: brief agreed, design system v1 approved by Rynd on 2026-09-17; build in progress (Next.js 16 + Prisma 6 + SQLite, single-password login).

## Purpose
A personal-use web dashboard for Rynd to run his 16-room kost rental business — replacing iPhone Notes (checklist), Google Sheets (accounting/report), and WhatsApp used ad hoc for tenant contact.

## Naming
App is branded **HamidKost**. The underlying property is formally "Kost Mujair 12" (per the existing spreadsheet) — HamidKost is the app's own name, kept separate from the property's formal name per Rynd's choice.

## Users
Rynd only. Single admin, no shared logins or roles. Must work well on mobile (primary use case) as well as desktop.

## Scope
16 rooms (Kamar 1–16), confirmed from the real spreadsheet `Laporan Bulanan Kost Mujair 12.xlsx` (found in the connected project folder). Each room has its own rent, not a flat rate — real range seen: roughly Rp250,000–Rp600,000/month per room.

## Real data model, reverse-engineered from the existing spreadsheet
The spreadsheet has one sheet per month (Agustus 2025 → Agustus 2026), evolving into a proper cash-book format (the last two months, Juli/Agustus 2026, are the current template and the reference for what to build). Confirmed: **build the full cash-book version**.

### Room status vocabulary (use these terms, not invented ones)
- **Lunas** — rent paid this period
- **Kosong** — vacant
- **Rusak** — damaged / out of service (distinct from vacant)
- **Tahunan** — tenant pays yearly instead of monthly
- **Tunda Bayar / Tidak Bayar** — late or unpaid

### Monthly cash book structure (per period)
- **Saldo Kas Awal** (opening balance) — auto-carried from last month's closing balance
- **Pemasukan Sewa Kamar** (room income) — table of 16 rooms: No., Unit/Kamar, Status, Nominal
- **Pemasukan Tambahan** (additional income) — a few ad-hoc line items (description, source, amount)
- **Pengeluaran Operasional** (expenses) — categorized table: No., Kategori, Keterangan, Nominal. Categories seen in real use: Listrik, PDAM, Cleaning Service, Kebersihan, Perbaikan, Internet, Perlengkapan, Administrasi, Pengurus (caretaker fee), Bagi Hasil (profit-share payout)
- **Ringkasan Arus Kas** (summary, computed): Total Sewa Kamar, Total Pemasukan Tambahan, Total Pemasukan, Total Pengeluaran, Arus Kas Bersih, Saldo Kas Awal, **Saldo Kas Akhir** (closing balance) → next month's opening balance

### Transfer checklist (seen in the Agustus 2026 sheet)
Checkbox list per month tracking whether recurring payouts were actually sent: Transfer to Pengurus (caretaker), transfer to each profit-sharing family member ("pewaris" — treat as a configurable/editable list of recipients, not hardcoded names), transfer to bank (BNI). Distinct from the general maintenance/admin checklist.

## Core feature areas
1. **Rooms & Tenants** — 16 rooms, individual rent per room, status using the real vocabulary above, tenant contact info, move-in date, lease/contract end date, one-tap WhatsApp contact.
2. **Cash Book / Accounting** — full monthly cash-book: opening balance, room income, additional income, categorized expenses, computed summary, closing balance carried forward, transfer checklist for payouts. Export/download monthly reports.
3. **Checklist** — general task tracking for cleaning, maintenance, admin (separate from the monthly transfer checklist).
4. **WhatsApp integration** — quick contact and payment-reminder links woven into rooms/tenants and the cash book.

## Explicitly out of scope
- No public-facing marketing/listing site
- No multi-user roles or shared access
- No tenant-facing portal

## Design system v1 (approved 2026-09-17 — from Rynd's mood board)

Mood board: two screens of a healthtech billing/dashboard product ("Intelly" — reference only, not to be copied or attributed in the build). Language extracted from it: warm cream paper background, near-black used as a real anchor color (not just text), solid pastel color-blocked cards (not white-with-accent), very large consistent corner radius on everything, pill shapes for buttons/badges/search, bold geometric sans with tight tracking, flat/no-shadow surfaces (separation via color blocking), small data-viz baked directly into stat cards, and a dark sidebar that floats with margin rather than sitting edge-to-edge.

Translated to HamidKost's own content (not a copy of the reference product):

**Color**
- Cream background: `#F6F1E5` · plain surface white: `#FFFFFF`
- Ink (sidebar, primary buttons, headings): `#17140F`
- Mint — **Lunas** (paid): block `#CFE8D2` / deep text `#2E6B45`
- Blush — **Tunda Bayar / Tidak Bayar** (unpaid, late): block `#F6CBC2` / deep `#A23B2B`
- Butter — **Rusak** (out of service): block `#F6DE93` / deep `#8A6A12`
- Periwinkle — **Kosong** (vacant) and **Tahunan** (annual payer): block `#CDD6F3` / deep `#34428C`

Same four pastels serve as both KPI-card fills and room/payment status pills, so the palette stays small and consistent.

**Type**
- Headings/display + body/UI: Fira Sans (headings 700, body 400–600) — updated 2026-09-17
- Numbers (rupiah, dates in tables): Fira Code, tabular
- Type scale: 13 / 16 / 17 / 20 / 24 / 28 / 32 / 40 px; body text never below 16px
- Icons: Phosphor (regular weight, 20–22px)

**Shape & components**
- Cards: 24px radius, solid pastel fill, small icon-in-circle top-left, big bold number, small pill for delta/status
- Sidebar: near-black, floating with margin and rounded corners, collapses to a bottom bar on mobile
- Buttons: full pill — solid ink for primary, outlined cream for secondary
- Status badges: pill-shaped, colored per the mapping above
- Mini inline charts in Ringkasan KPI cards (e.g. small donut for occupancy, sparkline for cash flow) instead of one big separate chart block

## Process (agreed)
1. Brief ✅
2. Mood board ✅ — two reference images received and analyzed
3. Design system — v1 approved ✅ (2026-09-17)
4. Build — in progress: Ringkasan, Kamar, Buku Kas (with CSV export), Checklist, Pengaturan built and seeded with the real Juli/Agustus 2026 data
5. Reuse — same system optionally applied to other assets later

## Reference material available in the connected folder
- `Laporan Bulanan Kost Mujair 12.xlsx` — the real accounting spreadsheet this app replaces (read for structure, not modified)
- An image with "8 rules" (`.tiff`) — explicitly skipped per Rynd's instruction

## History
- v1 of the dashboard was built and published as an Artifact on 2026-09-16, then deleted at Rynd's request in favor of this more deliberate, brief-first process.

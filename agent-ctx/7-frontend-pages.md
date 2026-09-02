# Task 7 — Frontend Pages (Dashboard, Laporan, Audit)

## Summary
Built 3 comprehensive frontend page components for the RME system: Dashboard, Laporan (Reports), and Audit Trail. Integrated them into the AppShell SPA router with lazy loading.

## Files Created

### 1. `src/components/dashboard/DashboardPage.tsx`
- Welcome header with clinic name + Indonesian date format (`toLocaleDateString('id-ID')`)
- 4 stat cards in responsive grid (1→2→4 cols): Total Pasien (emerald), Kunjungan Hari Ini (blue), Antrian Aktif (amber), Pendapatan Bulan Ini (green)
- Each card: icon, value, trend indicator with TrendingUp/TrendingDown
- BarChart (recharts): Kunjungan 7 Hari Terakhir — fetches each day via `/api/reports?type=daily-visits`
- Table: 5 Kunjungan Terakhir with columns No RM, Nama, Dokter, Keluhan, Status, Waktu
- Section: 10 Penyakit Terbanyak — horizontal progress bars with ICD-10 codes and counts
- Super admin card: Kepatuhan RME with Progress bar
- Loading: skeleton cards, skeleton chart, skeleton table
- Error: Alert with destructive variant

### 2. `src/components/laporan/LaporanPage.tsx`
- Period selector: Tabs (Hari Ini, Minggu Ini, Bulan Ini)
- Tab 1 (Harian): 3 summary stat cards + today's visit table with patient, doctor, diagnosis, status, time
- Tab 2 (Mingguan): 3 summary cards + BarChart of daily visits Mon-Sun
- Tab 3 (Bulanan): 3 summary cards (total, selesai, rata-rata per hari)
- Shared sections: Top 10 Penyakit table with ICD-10 codes + inline progress bars
- Revenue summary: 3 cards (Total, Sudah Dibayar, Belum Dibayar) with Rupiah formatting
- Export button: `toast.info('Fitur export akan segera tersedia')`
- Fetches from `/api/reports` with appropriate type and period params

### 3. `src/components/audit/AuditPage.tsx`
- Immutable notice: amber Alert referencing Permenkes 24/2022 Pasal 29
- Filters: date range (start/end), user name search with Search icon, table name dropdown (11 options)
- Table: Waktu, User, Aksi (icon+badge), Tabel (badge), Record ID (mono), Detail (Eye button)
- Detail dialog: meta info grid + old data (red) and new data (green) in pre-formatted JSON
- Pagination: 10 per page, first/prev/next/last buttons
- Reset filter button
- NO delete button (immutable)
- Fetches from `/api/audit-logs` with pagination and filters

## Files Modified

### `src/lib/api.ts`
- Added `export` to `apiFetch<T>()` function for direct use in page components

### `src/components/rme/AppShell.tsx`
- Added `lazy()` imports for DashboardPage, LaporanPage, AuditPage
- Added `Suspense` with `PageSkeleton` fallback
- Added `PageRouter` component: switch on `currentPage` to render the correct page
- Default case: placeholder "Halaman ini akan tersedia segera"
- Removed old placeholder content

## Technical Decisions
- All components use `'use client'` directive
- 100% Tailwind CSS — zero custom CSS
- shadcn/ui components: Card, Table, Tabs, Badge, Skeleton, Dialog, Select, Input, Label, ScrollArea, Alert, Progress, Button
- Lucide React icons throughout
- recharts BarChart with ResponsiveContainer for the 7-day chart
- `apiFetch` used directly with inline response types (API response shapes differ from typed API client)
- Rupiah formatting via `Intl.NumberFormat('id-ID')`
- Date formatting via `toLocaleDateString('id-ID')` and `toLocaleTimeString('id-ID')`
- Lazy loading via `React.lazy()` + `Suspense` for code splitting
- Graceful error handling: individual `.catch(() => null)` on each parallel fetch
- Dark/light mode compatible
- Mobile-first responsive

## Verification
- `bun run lint` ✅ (no errors)
- Dev server: GET / 200 ✅

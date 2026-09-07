# SIRAT — GitHub Pages (Frontend) + Nhost (Backend)

Paket integrasi **SIRAT — Sistem Informasi Persuratan Terpadu** untuk Dinas Kesehatan Kabupaten Kutai Kartanegara dengan arsitektur:

```
┌────────────────────────┐          ┌──────────────────────────────┐
│  FRONTEND — statis     │  GraphQL │  BACKEND — Nhost (Postgres + │
│  GitHub Pages          │ ───────► │  Hasura + Auth + Storage)    │
│  index.html + assets/  │  HTTPS   │  nhost/ (config, migrasi,    │
└────────────────────────┘          │  metadata, izin 6 role)      │
                                    └──────────────────────────────┘
```

- **Frontend**: `index.html` + `assets/` — SPA vanilla JS tanpa build step, di-host GitHub Pages (gratis). **Seluruh pustaka (SDK Nhost & QR) sudah dipaketkan lokal di `assets/vendor/` — tidak ada dependensi CDN saat runtime.**
- **Backend**: Nhost — PostgreSQL (14 tabel), Hasura GraphQL dengan izin 6 role, Auth (email+password), Storage (lampiran).
- **Prinsip**: *Satu Surat, Satu Tracking, Satu Arsip.* Setiap perubahan status otomatis tercatat di `riwayat_surat`, notifikasi ke pihak terkait, dan log aktivitas.

---

## 1. Prasyarat

1. Akun GitHub (untuk Pages).
2. Akun Nhost (gratis di [nhost.io](https://nhost.io)) — backend.
3. (Opsional) Node.js + `nhost` CLI untuk pengembangan lokal.

## 2. Buat Proyek Nhost

1. Login ke [Nhost Dashboard](https://app.nhost.io) → **Create Project** (pilih region terdekat, mis. Singapore).
2. Catat **Project Subdomain** dan **Region** (Dashboard → Settings → General).
3. Hubungkan ke GitHub (opsional namun disarankan): Dashboard → **Integrations → Git** → pilih repo ini. Setiap push akan otomatis menerapkan `nhost/migrations` dan `nhost/metadata`.

## 3. Unggah ke GitHub

```bash
git init
git add .
git commit -m "SIRAT: integrasi GitHub Pages + Nhost"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

Workflow `.github/workflows/deploy-pages.yml` akan otomatis mem-publish situs. Aktifkan Pages bila diminta: **Settings → Pages → Source: GitHub Actions**.

## 4. Konfigurasi Frontend

Edit `assets/config.js`:

```js
nhostSubdomain: "isi-subdomain-proyek-anda",   // dari Nhost Dashboard
nhostRegion: "ap-southeast-1",                 // sesuaikan region
```

Commit & push. Selesai — buka `https://<username>.github.io/<repo>/`.

> ⚠️ Setelah mengubah `nhost/config.yaml` atau `adminSecret`, jalankan `nhost config update` (CLI) atau biarkan integrasi Git menerapkannya. **Ganti** `adminSecret` dan webhook secret dengan nilai acak Anda.

### Berkas `assets/vendor/` (wajib ikut diunggah)

| Berkas | Isi |
|---|---|
| `assets/vendor/nhost-js.mjs` | SDK `@nhost/nhost-js` v4.8.0 (bundle ESM tunggal, offline) |
| `assets/vendor/qrcode.min.js` | Pustaka QR code (qrcodejs 1.0.0) |

Kedua berkas **wajib ikut ter-commit** — aplikasi memuatnya dari origin sendiri, bukan dari CDN. Ini yang membuat SIRAT tetap jalan meski jaringan pengguna memblokir `esm.sh`/CDN eksternal.

### Domain kustom / self-hosting (opsional)

Bila memakai domain kustom Nhost, isi `nhostAuthUrl` / `nhostGraphQLUrl` di `assets/config.js` (URL lengkap berakhiran `/v1`) — nilai tersebut menggantikan `subdomain`+`region`.

## 4b. Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| Halaman putih, console: `Gagal memuat Nhost SDK` / `blocked by CORS policy ... not a secure context ... more-private address space local` | Jaringan/DNS lokal mengarahkan CDN (`esm.sh`) ke IP pribadi sehingga browser memblokirnya; atau berkas `assets/vendor/` tidak terunggah | Sudah diperbaiki: SDK dimuat lokal dari `assets/vendor/nhost-js.mjs`. Pastikan folder `vendor/` ikut di-commit & di-push. Lalu muat ulang (Ctrl+Shift+R) |
| Console: `Failed to load resource: net::ERR_NAME_NOT_RESOLVED` + banner merah "Tidak dapat terhubung ke server SIRAT" | Hostname tidak ditemukan DNS: (1) `subdomain`/`region` di `assets/config.js` salah/typo/masih placeholder, (2) proyek Nhost **paused/dihapus**, (3) DNS jaringan kantor memblokir `*.nhost.run` | (1) Salin persis dari Nhost Dashboard → Settings → Project subdomain/region; (2) buka Nhost Console, pastikan proyek berstatus Running; (3) coba hotspot/jaringan lain. Banner akan hilang otomatis saat koneksi pulih |
| Panel Notifikasi menutupi halaman / tampil terus meski belum login | Situs masih menjalankan **berkas versi lama** (bug CSS `[hidden]` sudah diperbaiki) + cache browser | Commit & push SEMUA berkas terbaru (termasuk `assets/style.css`, `index.html`), tunggu Actions selesai, lalu hard refresh Ctrl+Shift+R. Panel kini punya backdrop — klik area gelap / tombol Esc untuk menutup |
| `404` saat membuka halaman | `index.html` tidak di root repo Pages, atau Pages belum aktif | Pastikan `index.html` di root, Settings → Pages → Source: GitHub Actions |
| Login muncul `Failed to fetch` | Subdomain/region Nhost salah, atau proyek Nhost paused | Cek `assets/config.js`, pastikan proyek Nhost aktif (running) di Dashboard |
| Login berhasil tapi data kosong/error izin | Migrasi/metadata `nhost/` belum diterapkan | Hubungkan repo ke Nhost (Integrations → Git) atau jalankan `nhost deploy` |
| Website diakses via `http://` (bukan https) | Enforce HTTPS belum aktif | GitHub → Settings → Pages → centang **Enforce HTTPS** (disarankan agar sesi & token lebih aman) |

## 5. Struktur `nhost/`

| Berkas | Isi |
|---|---|
| `nhost/config.yaml` | Konfigurasi proyek: auth (signUp default role OPERATOR), Hasura, Postgres, Storage |
| `nhost/migrations/1725700001_init/` | 14 tabel: unit_kerja, users (profil), pejabat, surat_masuk, surat_keluar, disposisi, riwayat_surat, template_surat, nomor_surat, lampiran, notifikasi, log_aktivitas, pengaturan, penomoran_config + trigger `updated_at` |
| `nhost/migrations/1725700002_roles_seed/` | 6 role JWT (SUPERADMIN…VIEWER) + seed: 9 unit kerja, 3 pejabat TTD, 10 template surat, pengaturan, konfigurasi penomoran |
| `nhost/metadata/` | Metadata Hasura: relasi antar tabel + **izin 6 role + role `public`** (untuk halaman verifikasi QR) |

### Matriks izin ringkas

| Tabel | SUPERADMIN/ADMIN | VERIFIKATOR | PIMPINAN | OPERATOR | VIEWER | public |
|---|---|---|---|---|---|---|
| surat_keluar | penuh | baca semua, ubah status saat DIAJUKAN | baca semua, putusan saat DIVERIFIKASI | buat/milik sendiri, ubah draft/koreksi | baca | baca (hanya surat bertanda tangan, via qr_token) |
| surat_masuk | penuh | baca | baca | registrasi + milik sendiri | baca | — |
| disposisi | penuh | buat | buat | perbarui status miliknya | baca | — |
| riwayat/notifikasi/log | sesuai | catat | catat | catat | baca riwayat | — |

## 6. Membuat Akun & Role

**Pendaftaran mandiri**: halaman login → tab **Daftar** (role awal `OPERATOR`).

**Menjadikan admin/verifikator/pimpinan** — jalankan di Nhost Console → **SQL**:

```sql
-- contoh: angkat user jadi SUPERADMIN
update auth.users set default_role = 'SUPERADMIN' where email = 'nama@sirat.kukar.go.id';
insert into auth.user_roles (user_id, role)
select id, 'SUPERADMIN' from auth.users where email = 'nama@sirat.kukar.go.id'
on conflict do nothing;

-- lengkapi profil (nama tampil, unit kerja)
insert into public.users (id, nama, email, role, unit_kerja_id)
select u.id, coalesce(u.metadata->>'nama', u.display_name), u.email, 'SUPERADMIN',
       (select id from public.unit_kerja where kode = 'DINKES')
from auth.users u where u.email = 'nama@sirat.kukar.go.id'
on conflict (id) do update set role = 'SUPERADMIN';
```

> Role yang tersedia setelah migrasi seed: `SUPERADMIN, ADMIN, VERIFIKATOR, PIMPINAN, OPERATOR, VIEWER`.
> **Logout lalu login ulang** agar JWT memuat role baru.

## 7. Workflow yang Didukung

- **Surat Masuk**: registrasi → proses → disposisi (ke user/unit, prioritas, batas waktu) → selesai → arsip.
- **Surat Keluar** (11 status): `DRAFT → DIAJUKAN → DIVERIFIKASI → (PERLU_KOREKSI ⇄) → DISETUJUI(+nomor otomatis) → DITANDATANGANI(+QR) → DIDISTRIBUSIKAN → SELESAI → DIARSIPKAN`, serta `DITOLAK`.
- **Penomoran otomatis**: `0001/KODEUNIT/KODEJENIS/DINKES/IX/2026` — urut per unit+jenis+tahun, anti-duplikat (constraint unique).
- **QR verifikasi publik**: setiap surat bertanda tangan mendapat `qr_token`; halaman `?verify=<token>` dapat diakses tanpa login dan hanya menampilkan metadata dokumen (tanpa data pribadi).
- **Tracking**: pencarian nomor/perihal + timeline riwayat per surat.
- **Arsip**: filter tahun/kata kunci, export CSV, modal QR.
- **Notifikasi**: polling tiap 30 detik + badge; klik notifikasi membuka surat terkait.

## 8. Pengembangan Lokal (opsional)

```bash
npm i -g nhost        # CLI
nhost login
nhost dev             # PostgreSQL+Hasura+Auth lokal di http://localhost:8910
```

Lalu di `assets/config.js` gunakan subdomain lokal: `nhostSubdomain: "local"`, `nhostRegion: "local"`.

## 9. Catatan Keamanan & Produksi

- Izin baris (row-level) ditegakkan **di server Hasura** lewat metadata (filter `X-Hasura-User-Id`), bukan hanya di UI.
- Penomoran dilakukan klien → ada celah race kecil pada penggunaan serentak; untuk beban tinggi, pindahkan ke Nhost Function/Trigger DB.
- Batas ukuran/ekstensi berkas dikelola oleh Nhost Storage — konfigurasikan di Dashboard → Storage.
- Aktifkan verifikasi email & HIBP di `config.yaml` (`confirmEmailChecks`, `passwordHIBPEnabled`) untuk produksi.

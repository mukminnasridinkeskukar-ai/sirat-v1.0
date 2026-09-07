-- ============================================================
-- SIRAT — Sistem Informasi Persuratan Terpadu
-- Migrasi init: seluruh tabel aplikasi (skema public)
-- Dinas Kesehatan Kabupaten Kutai Kartanegara
-- ============================================================

-- Fungsi updated_at otomatis
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------- UNIT KERJA ----------
create table public.unit_kerja (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,
  nama_unit text not null,
  jenis_unit text not null default 'BIDANG', -- DINAS|SEKRETARIAT|BIDANG|SUBBAGIAN|UPTD|PUSKESMAS
  parent_id uuid references public.unit_kerja(id),
  status text not null default 'AKTIF',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- PROFIL PENGGUNA (1-1 dengan auth.users) ----------
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null,
  username text unique,
  email text,
  role text not null default 'OPERATOR', -- SUPERADMIN|ADMIN|VERIFIKATOR|PIMPINAN|OPERATOR|VIEWER
  jabatan text,
  nip text,
  unit_kerja_id uuid references public.unit_kerja(id),
  status text not null default 'AKTIF',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- PEJABAT PENANDATANGAN ----------
create table public.pejabat (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  jabatan text not null,
  nip text,
  unit_kerja_id uuid references public.unit_kerja(id),
  status text not null default 'AKTIF',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- SURAT MASUK ----------
create table public.surat_masuk (
  id uuid primary key default gen_random_uuid(),
  nomor_surat text not null,
  tanggal_surat date not null default current_date,
  tanggal_diterima timestamptz not null default now(),
  pengirim text not null,
  perihal text not null,
  tujuan text,
  sifat text not null default 'BIASA',     -- BIASA|PENTING|SEGERA|RAHASIA
  prioritas text not null default 'NORMAL', -- RENDAH|NORMAL|TINGGI|DARURAT
  file_url text,
  status text not null default 'BARU',      -- BARU|DIPROSES|SELESAI|DIARSIPKAN
  keterangan text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- SURAT KELUAR ----------
create table public.surat_keluar (
  id uuid primary key default gen_random_uuid(),
  nomor_surat text,
  jenis_surat text not null default 'SURAT_DINAS',
  tanggal_surat date not null default current_date,
  tujuan text not null,
  perihal text not null,
  isi text not null default '',
  sifat text not null default 'BIASA',
  lampiran_ket text,
  tembusan text,
  unit_kerja_id uuid references public.unit_kerja(id),
  penandatangan_id uuid references public.pejabat(id),
  status text not null default 'DRAFT',
  -- DRAFT|DIAJUKAN|DIVERIFIKASI|PERLU_KOREKSI|DISETUJUI|DITOLAK|
  -- PENOMORAN|DITANDATANGANI|DIDISTRIBUSIKAN|SELESAI|DIARSIPKAN
  catatan_koreksi text,
  catatan_pimpinan text,
  qr_token uuid unique default gen_random_uuid(),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- DISPOSISI ----------
create table public.disposisi (
  id uuid primary key default gen_random_uuid(),
  surat_masuk_id uuid not null references public.surat_masuk(id) on delete cascade,
  dari_user_id uuid references auth.users(id),
  kepada_user_id uuid references auth.users(id),
  kepada_unit_id uuid references public.unit_kerja(id),
  instruksi text not null,
  prioritas text not null default 'NORMAL',
  batas_waktu date,
  status text not null default 'BELUM', -- BELUM|PROSES|SELESAI
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- RIWAYAT SURAT (tracking) ----------
create table public.riwayat_surat (
  id uuid primary key default gen_random_uuid(),
  surat_id uuid not null,
  jenis_surat text not null, -- MASUK|KELUAR
  status text not null,
  judul text,
  user_id uuid references auth.users(id),
  catatan text,
  timestamp timestamptz not null default now()
);

create index riwayat_surat_surat_idx on public.riwayat_surat (surat_id, jenis_surat, timestamp desc);

-- ---------- TEMPLATE SURAT ----------
create table public.template_surat (
  id uuid primary key default gen_random_uuid(),
  nama_template text not null,
  jenis_surat text not null,
  template_content text not null default '',
  fields jsonb,
  status text not null default 'AKTIF',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- NOMOR SURAT (penomoran otomatis) ----------
create table public.nomor_surat (
  id uuid primary key default gen_random_uuid(),
  nomor_urut int not null,
  kode_unit text not null,
  kode_jenis text not null default 'SD',
  tahun int not null,
  nomor_lengkap text not null unique,
  surat_id uuid unique references public.surat_keluar(id) on delete cascade,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index nomor_surat_cari_idx on public.nomor_surat (kode_unit, kode_jenis, tahun, nomor_urut);

-- ---------- LAMPIRAN ----------
create table public.lampiran (
  id uuid primary key default gen_random_uuid(),
  surat_id uuid not null,
  jenis_surat text not null, -- MASUK|KELUAR
  nama_file text not null,
  file_url text not null,
  ukuran int not null default 0,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz not null default now()
);

-- ---------- NOTIFIKASI ----------
create table public.notifikasi (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  judul text not null,
  pesan text not null default '',
  jenis text not null default 'SISTEM',
  surat_id uuid,
  surat_jenis text,
  dibaca boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifikasi_user_idx on public.notifikasi (user_id, dibaca, created_at desc);

-- ---------- LOG AKTIVITAS ----------
create table public.log_aktivitas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  aktivitas text not null,
  modul text not null default 'SISTEM',
  record_id text,
  ip text,
  device text,
  created_at timestamptz not null default now()
);

create index log_aktivitas_waktu_idx on public.log_aktivitas (created_at desc);

-- ---------- KONFIGURASI PENOMORAN ----------
create table public.penomoran_config (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kode_unit text not null,
  jenis_surat text not null default 'ALL',
  format text not null default '{urut4}/{kode_unit}/{kode_jenis}/DINKES/{bulan_romawi}/{tahun}',
  counter int not null default 0,
  last_reset text, -- "2026-09" bila reset bulanan
  reset_bulanan boolean not null default true,
  status text not null default 'AKTIF',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- PENGATURAN ----------
create table public.pengaturan (
  key text primary key,
  value text not null default ''
);

-- ---------- TRIGGER updated_at ----------
create trigger trg_users_updated before update on public.users
  for each row execute function public.set_updated_at();
create trigger trg_unit_updated before update on public.unit_kerja
  for each row execute function public.set_updated_at();
create trigger trg_pejabat_updated before update on public.pejabat
  for each row execute function public.set_updated_at();
create trigger trg_sm_updated before update on public.surat_masuk
  for each row execute function public.set_updated_at();
create trigger trg_sk_updated before update on public.surat_keluar
  for each row execute function public.set_updated_at();
create trigger trg_disposisi_updated before update on public.disposisi
  for each row execute function public.set_updated_at();
create trigger trg_template_updated before update on public.template_surat
  for each row execute function public.set_updated_at();

-- ---------- AUTO-PROFIL: buat baris public.users saat pendaftaran ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, nama, email, role)
  values (
    new.id,
    coalesce(new.metadata->>'nama', new.display_name, split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.default_role, 'OPERATOR')
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

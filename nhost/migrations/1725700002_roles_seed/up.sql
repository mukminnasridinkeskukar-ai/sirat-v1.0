-- ============================================================
-- SIRAT — Role Hasura + data awal (unit kerja, pejabat,
-- template surat, pengaturan, konfigurasi penomoran)
-- ============================================================

-- ---------- ROLE APLIKASI (untuk JWT Nhost) ----------
insert into auth.roles (role) values
  ('SUPERADMIN'),('ADMIN'),('VERIFIKATOR'),('PIMPINAN'),('OPERATOR'),('VIEWER')
on conflict (role) do nothing;

-- ---------- UNIT KERJA ----------
insert into public.unit_kerja (kode, nama_unit, jenis_unit) values
  ('DINKES',   'Dinas Kesehatan Kabupaten Kutai Kartanegara', 'DINAS'),
  ('SEK',      'Sekretariat Dinas', 'SEKRETARIAT'),
  ('BID-P2P',  'Bidang Pencegahan dan Pengendalian Penyakit', 'BIDANG'),
  ('BID-KESMAS','Bidang Kesehatan Masyarakat', 'BIDANG'),
  ('SUB-TU',   'Subbagian Tata Usaha', 'SUBBAGIAN'),
  ('UPTD-LAB', 'UPTD Laboratorium Kesehatan', 'UPTD'),
  ('PKM-ABC',  'Puskesmas Anggana', 'PUSKESMAS'),
  ('PKM-TG',   'Puskesmas Tenggarong', 'PUSKESMAS'),
  ('PKM-LOA',  'Puskesmas Loa Janan Ilir', 'PUSKESMAS')
on conflict (kode) do nothing;

-- ---------- PEJABAT PENANDATANGAN ----------
insert into public.pejabat (nama, jabatan, nip, unit_kerja_id)
select 'dr. Hj. Norhayati, M.Kes', 'Kepala Dinas Kesehatan', '19700512 199403 2 001', u.id
from public.unit_kerja u where u.kode = 'DINKES'
and not exists (select 1 from public.pejabat);
insert into public.pejabat (nama, jabatan, nip, unit_kerja_id)
select 'Drs. Bramantyo, M.M', 'Sekretaris Dinas', '19750820 200012 1 002', u.id
from public.unit_kerja u where u.kode = 'SEK'
and (select count(*) from public.pejabat) < 2;
insert into public.pejabat (nama, jabatan, nip, unit_kerja_id)
select 'dr. Rendi Pratama, M.Kes', 'Kepala Bidang P2P', '19830511 201001 1 003', u.id
from public.unit_kerja u where u.kode = 'BID-P2P'
and (select count(*) from public.pejabat) < 3;

-- ---------- TEMPLATE SURAT (10 jenis) ----------
insert into public.template_surat (nama_template, jenis_surat, template_content, fields) values
('Surat Dinas', 'SURAT_DINAS',
 '<p>Dengan hormat,</p><p>Berdasarkan {{dasar}}, dengan ini disampaikan {{isi}}.</p><p>Demikian disampaikan, atas perhatian dan kerja samanya kami ucapkan terima kasih.</p>',
 '["dasar","isi"]'),
('Surat Undangan', 'SURAT_UNDANGAN',
 '<p>Dengan hormat,</p><p>Sehubungan dengan {{acara}}, kami mengundang Bapak/Ibu untuk hadir pada:</p><p>Hari/Tanggal: {{hari_tanggal}}<br>Waktu: {{waktu}}<br>Tempat: {{tempat}}</p><p>Demikian undangan ini kami sampaikan. Atas kehadirannya kami ucapkan terima kasih.</p>',
 '["acara","hari_tanggal","waktu","tempat"]'),
('Surat Tugas', 'SURAT_TUGAS',
 '<p>Yang bertanda tangan di bawah ini memberikan tugas kepada {{nama_petugas}} untuk {{uraian_tugas}} pada {{waktu_pelaksanaan}}.</p><p>Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.</p>',
 '["nama_petugas","uraian_tugas","waktu_pelaksanaan"]'),
('Surat Keterangan', 'SURAT_KETERANGAN',
 '<p>Yang bertanda tangan di bawah ini menerangkan bahwa {{subjek}} benar {{perihal_keterangan}}.</p><p>Surat keterangan ini dibuat untuk keperluan {{keperluan}}.</p>',
 '["subjek","perihal_keterangan","keperluan"]'),
('Surat Pengantar', 'SURAT_PENGANTAR',
 '<p>Bersama surat ini kami sampaikan pengantar atas {{perihal_pengantar}} agar dapat diproses sebagaimana mestinya.</p><p>Demikian surat pengantar ini dibuat.</p>',
 '["perihal_pengantar"]'),
('Nota Dinas', 'NOTA_DINAS',
 '<p>{{pembuka}}</p><p>{{isi_nota}}</p><p>Demikian nota dinas ini disampaikan untuk menjadi maklum dan digunakan sebagaimana mestinya.</p>',
 '["pembuka","isi_nota"]'),
('Surat Edaran', 'SURAT_EDARAN',
 '<p>Sehubungan dengan {{dasar_edaran}}, dengan ini disampaikan hal-hal sebagai berikut: {{isi_edaran}}.</p><p>Demikian surat edaran ini disampaikan untuk dilaksanakan.</p>',
 '["dasar_edaran","isi_edaran"]'),
('Surat Permohonan', 'SURAT_PERMOHONAN',
 '<p>Dengan hormat,</p><p>Berdasarkan {{dasar_permohonan}}, kami mengajukan permohonan {{perihal_permohonan}}.</p><p>Atas perkenan dan perhatiannya, kami ucapkan terima kasih.</p>',
 '["dasar_permohonan","perihal_permohonan"]'),
('Surat Pemberitahuan', 'SURAT_PEMBERITAHUAN',
 '<p>Dengan ini diberitahukan kepada seluruh pihak terkait bahwa {{isi_pemberitahuan}}.</p><p>Demikian pemberitahuan ini disampaikan.</p>',
 '["isi_pemberitahuan"]'),
('Surat Rekomendasi', 'SURAT_REKOMENDASI',
 '<p>Berdasarkan pertimbangan {{pertimbangan}}, kami merekomendasikan {{subjek_rekomendasi}} untuk {{tujuan_rekomendasi}}.</p><p>Demikian rekomendasi ini diberikan.</p>',
 '["pertimbangan","subjek_rekomendasi","tujuan_rekomendasi"]')
on conflict do nothing;

-- ---------- PENGATURAN ----------
insert into public.pengaturan (key, value) values
  ('nama_app', 'SIRAT'),
  ('nama_instansi', 'Dinas Kesehatan Kabupaten Kutai Kartanegara'),
  ('kode_instansi', 'DINKES'),
  ('alamat', 'Jl. Kesbangpol No. 1, Tenggarong, Kutai Kartanegara, Kaltim'),
  ('logo_url', ''),
  ('maks_ukuran_file', '5242880'),
  ('format_nomor', '{urut4}/{kode_unit}/{kode_jenis}/DINKES/{bulan_romawi}/{tahun}')
on conflict (key) do nothing;

-- ---------- KONFIGURASI PENOMORAN ----------
insert into public.penomoran_config (nama, kode_unit, jenis_surat, format, counter, reset_bulanan)
select v.nama, v.kode_unit, v.jenis, v.fmt, 0, true
from (values
  ('Penomoran Surat Dinas - Dinkes', 'DINKES', 'SURAT_DINAS', '{urut4}/SD/DINKES/{bulan_romawi}/{tahun}'),
  ('Penomoran Undangan - Dinkes', 'DINKES', 'SURAT_UNDANGAN', '{urut4}/UN/DINKES/{bulan_romawi}/{tahun}'),
  ('Penomoran Bidang P2P', 'BID-P2P', 'ALL', '{urut4}/BID-P2P/DINKES/{bulan_romawi}/{tahun}')
) as v(nama, kode_unit, jenis, fmt)
where not exists (select 1 from public.penomoran_config);

-- ============================================================
-- AKUN DEMO — jalankan SETELAH akun di-daftarkan dari aplikasi
-- (halaman Daftar). Ganti email bila perlu, lalu jalankan di
-- Nhost Console > SQL (lihat README bagian "Membuat akun demo").
-- ============================================================

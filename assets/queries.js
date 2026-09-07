/* ============================================================
   SIRAT — Dokumen GraphQL (query & mutation Nhost/Hasura)
   Query daftar memakai variabel where ($w) agar filter dinamis.
   ============================================================ */
window.Q = {
  // ---------- Unit & user ----------
  unitList: `query { unit_kerja(order_by: {nama_unit: asc}) { id kode nama_unit jenis_unit status } }`,
  userList: `query ($w: users_bool_exp!) {
    users(where: $w, order_by: {nama: asc}, limit: 200) {
      id nama username email role jabatan nip status unit_kerja_id unit_kerja { kode nama_unit }
    }
  }`,
  pejabatList: `query { pejabat(where: {status: {_eq: AKTIF}}, order_by: {nama: asc}) { id nama jabatan nip unit_kerja_id } }`,

  // ---------- Dashboard ----------
  dashStats: `query ($uid: uuid!, $awal: date!, $akhir: date!) {
    masuk_total: surat_masuk_aggregate { aggregate { count } }
    keluar_total: surat_keluar_aggregate { aggregate { count } }
    draft: surat_keluar_aggregate(where: {status: {_eq: DRAFT}}) { aggregate { count } }
    diajukan: surat_keluar_aggregate(where: {status: {_eq: DIAJUKAN}}) { aggregate { count } }
    diverifikasi: surat_keluar_aggregate(where: {status: {_eq: DIVERIFIKASI}}) { aggregate { count } }
    disetujui: surat_keluar_aggregate(where: {status: {_in: [DISETUJUI, PENOMORAN, DITANDATANGANI, DIDISTRIBUSIKAN]}}) { aggregate { count } }
    ditolak: surat_keluar_aggregate(where: {status: {_in: [DITOLAK, PERLU_KOREKSI]}}) { aggregate { count } }
    selesai: surat_keluar_aggregate(where: {status: {_eq: SELESAI}}) { aggregate { count } }
    diarsipkan: surat_keluar_aggregate(where: {status: {_eq: DIARSIPKAN}}) { aggregate { count } }
    bulan_ini: surat_keluar_aggregate(where: {tanggal_surat: {_gte: $awal, _lte: $akhir}}) { aggregate { count } }
    dispo_belum: disposisi_aggregate(where: {status: {_ne: SELESAI}}) { aggregate { count } }
    dispo_saya: disposisi_aggregate(where: {kepada_user_id: {_eq: $uid}, status: {_ne: SELESAI}}) { aggregate { count } }
    masuk_baru: surat_masuk_aggregate(where: {status: {_eq: BARU}}) { aggregate { count } }
    status_keluar: surat_keluar { status }
    jenis_keluar: surat_keluar { jenis_surat }
  }`,
  dashPerluTindakan: `query ($uid: uuid!) {
    keluar: surat_keluar(where: {status: {_in: [DIAJUKAN, DIVERIFIKASI]}}, order_by: {created_at: desc}, limit: 6) {
      id nomor_surat jenis_surat perihal tujuan status created_at unit_kerja { kode }
    }
    dispo: disposisi(where: {kepada_user_id: {_eq: $uid}, status: {_ne: SELESAI}}, order_by: {created_at: desc}, limit: 6) {
      id instruksi prioritas batas_waktu status surat_masuk { nomor_surat perihal }
    }
    koreksi: surat_keluar(where: {status: {_eq: PERLU_KOREKSI}, created_by: {_eq: $uid}}, limit: 4) {
      id nomor_surat perihal catatan_koreksi status
    }
  }`,

  // ---------- Surat Masuk ----------
  smList: `query ($w: surat_masuk_bool_exp!, $limit: Int!, $off: Int!) {
    surat_masuk(where: $w, order_by: {tanggal_diterima: desc}, limit: $limit, offset: $off) {
      id nomor_surat tanggal_surat tanggal_diterima pengirim perihal tujuan sifat prioritas status keterangan file_url
      creator { nama }
      disposisis { id status kepada_user { nama } instruksi }
    }
    total: surat_masuk_aggregate(where: $w) { aggregate { count } }
  }`,
  smById: `query ($id: uuid!) {
    surat_masuk_by_pk(id: $id) {
      id nomor_surat tanggal_surat tanggal_diterima pengirim perihal tujuan sifat prioritas status keterangan file_url created_at
      creator { nama }
      disposisis(order_by: {created_at: desc}) { id instruksi prioritas batas_waktu status catatan kepada_user { id nama } kepada_unit { nama_unit } dari_user { nama } }
      riwayats(order_by: {timestamp: asc}) { id status judul catatan timestamp user { nama } }
    }
  }`,
  smInsert: `mutation ($o: surat_masuk_insert_input!) { insert_surat_masuk_one(object: $o) { id nomor_surat } }`,
  smUpdate: `mutation ($id: uuid!, $o: surat_masuk_set_input!) { update_surat_masuk_by_pk(pk_columns: {id: $id}, _set: $o) { id status } }`,
  smDelete: `mutation ($id: uuid!) { delete_surat_masuk_by_pk(id: $id) { id } }`,

  // ---------- Disposisi ----------
  dispoInsert: `mutation ($o: disposisi_insert_input!) { insert_disposisi_one(object: $o) { id } }`,
  dispoUpdate: `mutation ($id: uuid!, $o: disposisi_set_input!) { update_disposisi_by_pk(pk_columns: {id: $id}, _set: $o) { id status } }`,
  dispoSaya: `query ($uid: uuid!) {
    disposisi(where: {kepada_user_id: {_eq: $uid}, status: {_ne: SELESAI}}, order_by: [{prioritas: desc}, {batas_waktu: asc}], limit: 100) {
      id instruksi prioritas batas_waktu status catatan created_at
      surat_masuk { id nomor_surat perihal pengirim }
      dari_user { nama }
    }
  }`,

  // ---------- Surat Keluar ----------
  skList: `query ($w: surat_keluar_bool_exp!, $limit: Int!, $off: Int!) {
    surat_keluar(where: $w, order_by: {created_at: desc}, limit: $limit, offset: $off) {
      id nomor_surat jenis_surat tanggal_surat tujuan perihal sifat status created_at
      unit_kerja { kode nama_unit } creator { nama } penandatangan { nama jabatan }
    }
    total: surat_keluar_aggregate(where: $w) { aggregate { count } }
  }`,
  skById: `query ($id: uuid!) {
    surat_keluar_by_pk(id: $id) {
      id nomor_surat jenis_surat tanggal_surat tujuan perihal isi sifat lampiran_ket tembusan status
      catatan_koreksi catatan_pimpinan qr_token created_at updated_at
      unit_kerja { kode nama_unit } creator { nama }
      penandatangan { nama jabatan nip }
      riwayats(order_by: {timestamp: asc}) { id status judul catatan timestamp user { nama } }
    }
  }`,
  skInsert: `mutation ($o: surat_keluar_insert_input!) { insert_surat_keluar_one(object: $o) { id nomor_surat status } }`,
  skUpdate: `mutation ($id: uuid!, $o: surat_keluar_set_input!) { update_surat_keluar_by_pk(pk_columns: {id: $id}, _set: $o) { id status } }`,
  skDelete: `mutation ($id: uuid!) { delete_surat_keluar_by_pk(id: $id) { id } }`,
  templateList: `query ($j: String) {
    template_surat(where: {status: {_eq: AKTIF}, jenis_surat: {_eq: $j}}, order_by: {nama_template: asc}) {
      id nama_template jenis_surat template_content fields
    }
  }`,

  // ---------- Arsip ----------
  arsipKeluar: `query ($w: surat_keluar_bool_exp!, $limit: Int!, $off: Int!) {
    surat_keluar(where: $w, order_by: {tanggal_surat: desc}, limit: $limit, offset: $off) {
      id nomor_surat jenis_surat tanggal_surat tujuan perihal sifat status qr_token
    }
    total: surat_keluar_aggregate(where: $w) { aggregate { count } }
  }`,
  arsipMasuk: `query ($w: surat_masuk_bool_exp!, $limit: Int!, $off: Int!) {
    surat_masuk(where: $w, order_by: {tanggal_surat: desc}, limit: $limit, offset: $off) {
      id nomor_surat tanggal_surat pengirim perihal sifat status
    }
    total: surat_masuk_aggregate(where: $w) { aggregate { count } }
  }`,

  // ---------- Tracking ----------
  cariKeluar: `query ($q: String!) {
    surat_keluar(where: {_or: [{nomor_surat: {_ilike: $q}}, {perihal: {_ilike: $q}}, {tujuan: {_ilike: $q}}]}, order_by: {created_at: desc}, limit: 20) {
      id nomor_surat jenis_surat tanggal_surat perihal tujuan status qr_token
    }
  }`,
  cariMasuk: `query ($q: String!) {
    surat_masuk(where: {_or: [{nomor_surat: {_ilike: $q}}, {perihal: {_ilike: $q}}, {pengirim: {_ilike: $q}}]}, order_by: {tanggal_diterima: desc}, limit: 20) {
      id nomor_surat tanggal_surat perihal pengirim status
    }
  }`,

  // ---------- Notifikasi ----------
  notifList: `query ($uid: uuid!) {
    notifikasi(where: {user_id: {_eq: $uid}}, order_by: {created_at: desc}, limit: 30) {
      id judul pesan jenis dibaca surat_id surat_jenis created_at
    }
  }`,
  notifBelum: `query ($uid: uuid!) {
    notifikasi_aggregate(where: {user_id: {_eq: $uid}, dibaca: {_eq: false}}) { aggregate { count } }
  }`,
  notifBaca: `mutation ($id: uuid!) { update_notifikasi_by_pk(pk_columns: {id: $id}, _set: {dibaca: true}) { id } }`,
  notifBacaSemua: `mutation ($uid: uuid!) { update_notifikasi(where: {user_id: {_eq: $uid}}, _set: {dibaca: true}) { affected_rows } }`,

  // ---------- Admin ----------
  logList: `query ($limit: Int!) { log_aktivitas(order_by: {created_at: desc}, limit: $limit) { id aktivitas modul record_id ip device created_at user { nama } } }`,
  pengaturanList: `query { pengaturan(order_by: {key: asc}) { key value } }`,
  pengaturanUpsert: `mutation ($o: pengaturan_insert_input!) { insert_pengaturan_one(object: $o, on_conflict: {constraint: pengaturan_pkey, update_columns: value}) { key } }`,
  profilInsert: `mutation ($o: users_insert_input!) { insert_users_one(object: $o) { id } }`,

  // ---------- Verifikasi QR publik ----------
  verifyByToken: `query ($t: uuid!) {
    surat_keluar(where: {qr_token: {_eq: $t}, status: {_in: [DITANDATANGANI, DIDISTRIBUSIKAN, SELESAI, DIARSIPKAN]}}, limit: 1) {
      nomor_surat jenis_surat tanggal_surat tujuan perihal status created_at
      unit_kerja { nama_unit }
      penandatangan { nama jabatan }
    }
  }`,
};

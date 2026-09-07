/* ============================================================
   SIRAT — Klien Nhost (Auth + GraphQL) + helper workflow
   Dimuat sebagai script klasik; SDK dimuat via dynamic import CDN.
   ============================================================ */
(function () {
  const S = window.SIRAT_CONFIG;
  const state = { nhost: null, ready: null };

  function sdkUrl() {
    return "https://esm.sh/@nhost/nhost-js@4";
  }

  async function init() {
    if (!state.ready) {
      state.ready = (async () => {
        const mod = await import(sdkUrl());
        const { createClient } = mod;
        state.nhost = createClient({
          subdomain: S.nhostSubdomain,
          region: S.nhostRegion,
        });
        return state.nhost;
      })().catch((e) => {
        console.error("Gagal memuat Nhost SDK:", e);
        throw e;
      });
    }
    return state.ready;
  }

  // ---------- GraphQL ----------
  async function gql(query, variables) {
    const nhost = await init();
    const res = await nhost.graphql.request({ query, variables });
    if (res.error) {
      const msg = Array.isArray(res.error) ? res.error[0].message : (res.error.message || JSON.stringify(res.error));
      throw new Error(msg);
    }
    return res.data;
  }

  // ---------- Auth ----------
  async function getSessionUser() {
    const nhost = await init();
    if (!nhost.auth.isAuthenticated.value) {
      try { await nhost.auth.refreshSession(3); } catch (_) {}
    }
    return nhost.auth.getUser();
  }

  async function signIn(email, password) {
    const nhost = await init();
    const res = await nhost.auth.signInEmail({ email, password });
    if (res.error) throw new Error(res.error.message || "Login gagal");
    return res;
  }

  async function signUp(payload) {
    const nhost = await init();
    const res = await nhost.auth.signUpEmail({
      email: payload.email,
      password: payload.password,
      options: {
        displayName: payload.nama,
        metadata: { nama: payload.nama, username: payload.username, unit_kerja_id: payload.unit_kerja_id || null },
      },
    });
    if (res.error) throw new Error(res.error.message || "Pendaftaran gagal");
    return res;
  }

  async function signOut() {
    const nhost = await init();
    try { await nhost.auth.signOut(); } catch (_) {}
  }

  // ---------- Profil aplikasi (public.users) ----------
  async function getProfile(userId) {
    const data = await gql(
      `query ($id: uuid!) {
        users_by_pk(id: $id) {
          id nama username email role jabatan nip status unit_kerja_id
          unit_kerja { id kode nama_unit jenis_unit }
        }
      }`,
      { id: userId }
    );
    return data.users_by_pk;
  }

  async function ensureProfile(user) {
    let profil = await getProfile(user.id);
    if (!profil) {
      const meta = user.metadata || {};
      await gql(
        `mutation ($id: uuid!, $nama: String!, $email: String!) {
          insert_users_one(object: { id: $id, nama: $nama, email: $email, role: "OPERATOR" }) { id }
        }`,
        { id: user.id, nama: meta.nama || user.displayName || user.email, email: user.email }
      );
      profil = await getProfile(user.id);
    }
    return profil;
  }

  // ---------- Helper workflow ----------
  function statusKelas(status) {
    return {
      DRAFT: "gray", DIAJUKAN: "blue", DIVERIFIKASI: "blue", PERLU_KOREKSI: "amber",
      DISETUJUI: "green", DITOLAK: "red", PENOMORAN: "violet", DITANDATANGANI: "green",
      DIDISTRIBUSIKAN: "violet", SELESAI: "green", DIARSIPKAN: "gray",
      BARU: "blue", DIPROSES: "amber", BELUM: "red", PROSES: "amber", AKTIF: "green", NONAKTIF: "gray",
    }[status] || "gray";
  }

  function labelStatus(status) {
    return {
      DRAFT: "Draft", DIAJUKAN: "Diajukan", DIVERIFIKASI: "Terverifikasi", PERLU_KOREKSI: "Perlu Koreksi",
      DISETUJUI: "Disetujui", DITOLAK: "Ditolak", PENOMORAN: "Penomoran", DITANDATANGANI: "Ditandatangani",
      DIDISTRIBUSIKAN: "Didistribusikan", SELESAI: "Selesai", DIARSIPKAN: "Diarsipkan",
      BARU: "Baru", DIPROSES: "Diproses", BELUM: "Belum Diproses", PROSES: "Diproses", SELESAI: "Selesai",
    }[status] || status;
  }

  const LABEL_JENIS = {
    SURAT_DINAS: "Surat Dinas", SURAT_UNDANGAN: "Undangan", SURAT_TUGAS: "Surat Tugas",
    SURAT_KETERANGAN: "Surat Keterangan", SURAT_PENGANTAR: "Surat Pengantar", NOTA_DINAS: "Nota Dinas",
    SURAT_EDARAN: "Surat Edaran", SURAT_PERMOHONAN: "Surat Permohonan",
    SURAT_PEMBERITAHUAN: "Surat Pemberitahuan", SURAT_REKOMENDASI: "Surat Rekomendasi",
  };

  function kodeJenis(jenis) {
    return {
      SURAT_DINAS: "SD", SURAT_UNDANGAN: "UN", SURAT_TUGAS: "ST", SURAT_KETERANGAN: "SK",
      SURAT_PENGANTAR: "SP", NOTA_DINAS: "ND", SURAT_EDARAN: "SE", SURAT_PERMOHONAN: "SM",
      SURAT_PEMBERITAHUAN: "PB", SURAT_REKOMENDASI: "SR",
    }[jenis] || "SD";
  }

  // Penomoran otomatis: 0001/KODE/xx/DINKES/IX/2026
  async function generateNomor(surat) {
    const tahun = new Date(surat.tanggal_surat || Date.now()).getFullYear();
    const kodeUnit = (surat.unit_kerja && surat.unit_kerja.kode) || S.kodeInstansi;
    const kodeJenis = kodeJenis(surat.jenis_surat);
    const cek = await gql(
      `query ($ku: String!, $kj: String!, $th: Int!) {
        nomor_surat_aggregate(where: { kode_unit: { _eq: $ku }, kode_jenis: { _eq: $kj }, tahun: { _eq: $th } }) { aggregate { max { nomor_urut } } }
      }`,
      { ku: kodeUnit, kj: kodeJenis, th: tahun }
    );
    const urut = (cek.nomor_surat_aggregate.aggregate.max.nomor_urut || 0) + 1;
    const bulan = S.bulanRomawi[new Date().getMonth()];
    const nomorLengkap = `${String(urut).padStart(4, "0")}/${kodeUnit}/${kodeJenis}/${S.kodeInstansi}/${bulan}/${tahun}`;
    const simpan = await gql(
      `mutation ($o: nomor_surat_insert_input!) {
        insert_nomor_surat_one(object: $o) { nomor_lengkap }
      }`,
      { o: { nomor_urut: urut, kode_unit: kodeUnit, kode_jenis: kodeJenis, tahun, nomor_lengkap: nomorLengkap, surat_id: surat.id, created_by: SIRAT.me.id } }
    );
    return simpan.insert_nomor_surat_one.nomor_lengkap;
  }

  // Catat riwayat + notifikasi + log dalam SATU transaksi Hasura (alias)
  async function catatAktivitas({ suratId, jenisSurat, status, judul, catatan, notifUserIds, notifJudul, notifPesan }) {
    const ids = (notifUserIds || []).filter(Boolean);
    const typed = `mutation ($sid: uuid!, $js: String!, $st: String!, $jd: String, $uid: uuid, $ct: String, $dv: String${ids.length ? `, $nobjs: [notifikasi_insert_input!]!` : ""}) {
      r: insert_riwayat_surat_one(object: { surat_id: $sid, jenis_surat: $js, status: $st, judul: $jd, user_id: $uid, catatan: $ct }) { id }
      ${ids.length ? "n: insert_notifikasi(objects: $nobjs) { affected_rows }" : ""}
      l: insert_log_aktivitas_one(object: { user_id: $uid, aktivitas: $st, modul: $js, record_id: $sid, device: $dv }) { id }
    }`;
    const params = { sid: suratId, js: jenisSurat, st: status, jd: judul, uid: SIRAT.me.id, ct: catatan || null, dv: navigator.userAgent };
    if (ids.length) {
      params.nobjs = ids.map((uid) => ({
        user_id: uid, judul: notifJudul || "Pembaruan surat", pesan: notifPesan || "",
        jenis: "SISTEM", surat_id: suratId, surat_jenis: jenisSurat,
      }));
    }
    await gql(typed, params);
  }

  // Render isi surat dari template + data field
  function renderTemplate(tpl, data) {
    return String(tpl || "").replace(/\{\{(\w+)\}\}/g, (_, k) => (data[k] !== undefined && data[k] !== null ? String(data[k]) : ""));
  }

  window.SIRAT_NHOST = {
    init, gql, signIn, signUp, signOut, getSessionUser, getProfile, ensureProfile,
    statusKelas, labelStatus, LABEL_JENIS, kodeJenis, generateNomor, catatAktivitas, renderTemplate,
  };
})();

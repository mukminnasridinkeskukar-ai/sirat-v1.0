/* ============================================================
   SIRAT — Modul Tracking + Arsip Digital
   ============================================================ */
(function () {
  const { $, $$, esc, toast, openModal, badge, timeline, tableWrap, exportCsv, fmtTgl } = window.UI;
  const N = window.SIRAT_NHOST;
  const Q = window.Q;

  /* ============ TRACKING (Satu Surat, Satu Tracking) ============ */
  async function modTracking(c) {
    c.innerHTML = `
      <div class="page-head"><div><h2>🔎 Tracking Surat</h2><p>Masukkan nomor surat / perihal — lihat posisi surat dan seluruh riwayatnya dalam satu halaman.</p></div></div>
      <div class="toolbar">
        <input class="input" id="tr-q" placeholder="Contoh: 0001/BID-P2P/DINKES atau 'imunisasi'" style="flex:1;max-width:none" />
        <button class="btn btn-primary" id="tr-cari">Cari</button>
      </div>
      <div id="tr-hasil"></div>`;

    async function cari() {
      const q = $("#tr-q").value.trim();
      if (!q) { toast("Masukkan kata kunci.", "err"); return; }
      $("#tr-hasil").innerHTML = `<div class="loading-block"><span class="spinner" style="border-color:var(--green-700)"></span> Mencari…</div>`;
      const like = `%${q}%`;
      const [dk, dm] = await Promise.all([
        N.gql(Q.cariKeluar, { q: like }).catch(() => ({ surat_keluar: [] })),
        N.gql(Q.cariMasuk, { q: like }).catch(() => ({ surat_masuk: [] })),
      ]);
      const hasil = [
        ...dk.surat_keluar.map((s) => ({ ...s, tipe: "KELUAR", tgl: s.tanggal_surat })),
        ...dm.surat_masuk.map((s) => ({ ...s, tipe: "MASUK", tgl: s.tanggal_surat })),
      ];
      $("#tr-hasil").innerHTML = `
        <div class="panel"><div class="panel-head"><b>Hasil (${hasil.length})</b><small class="muted">klik surat untuk melihat timeline lengkap</small></div>
        <div class="panel-body">${tableWrap("<th>Nomor</th><th>Jenis</th><th>Perihal</th><th>Tanggal</th><th>Arah</th><th>Status</th>",
          hasil.map((s) => `<tr>
            <td><button class="tlink" data-tipe="${s.tipe}" data-id="${s.id}">${esc(s.nomor_surat || "(belum bernomor)")}</button></td>
            <td>${esc(s.jenis_surat ? N.LABEL_JENIS[s.jenis_surat] || s.jenis_surat : "Surat Masuk")}</td>
            <td>${esc(s.perihal.slice(0, 50))}</td><td>${fmtTgl(s.tgl)}</td>
            <td>${badge(s.tipe === "MASUK" ? "DIAJUKAN" : "DIDISTRIBUSIKAN", s.tipe === "MASUK" ? "📥 Masuk" : "📤 Keluar")}</td>
            <td>${badge(s.status)}</td></tr>`).join(""), "Tidak ditemukan surat yang cocok.")}
        </div></div>`;
      $$("#tr-hasil .tlink").forEach((b) => b.addEventListener("click", () => {
        if (b.dataset.tipe === "MASUK") window.SIRAT.modules["surat-masuk"]($("#content"), b.dataset.id);
        else detailKeluarTracking(b.dataset.id);
      }));
    }

    async function detailKeluarTracking(id) {
      $("#tr-hasil").innerHTML = `<div class="loading-block"><span class="spinner" style="border-color:var(--green-700)"></span> Memuat…</div>`;
      const d = await N.gql(Q.skById, { id });
      const s = d.surat_keluar_by_pk;
      $("#tr-hasil").innerHTML = `
        <div class="two-col">
          <div class="panel"><div class="panel-head"><b>${esc(s.nomor_surat || "(belum bernomor)")}</b>${badge(s.status)}</div>
            <div class="panel-body">
              <table style="min-width:0">
                <tr><td class="muted" style="width:130px">Jenis</td><td>${esc(N.LABEL_JENIS[s.jenis_surat])}</td></tr>
                <tr><td class="muted">Perihal</td><td><b>${esc(s.perihal)}</b></td></tr>
                <tr><td class="muted">Tujuan</td><td>${esc(s.tujuan)}</td></tr>
                <tr><td class="muted">Tanggal</td><td>${fmtTgl(s.tanggal_surat)}</td></tr>
                <tr><td class="muted">Unit</td><td>${esc(s.unit_kerja ? s.unit_kerja.nama_unit : "-")}</td></tr>
                <tr><td class="muted">Penandatangan</td><td>${esc(s.penandatangan ? s.penandatangan.nama : "-")}</td></tr>
              </table>
              <button class="btn btn-outline btn-sm" style="margin-top:.8rem" id="tr-back">← Kembali ke hasil</button>
            </div></div>
          <div class="panel"><div class="panel-head"><b>🕘 Timeline Lengkap</b><small class="muted">Satu Surat, Satu Tracking</small></div>
            <div class="panel-body">${timeline(s.riwayats)}</div></div>
        </div>`;
      $("#tr-back").addEventListener("click", () => { modTracking($("#content")); $("#tr-q").value = $("#tr-q").defaultValue || ""; });
    }

    $("#tr-cari").addEventListener("click", cari);
    $("#tr-q").addEventListener("keydown", (e) => { if (e.key === "Enter") cari(); });
  }

  /* ============ ARSIP DIGITAL ============ */
  async function modArsip(c) {
    const tahunIni = new Date().getFullYear();
    const tahunList = [];
    for (let t = tahunIni; t >= tahunIni - 4; t--) tahunList.push(t);
    let tab = "KELUAR";
    c.innerHTML = `
      <div class="page-head"><div><h2>🗄️ Arsip Digital</h2><p>Seluruh surat terarsip — cari, pratinjau, export CSV, dan verifikasi QR.</p></div></div>
      <div class="tabs" style="max-width:280px">
        <button class="tab ${tab === "KELUAR" ? "active" : ""}" data-tab="KELUAR">📤 Surat Keluar</button>
        <button class="tab ${tab === "MASUK" ? "active" : ""}" data-tab="MASUK">📥 Surat Masuk</button>
      </div>
      <div class="toolbar">
        <input class="input" id="ar-q" placeholder="🔎 Cari nomor, perihal, pengirim/tujuan…" style="flex:1;max-width:none" />
        <select class="input" id="ar-th"><option value="">Semua Tahun</option>${tahunList.map((t) => `<option>${t}</option>`).join("")}</select>
        <button class="btn btn-outline" id="ar-exp">⬇ Export CSV</button>
      </div>
      <div class="panel"><div class="panel-body" id="ar-tabel"></div></div>`;

    let cache = [];
    async function muat() {
      $("#ar-tabel").innerHTML = `<div class="loading-block"><span class="spinner" style="border-color:var(--green-700)"></span> Memuat…</div>`;
      const q = $("#ar-q").value.trim();
      const th = $("#ar-th").value;
      const like = q ? `%${q}%` : null;
      let w;
      if (tab === "KELUAR") {
        w = { status: { _eq: "DIARSIPKAN" }, _and: [] };
        if (like) w._and.push({ _or: [{ nomor_surat: { _ilike: like } }, { perihal: { _ilike: like } }, { tujuan: { _ilike: like } }] });
        if (th) w._and.push({ tanggal_surat: { _gte: `${th}-01-01`, _lte: `${th}-12-31` } });
        if (!w._and.length) delete w._and;
        const d = await N.gql(Q.arsipKeluar, { w, limit: 200, off: 0 });
        cache = d.surat_keluar;
        $("#ar-tabel").innerHTML = tableWrap("<th>Nomor</th><th>Jenis</th><th>Perihal</th><th>Tanggal</th><th>QR</th>",
          cache.map((s) => `<tr><td><b>${esc(s.nomor_surat || "-")}</b></td><td>${esc(N.LABEL_JENIS[s.jenis_surat])}</td><td>${esc(s.perihal.slice(0, 50))}</td><td>${fmtTgl(s.tanggal_surat)}</td>
            <td>${s.qr_token ? `<button class="btn btn-sm btn-outline" data-qr="${s.qr_token}">✅ Verifikasi</button>` : "-"}</td></tr>`).join(""),
          "Belum ada surat keluar terarsip.");
      } else {
        w = { status: { _eq: "DIARSIPKAN" }, _and: [] };
        if (like) w._and.push({ _or: [{ nomor_surat: { _ilike: like } }, { perihal: { _ilike: like } }, { pengirim: { _ilike: like } }] });
        if (th) w._and.push({ tanggal_surat: { _gte: `${th}-01-01`, _lte: `${th}-12-31` } });
        if (!w._and.length) delete w._and;
        const d = await N.gql(Q.arsipMasuk, { w, limit: 200, off: 0 });
        cache = d.surat_masuk;
        $("#ar-tabel").innerHTML = tableWrap("<th>Nomor</th><th>Pengirim</th><th>Perihal</th><th>Tanggal</th><th>Aksi</th>",
          cache.map((s) => `<tr><td><b>${esc(s.nomor_surat)}</b></td><td>${esc(s.pengirim)}</td><td>${esc(s.perihal.slice(0, 50))}</td><td>${fmtTgl(s.tanggal_surat)}</td>
            <td><button class="btn btn-sm btn-outline" data-buka="${s.id}">Detail</button></td></tr>`).join(""),
          "Belum ada surat masuk terarsip.");
      }
      $$("[data-qr]", c).forEach((b) => b.addEventListener("click", () => {
        openModal(`<h3>QR Verifikasi Dokumen</h3><div class="qr-box" id="ar-qrbox"></div>
          <p class="muted small">Pindai QR untuk membuka halaman verifikasi publik.</p>
          <div class="modal-foot"><button class="btn btn-outline" data-close>Tutup</button></div>`);
        window.UI.renderQr($("#ar-qrbox"), `${location.origin}${location.pathname}?verify=${b.dataset.qr}`);
      }));
      $$("[data-buka]", c).forEach((b) => b.addEventListener("click", () => window.SIRAT.modules["surat-masuk"]($("#content"), b.dataset.buka)));
    }

    let timer = null;
    $("#ar-q").addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(muat, 350); });
    $("#ar-th").addEventListener("change", muat);
    $("#ar-exp").addEventListener("click", () => {
      if (!cache.length) { toast("Tidak ada data untuk diexport.", "err"); return; }
      if (tab === "KELUAR") exportCsv("arsip-surat-keluar.csv", [["Nomor", "Jenis", "Tanggal", "Tujuan", "Perihal"]].concat(cache.map((s) => [s.nomor_surat, s.jenis_surat, s.tanggal_surat, s.tujuan, s.perihal])));
      else exportCsv("arsip-surat-masuk.csv", [["Nomor", "Tanggal", "Pengirim", "Perihal"]].concat(cache.map((s) => [s.nomor_surat, s.tanggal_surat, s.pengirim, s.perihal])));
    });
    $$(".tabs [data-tab]", c).forEach((t) => t.addEventListener("click", () => {
      tab = t.dataset.tab;
      $$(".tabs [data-tab]", c).forEach((x) => x.classList.toggle("active", x === t));
      muat();
    }));
    await muat();
  }

  window.SIRAT.modules.tracking = modTracking;
  window.SIRAT.modules.arsip = modArsip;
})();

/* ============================================================
   SIRAT — Modul Surat Keluar: workflow 11 status, buat surat
   (template + form dinamis + editor + preview), verifikasi,
   persetujuan + penomoran otomatis, TTD + QR, cetak/unduh.
   ============================================================ */
(function () {
  const { $, $$, esc, toast, openModal, confirmDialog, fmtTgl, badge, timeline, tableWrap } = window.UI;
  const N = window.SIRAT_NHOST;
  const Q = window.Q;
  const S = window.SIRAT_CONFIG;

  let filter = { q: null, status: null };
  let halaman = 0;
  const PER_HAL = 20;

  /* ============ DAFTAR SURAT KELUAR ============ */
  async function modSuratKeluar(c, bukaId) {
    if (bukaId) return detailKeluar(c, bukaId);
    c.innerHTML = `
      <div class="page-head">
        <div><h2>📤 Surat Keluar</h2><p>Workflow lengkap: draft → diajukan → diverifikasi → disetujui → bernomor → ditandatangani → didistribusikan → arsip.</p></div>
        <div style="display:flex;gap:.6rem">
          <button class="btn btn-outline" id="exp-sk">⬇ Export</button>
          ${["SUPERADMIN", "ADMIN", "OPERATOR"].includes(SIRAT.me.role) ? `<button class="btn btn-primary" id="btn-buat">+ Buat Surat</button>` : ""}
        </div>
      </div>
      <div class="toolbar">
        <input class="input" id="f-q" placeholder="🔎 Cari nomor, tujuan, perihal…" style="flex:1;max-width:none;min-width:180px" />
        <select class="input" id="f-status">
          <option value="">Semua Status</option>
          ${["DRAFT", "DIAJUKAN", "DIVERIFIKASI", "PERLU_KOREKSI", "DISETUJUI", "DITOLAK", "PENOMORAN", "DITANDATANGANI", "DIDISTRIBUSIKAN", "SELESAI", "DIARSIPKAN"].map((s) => `<option>${s}</option>`).join("")}
        </select>
        <label class="check" style="margin:0"><input type="checkbox" id="f-milik" checked /> Buatan saya</label>
      </div>
      <div class="panel"><div class="panel-body" id="tabel-sk"></div></div>`;

    async function muat() {
      $("#tabel-sk").innerHTML = `<div class="loading-block"><span class="spinner" style="border-color:var(--green-700)"></span> Memuat…</div>`;
      let w = { _and: [] };
      if (filter.q) w._and.push({ _or: [{ nomor_surat: { _ilike: `%${filter.q}%` } }, { tujuan: { _ilike: `%${filter.q}%` } }, { perihal: { _ilike: `%${filter.q}%` } }] });
      if (filter.status) w._and.push({ status: { _eq: filter.status } });
      if (filter.milik) w._and.push({ created_by: { _eq: SIRAT.me.id } });
      if (!w._and.length) w = {};
      const d = await N.gql(Q.skList, { w, limit: PER_HAL, off: halaman * PER_HAL });
      $("#tabel-sk").innerHTML = `
        ${tableWrap("<th>Nomor / Perihal</th><th>Jenis</th><th>Tujuan</th><th>Tanggal</th><th>Status</th><th>Pembuat</th>",
          d.surat_keluar.map((s) => `
            <tr>
              <td><button class="tlink" data-id="${s.id}">${esc(s.nomor_surat || "(belum bernomor)")}</button><br><small class="muted">${esc(s.perihal.slice(0, 55))}${s.perihal.length > 55 ? "…" : ""}</small></td>
              <td>${esc(N.LABEL_JENIS[s.jenis_surat] || s.jenis_surat)}</td>
              <td>${esc(s.tujuan.slice(0, 40))}</td>
              <td>${fmtTgl(s.tanggal_surat)}</td>
              <td>${badge(s.status)}</td>
              <td><small>${esc(s.creator ? s.creator.nama : "-")}</small></td>
            </tr>`).join(""), "Belum ada surat keluar. Klik <b>Buat Surat</b> untuk mulai menulis.")}
        <div style="display:flex;justify-content:space-between;padding-top:.8rem">
          <small class="muted">Total ${d.total.aggregate.count} surat</small>
          <div style="display:flex;gap:.5rem">
            <button class="btn btn-sm btn-outline" id="pg-prev" ${halaman === 0 ? "disabled" : ""}>← Sebelumnya</button>
            <button class="btn btn-sm btn-outline" id="pg-next" ${(halaman + 1) * PER_HAL >= d.total.aggregate.count ? "disabled" : ""}>Berikutnya →</button>
          </div>
        </div>`;
      $$("#tabel-sk .tlink").forEach((b) => b.addEventListener("click", () => detailKeluar(c, b.dataset.id)));
      $("#pg-prev").addEventListener("click", () => { halaman--; muat(); });
      $("#pg-next").addEventListener("click", () => { halaman++; muat(); });
    }
    let timer = null;
    $("#f-q").addEventListener("input", (e) => { clearTimeout(timer); timer = setTimeout(() => { filter.q = e.target.value || null; halaman = 0; muat(); }, 350); });
    $("#f-status").addEventListener("change", (e) => { filter.status = e.target.value || null; halaman = 0; muat(); });
    $("#f-milik").addEventListener("change", (e) => { filter.milik = e.target.checked; halaman = 0; muat(); });
    $("#btn-buat").addEventListener("click", () => modBuatSurat(c));
    $("#exp-sk").addEventListener("click", async () => {
      let w = { _and: [] };
      if (filter.q) w._and.push({ _or: [{ nomor_surat: { _ilike: `%${filter.q}%` } }, { tujuan: { _ilike: `%${filter.q}%` } }] });
      if (filter.status) w._and.push({ status: { _eq: filter.status } });
      if (!w._and.length) w = {};
      const d = await N.gql(Q.skList, { w, limit: 500, off: 0 });
      window.UI.exportCsv("surat-keluar.csv", [["Nomor", "Jenis", "Tanggal", "Tujuan", "Perihal", "Status"]].concat(d.surat_keluar.map((s) => [s.nomor_surat, s.jenis_surat, s.tanggal_surat, s.tujuan, s.perihal, s.status])));
    });
    await muat();
  }

  /* ============ VERIFIKASI & PERSETUJUAN ============ */
  async function modAntrian(c, jenis) {
    const statusCari = jenis === "verifikasi" ? ["DIAJUKAN"] : ["DIVERIFIKASI"];
    const d = await N.gql(Q.skList, { w: { status: { _in: statusCari } }, limit: 100, off: 0 });
    const riwayat = await N.gql(Q.skList, { w: { status: { _in: ["PERLU_KOREKSI", "DITOLAK", "DISETUJUI"] } }, limit: 30, off: 0 });
    c.innerHTML = `
      <div class="page-head"><div><h2>${jenis === "verifikasi" ? "📋 Verifikasi Surat" : "✅ Persetujuan Pimpinan"}</h2>
        <p>${jenis === "verifikasi" ? "Periksa kelengkapan surat sebelum diteruskan ke pimpinan." : "Keputusan akhir: setujui (terbit nomor), kembalikan, atau tolak dengan catatan."}</p></div></div>
      <div class="panel"><div class="panel-head"><b>${jenis === "verifikasi" ? "Menunggu Verifikasi" : "Menunggu Persetujuan"} (${d.surat_keluar.length})</b></div>
        <div class="panel-body">${tableWrap("<th>Surat</th><th>Jenis</th><th>Perihal</th><th>Tanggal</th><th>Aksi</th>",
          d.surat_keluar.map((s) => `<tr><td><b>${esc(s.nomor_surat || "(belum bernomor)")}</b></td><td>${esc(N.LABEL_JENIS[s.jenis_surat])}</td><td>${esc(s.perihal.slice(0, 50))}</td><td>${fmtTgl(s.tanggal_surat)}</td>
            <td><button class="btn btn-sm btn-primary" data-id="${s.id}">${jenis === "verifikasi" ? "Periksa" : "Proses"}</button></td></tr>`).join(""),
          "Tidak ada surat menunggu. 🎉")}
        </div></div>
      ${jenis === "persetujuan" ? `<div class="panel"><div class="panel-head"><b>Keputusan Terakhir</b></div><div class="panel-body">${tableWrap("<th>Surat</th><th>Perihal</th><th>Status</th>",
        riwayat.surat_keluar.map((s) => `<tr><td>${esc(s.nomor_surat || "-")}</td><td>${esc(s.perihal.slice(0, 50))}</td><td>${badge(s.status)}</td></tr>`).join(""),
        "Belum ada keputusan.")}</div></div>` : ""}`;
    $$("button[data-id]", c).forEach((b) => b.addEventListener("click", () => detailKeluar(c, b.dataset.id)));
  }

  /* ============ DETAIL + AKSI WORKFLOW ============ */
  async function detailKeluar(c, id) {
    c.innerHTML = `<div class="loading-block"><span class="spinner" style="border-color:var(--green-700)"></span> Memuat…</div>`;
    const d = await N.gql(Q.skById, { id });
    const s = d.surat_keluar_by_pk;
    const r = SIRAT.me.role;
    const milik = s.creator && s.creator.id === SIRAT.me.id;
    const aksi = [];

    // Operator pemilik: ajukan / perbaiki
    if (["SUPERADMIN", "ADMIN", "OPERATOR"].includes(r) && ["DRAFT", "PERLU_KOREKSI"].includes(s.status)) {
      aksi.push(`<button class="btn btn-primary" data-wf="DIAJUKAN">📤 Ajukan</button>`);
      if (milik || r !== "OPERATOR") aksi.push(`<button class="btn btn-outline" id="btn-edit">✏️ Edit</button>`);
    }
    // Verifikator
    if (["SUPERADMIN", "VERIFIKATOR"].includes(r) && s.status === "DIAJUKAN") {
      aksi.push(`<button class="btn btn-primary" data-wf="DIVERIFIKASI">✔ Setujui Verifikasi</button>`);
      aksi.push(`<button class="btn btn-amber" data-wf="PERLU_KOREKSI">↩ Kembalikan (Koreksi)</button>`);
      aksi.push(`<button class="btn btn-danger" data-wf="DITOLAK">✕ Tolak</button>`);
    }
    // Pimpinan
    if (["SUPERADMIN", "PIMPINAN"].includes(r) && s.status === "DIVERIFIKASI") {
      aksi.push(`<button class="btn btn-primary" data-wf="SETUJUI">✅ Setujui + Terbitkan Nomor</button>`);
      aksi.push(`<button class="btn btn-amber" data-wf="KEMBALIKAN">↩ Kembalikan</button>`);
      aksi.push(`<button class="btn btn-danger" data-wf="DITOLAK">✕ Tolak</button>`);
    }
    // Penandatanganan (admin/Superadmin) — status DISETUJUI/PENOMORAN
    if (["SUPERADMIN", "ADMIN"].includes(r) && ["DISETUJUI", "PENOMORAN"].includes(s.status)) {
      aksi.push(`<button class="btn btn-primary" data-wf="DITANDATANGANI">✍️ Tanda Tangan + QR</button>`);
    }
    if (["SUPERADMIN", "ADMIN"].includes(r) && s.status === "DITANDATANGANI") {
      aksi.push(`<button class="btn btn-primary" data-wf="DIDISTRIBUSIKAN">📮 Distribusikan</button>`);
    }
    if (["SUPERADMIN", "ADMIN"].includes(r) && s.status === "DIDISTRIBUSIKAN") {
      aksi.push(`<button class="btn btn-primary" data-wf="SELESAI">✔ Tandai Selesai</button>`);
    }
    if (["SUPERADMIN", "ADMIN"].includes(r) && s.status === "SELESAI") {
      aksi.push(`<button class="btn btn-outline" data-wf="DIARSIPKAN">🗄 Arsipkan</button>`);
    }
    if (["SUPERADMIN", "ADMIN"].includes(r) && ["DRAFT", "DITOLAK"].includes(s.status)) {
      aksi.push(`<button class="btn btn-danger" id="btn-hapus">🗑 Hapus</button>`);
    }

    c.innerHTML = `
      <div class="page-head">
        <div><small class="muted"><button class="tlink" id="back-list">← Surat Keluar</button></small>
          <h2>${esc(s.nomor_surat || "(belum bernomor)")}</h2><p>${esc(s.perihal)}</p></div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">${aksi.join("")}</div>
      </div>
      <div class="two-col">
        <div class="panel"><div class="panel-head"><b>📄 Surat</b>${badge(s.status)}</div>
          <div class="panel-body">${renderSurat(s)}
            <div class="no-print" style="display:flex;gap:.5rem;margin-top:1rem;flex-wrap:wrap">
              <button class="btn btn-outline btn-sm" id="btn-print">🖨 Cetak / Simpan PDF</button>
              ${s.qr_token ? `<button class="btn btn-outline btn-sm" id="btn-qrurl">🔗 Salin Tautan Verifikasi</button>` : ""}
            </div>
          </div>
        </div>
        <div>
          <div class="panel"><div class="panel-head"><b>🕘 Riwayat Tracking</b></div><div class="panel-body">${timeline(s.riwayats)}</div></div>
          <div class="panel"><div class="panel-head"><b>ℹ️ Metadata</b></div><div class="panel-body">
            <table style="min-width:0">
              <tr><td class="muted">Jenis</td><td>${esc(N.LABEL_JENIS[s.jenis_surat])}</td></tr>
              <tr><td class="muted">Sifat</td><td>${esc(s.sifat)}</td></tr>
              <tr><td class="muted">Lampiran</td><td>${esc(s.lampiran_ket || "-")}</td></tr>
              <tr><td class="muted">Tembusan</td><td>${esc(s.tembusan || "-")}</td></tr>
              <tr><td class="muted">Unit</td><td>${esc(s.unit_kerja ? s.unit_kerja.nama_unit : "-")}</td></tr>
              <tr><td class="muted">Penandatangan</td><td>${esc(s.penandatangan ? s.penandatangan.nama + " — " + s.penandatangan.jabatan : "-")}</td></tr>
              <tr><td class="muted">Pembuat</td><td>${esc(s.creator ? s.creator.nama : "-")}</td></tr>
            </table>
            ${s.catatan_koreksi ? `<div class="tl-note" style="margin-top:.6rem">⚠️ <b>Catatan koreksi:</b> ${esc(s.catatan_koreksi)}</div>` : ""}
            ${s.catatan_pimpinan ? `<div class="tl-note" style="margin-top:.6rem">📌 <b>Catatan pimpinan:</b> ${esc(s.catatan_pimpinan)}</div>` : ""}
            <div class="qr-box" id="qr-box"></div>
          </div></div>
        </div>
      </div>`;

    $("#back-list").addEventListener("click", () => modSuratKeluar(c));
    $("#btn-print").addEventListener("click", () => window.print());
    const btnQr = $("#btn-qrurl");
    if (btnQr) btnQr.addEventListener("click", () => {
      const url = `${location.origin}${location.pathname}?verify=${s.qr_token}`;
      navigator.clipboard.writeText(url).then(() => toast("Tautan verifikasi disalin.", "ok"), () => prompt("Tautan verifikasi:", url));
    });
    if (s.qr_token) window.UI.renderQr($("#qr-box"), `${location.origin}${location.pathname}?verify=${s.qr_token}`);

    $$("[data-wf]", c).forEach((b) => b.addEventListener("click", () => aksiWorkflow(c, s, b.dataset.wf)));
    const btnEdit = $("#btn-edit");
    if (btnEdit) btnEdit.addEventListener("click", () => modBuatSurat(c, s));
    const btnHapus = $("#btn-hapus");
    if (btnHapus) btnHapus.addEventListener("click", async () => {
      if (!(await confirmDialog("Hapus surat ini?", "Surat akan dihapus permanen.", "Ya, hapus"))) return;
      await N.gql(Q.skDelete, { id: s.id });
      toast("Surat dihapus.", "ok");
      modSuratKeluar(c);
    });
  }

  async function aksiWorkflow(c, s, tujuan) {
    // Aksi dengan catatan wajib
    const PERLU_CATATAN = { PERLU_KOREKSI: "Catatan koreksi untuk pembuat surat", DITOLAK: "Alasan penolakan", KEMBALIKAN: "Catatan pengembalian" };
    let catatan = null;
    if (PERLU_CATATAN[tujuan]) {
      const m = openModal(`<h3>${esc(PERLU_CATATAN[tujuan])}</h3>
        <textarea class="input" id="wf-catatan" rows="3" placeholder="Tuliskan catatan…"></textarea>
        <div class="modal-foot"><button class="btn btn-outline" data-close>Batal</button><button class="btn btn-primary" id="wf-ok">Kirim</button></div>`, { sticky: true });
      $("#wf-ok", m.el).addEventListener("click", () => {
        catatan = $("#wf-catatan", m.el).value.trim();
        if (!catatan) { toast("Catatan wajib diisi.", "err"); return; }
        m.close(); proses();
      });
      return;
    }
    proses();

    async function proses() {
      try {
        if (tujuan === "SETUJUI") {
          const nomor = await N.generateNomor(s);
          await N.gql(Q.skUpdate, { id: s.id, o: { status: "DISETUJUI", nomor_surat: nomor, catatan_pimpinan: catatan } });
          await N.catatAktivitas({ suratId: s.id, jenisSurat: "KELUAR", status: "DISETUJUI", judul: s.perihal, catatan: `Disetujui, nomor ${nomor}`, notifUserIds: [s.created_by], notifJudul: "✅ Surat disetujui", notifPesan: `Surat "${s.perihal}" disetujui dengan nomor ${nomor}.` });
          toast(`Disetujui. Nomor: ${nomor}`, "ok");
        } else if (tujuan === "KEMBALIKAN") {
          await N.gql(Q.skUpdate, { id: s.id, o: { status: "PERLU_KOREKSI", catatan_pimpinan: catatan } });
          await N.catatAktivitas({ suratId: s.id, jenisSurat: "KELUAR", status: "PERLU_KOREKSI", judul: s.perihal, catatan, notifUserIds: [s.created_by], notifJudul: "↩ Surat dikembalikan", notifPesan: `Surat "${s.perihal}" dikembalikan pimpinan: ${catatan}` });
          toast("Surat dikembalikan untuk koreksi.", "ok");
        } else if (tujuan === "DITANDATANGANI") {
          await N.gql(Q.skUpdate, { id: s.id, o: { status: "DITANDATANGANI" } });
          await N.catatAktivitas({ suratId: s.id, jenisSurat: "KELUAR", status: "DITANDATANGANI", judul: s.perihal, catatan: `Ditandatangani ${s.penandatangan ? "oleh " + s.penandatangan.nama : ""} — QR verifikasi aktif`, notifUserIds: [s.created_by], notifJudul: "✍️ Surat ditandatangani", notifPesan: `Surat "${s.perihal}" telah ditandatangani digital.` });
          toast("Surat ditandatangani. QR verifikasi aktif.", "ok");
        } else {
          await N.gql(Q.skUpdate, { id: s.id, o: { status: tujuan, ...(catatan ? { catatan_koreksi: catatan } : {}) } });
          await N.catatAktivitas({ suratId: s.id, jenisSurat: "KELUAR", status: tujuan, judul: s.perihal, catatan, notifUserIds: [s.created_by], notifJudul: `Surat: ${N.labelStatus(tujuan)}`, notifPesan: `Surat "${s.perihal}" kini berstatus ${N.labelStatus(tujuan)}.` });
          toast(`Status surat: ${N.labelStatus(tujuan)}`, "ok");
        }
        detailKeluar(c, s.id);
      } catch (ex) {
        toast(`Gagal: ${ex.message}`, "err");
      }
    }
  }

  /* ============ RENDER SURAT BERKOP ============ */
  function renderSurat(s) {
    const tgl = new Date(s.tanggal_surat);
    const tglStr = `${tgl.getDate()} ${window.UI.BULAN[tgl.getMonth()]} ${tgl.getFullYear()}`;
    const kodeJenis = N.kodeJenis(s.jenis_surat);
    return `<div class="preview-surat">
      <div class="kop">
        ${S.logoUrl ? `<img src="${esc(S.logoUrl)}" alt="Logo" />` : `<div style="font-size:2rem">🏛️</div>`}
        <div>
          <h4>PEMERINTAH KABUPATEN KUTAI KARTANEGARA</h4>
          <h4 style="font-size:1.15rem">DINAS KESEHATAN</h4>
          <p class="muted" style="font-size:.8rem">${esc(S.alamatInstansi)}</p>
        </div>
      </div>
      <div style="text-align:center;margin:.8rem 0">
        <u><b>${esc(N.LABEL_JENIS[s.jenis_surat] || s.jenis_surat).toUpperCase()} NOMOR ${esc(s.nomor_surat || "…/" + kodeJenis + "/" + S.kodeInstansi + "/…/" + tgl.getFullYear())}</b></u>
      </div>
      <table class="surat-meta">
        <tr><td>Tanggal</td><td>:</td><td>${tglStr}</td></tr>
        <tr><td>Sifat</td><td>:</td><td>${esc(s.sifat)}</td></tr>
        <tr><td>Lampiran</td><td>:</td><td>${esc(s.lampiran_ket || "-")}</td></tr>
        <tr><td>Perihal</td><td>:</td><td><b>${esc(s.perihal)}</b></td></tr>
      </table>
      <p>Kepada Yth.<br><b>${esc(s.tujuan)}</b></p>
      <div style="margin-top:1rem">${s.isi || "<p class='muted'>(isi surat kosong)</p>"}</div>
      <div style="margin-top:1.4rem;text-align:right">
        ${s.tembusan ? `<div style="text-align:left;font-size:.85rem;margin-top:1rem"><b>Tembusan:</b><br>${esc(s.tembusan).replace(/;/g, "<br>")}</div>` : ""}
        <p style="margin:0">Ditetapkan oleh:</p>
        <b style="display:block;min-height:1.2rem">${esc(s.penandatangan ? s.penandatangan.nama : "……………")}</b>
        <small>${esc(s.penandatangan ? s.penandatangan.jabatan : "")}</small>
        ${s.qr_token ? `<div class="qr-box"><div id="kop-qr"></div><small class="muted">Pindai QR untuk verifikasi keaslian</small></div>` : ""}
      </div>
    </div>`;
  }

  /* ============ BUAT / EDIT SURAT (template + editor + preview) ============ */
  async function modBuatSurat(c, existing) {
    const [tpls, units, pejabats] = await Promise.all([
      N.gql(Q.templateList, { j: existing ? existing.jenis_surat : null }),
      N.gql(Q.unitList),
      N.gql(Q.pejabatList),
    ]);
    let jenisAwal = existing ? existing.jenis_surat : "SURAT_DINAS";
    if (!existing && !tpls.template_surat.length) {
      const semua = await N.gql(`query { template_surat(where: {status: {_eq: AKTIF}}) { id nama_template jenis_surat template_content fields } }`);
      tpls.template_surat = semua.template_surat;
    }
    let tplAktif = existing ? tpls.template_surat.find((t) => t.jenis_surat === existing.jenis_surat) || tpls.template_surat[0] : tpls.template_surat[0];
    let fieldsData = {};

    c.innerHTML = `
      <div class="page-head"><div><h2>📝 ${existing ? "Edit Surat" : "Buat Surat"}</h2><p>Pilih template → isi form dinamis → tulis isi surat → pratinjau → simpan.</p></div></div>
      <div class="panel"><div class="panel-body">
        <div class="grid-2">
          <label>Jenis surat
            <select class="input" id="bs-jenis">
              ${Object.entries(N.LABEL_JENIS).map(([k, v]) => `<option value="${k}" ${k === jenisAwal ? "selected" : ""}>${v}</option>`).join("")}
            </select></label>
          <label>Template baku
            <select class="input" id="bs-tpl"><option value="">— Tanpa template —</option>
              ${tpls.template_surat.map((t) => `<option value="${t.id}" ${tplAktif && tplAktif.id === t.id ? "selected" : ""}>${esc(t.nama_template)}</option>`).join("")}
            </select></label>
        </div>
        <div id="bs-fields"></div>
        <div class="grid-2">
          <label>Tanggal surat<input class="input" type="date" id="bs-tgl" value="${existing ? existing.tanggal_surat : new Date().toISOString().slice(0, 10)}" /></label>
          <label>Sifat<select class="input" id="bs-sifat">${["BIASA", "PENTING", "SEGERA", "RAHASIA"].map((x) => `<option ${existing && existing.sifat === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>
          <label>Unit kerja penghasil<select class="input" id="bs-unit">
            ${units.unit_kerja.map((u) => `<option value="${u.id}" ${existing && existing.unit_kerja_id === u.id ? "selected" : ""} data-kode="${esc(u.kode)}">${esc(u.nama_unit)}</option>`).join("")}
          </select></label>
          <label>Penandatangan<select class="input" id="bs-ttd">
            ${pejabats.pejabat.map((p) => `<option value="${p.id}" ${existing && existing.penandatangan_id === p.id ? "selected" : ""}>${esc(p.nama)} — ${esc(p.jabatan)}</option>`).join("")}
          </select></label>
          <label>Tujuan / Kepada<input class="input" id="bs-tujuan" value="${esc(existing ? existing.tujuan : "")}" placeholder="Kepala UPTD…, Seluruh staf…" /></label>
          <label>Keterangan lampiran<input class="input" id="bs-lampiran" value="${esc(existing ? existing.lampiran_ket || "" : "")}" placeholder="1 (satu) berkas" /></label>
        </div>
        <label>Tembusan (pisahkan dengan ;)<input class="input" id="bs-tembusan" value="${esc(existing ? existing.tembusan || "" : "")}" /></label>
        <label>Perihal<input class="input" id="bs-perihal" value="${esc(existing ? existing.perihal : "")}" placeholder="Perihal surat" /></label>
        <label>Isi surat
          <div class="toolbar" style="padding:.4rem;margin-bottom:.3rem" id="bs-toolbar">
            <button type="button" class="btn btn-sm btn-outline" data-cmd="bold"><b>B</b></button>
            <button type="button" class="btn btn-sm btn-outline" data-cmd="italic"><i>I</i></button>
            <button type="button" class="btn btn-sm btn-outline" data-cmd="underline"><u>U</u></button>
            <button type="button" class="btn btn-sm btn-outline" data-cmd="insertUnorderedList">• Daftar</button>
            <button type="button" class="btn btn-sm btn-outline" data-cmd="insertOrderedList">1. Daftar</button>
            <button type="button" class="btn btn-sm btn-outline" data-cmd="justifyLeft">⬅ Rata kiri</button>
            <button type="button" class="btn btn-sm btn-outline" data-cmd="justifyCenter">↔ Tengah</button>
            <button type="button" class="btn btn-sm btn-outline" data-cmd="justifyFull">↔ Rata kanan-kiri</button>
          </div>
          <div class="input" id="bs-isi" contenteditable="true" style="min-height:160px;font-family:'Times New Roman',serif"></div>
        </label>
        <div id="bs-err" class="form-error" hidden></div>
        <div class="modal-foot" style="justify-content:flex-start">
          <button class="btn btn-outline" id="bs-preview">👁 Pratinjau</button>
          <button class="btn btn-outline" id="bs-draft">💾 Simpan Draft</button>
          <button class="btn btn-primary" id="bs-ajukan">📤 Simpan &amp; Ajukan</button>
        </div>
      </div></div>
      <div class="panel" id="bs-preview-panel" hidden><div class="panel-head"><b>Pratinjau Surat</b></div><div class="panel-body" id="bs-preview-body"></div></div>`;

    if (existing) $("#bs-isi").innerHTML = existing.isi || "";

    function renderFields() {
      const fields = tplAktif && tplAktif.fields ? (typeof tplAktif.fields === "string" ? JSON.parse(tplAktif.fields) : tplAktif.fields) : [];
      $("#bs-fields").innerHTML = fields.length ? `<p class="muted small" style="margin:.6rem 0 .2rem">Form dinamis template — data akan disisipkan ke bagian bertanda {{…}}:</p><div class="grid-2">${fields.map((f) => `
        <label>${f.replace(/_/g, " ")}<input class="input bs-field" data-f="${esc(f)}" value="${esc(fieldsData[f] || "")}" /></label>`).join("")}</div>` : "";
      $$(".bs-field").forEach((inp) => inp.addEventListener("input", () => { fieldsData[inp.dataset.f] = inp.value; }));
    }
    renderFields();

    $("#bs-tpl").addEventListener("change", (e) => {
      tplAktif = tpls.template_surat.find((t) => t.id === e.target.value) || null;
      fieldsData = {};
      renderFields();
      if (tplAktif) {
        $("#bs-jenis").value = tplAktif.jenis_surat;
        if (!$("#bs-isi").innerHTML.trim()) $("#bs-isi").innerHTML = tplAktif.template_content;
      }
    });
    $("#bs-jenis").addEventListener("change", (e) => {
      jenisAwal = e.target.value;
      window.SIRAT.modules["buat-surat-refresh"] = null;
      // Muat ulang daftar template utk jenis baru
      N.gql(Q.templateList, { j: jenisAwal }).then((d) => {
        tpls.template_surat = d.template_surat;
        $("#bs-tpl").innerHTML = `<option value="">— Tanpa template —</option>` + d.template_surat.map((t) => `<option value="${t.id}">${esc(t.nama_template)}</option>`).join("");
      });
    });

    $$("#bs-toolbar [data-cmd]").forEach((b) => b.addEventListener("mousedown", (e) => {
      e.preventDefault();
      document.execCommand(b.dataset.cmd, false, null);
    }));

    function kumpulkan() {
      const unitSel = $("#bs-unit");
      return {
        jenis_surat: $("#bs-jenis").value,
        tanggal_surat: $("#bs-tgl").value,
        sifat: $("#bs-sifat").value,
        unit_kerja_id: unitSel.value || null,
        unit_kerja: unitSel.selectedOptions[0] ? { kode: unitSel.selectedOptions[0].dataset.kode } : null,
        penandatangan_id: $("#bs-ttd").value || null,
        tujuan: $("#bs-tujuan").value.trim(),
        perihal: $("#bs-perihal").value.trim(),
        lampiran_ket: $("#bs-lampiran").value.trim() || null,
        tembusan: $("#bs-tembusan").value.trim() || null,
        isi: N.renderTemplate($("#bs-isi").innerHTML, fieldsData),
      };
    }

    function validasi(d) {
      const masalah = [];
      if (!d.perihal) masalah.push("Perihal wajib diisi.");
      if (!d.tujuan) masalah.push("Tujuan wajib diisi.");
      if (!d.isi || d.isi.replace(/<[^>]*>/g, "").trim() === "") masalah.push("Isi surat belum ditulis.");
      return masalah;
    }

    $("#bs-preview").addEventListener("click", () => {
      const d = kumpulkan();
      const masalah = validasi(d);
      const err = $("#bs-err");
      if (masalah.length) { err.innerHTML = masalah.join("<br>"); err.hidden = false; return; }
      err.hidden = true;
      $("#bs-preview-panel").hidden = false;
      $("#bs-preview-body").innerHTML = renderSurat({ ...d, nomor_surat: existing ? existing.nomor_surat : null, penandatangan: pejabats.pejabat.find((p) => p.id === $("#bs-ttd").value) || null });
      $("#bs-preview-panel").scrollIntoView({ behavior: "smooth" });
    });

    async function simpan(ajukan) {
      const d = kumpulkan();
      const masalah = validasi(d);
      const err = $("#bs-err");
      if (masalah.length) { err.innerHTML = masalah.join("<br>"); err.hidden = false; return; }
      try {
        let idSurat;
        if (existing) {
          await N.gql(Q.skUpdate, { id: existing.id, o: { ...d, status: ajukan ? "DIAJUKAN" : existing.status, catatan_koreksi: ajukan ? null : existing.catatan_koreksi } });
          idSurat = existing.id;
        } else {
          const unitSel = $("#bs-unit");
          const o = { ...d, unit_kerja: undefined, created_by: SIRAT.me.id };
          const r = await N.gql(Q.skInsert, { o });
          idSurat = r.insert_surat_keluar_one.id;
        }
        await N.catatAktivitas({
          suratId: idSurat, jenisSurat: "KELUAR", status: ajukan ? "DIAJUKAN" : "DRAFT", judul: d.perihal,
          catatan: ajukan ? "Surat diajukan untuk verifikasi" : "Draft disimpan",
          notifJudul: ajukan ? "📤 Surat diajukan" : "💾 Draft disimpan",
          notifPesan: `Surat "${d.perihal}" ${ajukan ? "diajukan, menunggu verifikasi." : "disimpan sebagai draft."}`,
        });
        toast(ajukan ? "Surat diajukan ke verifikator." : "Draft tersimpan.", "ok");
        modSuratKeluar(c, idSurat);
      } catch (ex) {
        err.textContent = ex.message; err.hidden = false;
      }
    }
    $("#bs-draft").addEventListener("click", () => simpan(false));
    $("#bs-ajukan").addEventListener("click", () => simpan(true));
  }

  window.SIRAT.modules["surat-keluar"] = modSuratKeluar;
  window.SIRAT.modules.verifikasi = (c) => modAntrian(c, "verifikasi");
  window.SIRAT.modules.persetujuan = (c) => modAntrian(c, "persetujuan");
  window.SIRAT.modules["buat-surat"] = modBuatSurat;
  void tableWrap; void timeline; void fmtTgl;
})();

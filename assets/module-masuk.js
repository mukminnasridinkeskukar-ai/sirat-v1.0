/* ============================================================
   SIRAT — Modul Surat Masuk + Disposisi
   ============================================================ */
(function () {
  const { $, $$, esc, toast, openModal, confirmDialog, fmtTgl, fmtUkuran, badge, timeline, tableWrap, exportCsv } = window.UI;
  const N = window.SIRAT_NHOST;
  const Q = window.Q;

  let filter = { q: null, status: null };
  let halaman = 0;
  const PER_HAL = 20;

  async function modSuratMasuk(c, bukaId) {
    if (bukaId) return detailMasuk(c, bukaId);
    c.innerHTML = `
      <div class="page-head">
        <div><h2>📥 Surat Masuk</h2><p>Registrasi, verifikasi, disposisi, dan arsip surat yang masuk ke Dinas.</p></div>
        <div style="display:flex;gap:.6rem">
          <button class="btn btn-outline" id="exp-sm">⬇ Export</button>
          ${["SUPERADMIN", "ADMIN", "OPERATOR"].includes(SIRAT.me.role) ? `<button class="btn btn-primary" id="tambah-sm">+ Registrasi Surat Masuk</button>` : ""}
        </div>
      </div>
      <div class="toolbar">
        <input class="input" id="f-q" placeholder="🔎 Cari nomor, pengirim, perihal…" style="flex:1;max-width:none;min-width:180px" />
        <select class="input" id="f-status">
          <option value="">Semua Status</option>
          ${["BARU", "DIPROSES", "SELESAI", "DIARSIPKAN"].map((s) => `<option>${s}</option>`).join("")}
        </select>
      </div>
      <div class="panel"><div class="panel-body" id="tabel-sm"></div></div>`;

    async function muat() {
      $("#tabel-sm").innerHTML = `<div class="loading-block"><span class="spinner" style="border-color:var(--green-700)"></span> Memuat…</div>`;
      let w = { _and: [] };
      if (filter.q) w._and.push({ _or: [{ nomor_surat: { _ilike: `%${filter.q}%` } }, { pengirim: { _ilike: `%${filter.q}%` } }, { perihal: { _ilike: `%${filter.q}%` } }] });
      if (filter.status) w._and.push({ status: { _eq: filter.status } });
      if (!w._and.length) w = {};
      const d = await N.gql(Q.smList, { w, limit: PER_HAL, off: halaman * PER_HAL });
      const rows = d.surat_masuk.map((s) => `
        <tr>
          <td><button class="tlink" data-id="${s.id}">${esc(s.nomor_surat)}</button><br><small class="muted">${esc(s.perihal.slice(0, 60))}${s.perihal.length > 60 ? "…" : ""}</small></td>
          <td>${esc(s.pengirim)}</td>
          <td>${fmtTgl(s.tanggal_surat)}</td>
          <td>${badge(s.sifat === "PENTING" ? "DIAJUKAN" : s.sifat === "RAHASIA" ? "DITOLAK" : s.sifat === "SEGERA" ? "PERLU_KOREKSI" : "DRAFT", s.sifat)}<br>${badge(s.prioritas === "DARURAT" || s.prioritas === "TINGGI" ? "PERLU_KOREKSI" : "DRAFT", s.prioritas)}</td>
          <td>${badge(s.status)}</td>
          <td>${s.disposisis.length ? `<small>${esc(s.disposisis[0].kepada_user ? "→ " + s.disposisis[0].kepada_user.nama : "")}</small>` : '<small class="muted">-</small>'}</td>
        </tr>`).join("");
      $("#tabel-sm").innerHTML = `
        ${tableWrap("<th>Nomor / Perihal</th><th>Pengirim</th><th>Tanggal</th><th>Sifat</th><th>Status</th><th>Disposisi</th>", rows, "Belum ada surat masuk. Klik <b>Registrasi Surat Masuk</b> untuk menambah.")}
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:.8rem">
          <small class="muted">Total ${d.total.aggregate.count} surat</small>
          <div style="display:flex;gap:.5rem">
            <button class="btn btn-sm btn-outline" id="pg-prev" ${halaman === 0 ? "disabled" : ""}>← Sebelumnya</button>
            <button class="btn btn-sm btn-outline" id="pg-next" ${(halaman + 1) * PER_HAL >= d.total.aggregate.count ? "disabled" : ""}>Berikutnya →</button>
          </div>
        </div>`;
      $$("#tabel-sm .tlink").forEach((b) => b.addEventListener("click", () => detailMasuk(c, b.dataset.id)));
      $("#pg-prev").addEventListener("click", () => { halaman--; muat(); });
      $("#pg-next").addEventListener("click", () => { halaman++; muat(); });
    }

    let timer = null;
    $("#f-q").addEventListener("input", (e) => { clearTimeout(timer); timer = setTimeout(() => { filter.q = e.target.value || null; halaman = 0; muat(); }, 350); });
    $("#f-status").addEventListener("change", (e) => { filter.status = e.target.value || null; halaman = 0; muat(); });
    const btnTambah = $("#tambah-sm");
    if (btnTambah) btnTambah.addEventListener("click", () => formMasuk());
    $("#exp-sm").addEventListener("click", async () => {
      let w = filter.q || filter.status ? { _and: [] } : {};
      if (filter.q) w._and.push({ _or: [{ nomor_surat: { _ilike: `%${filter.q}%` } }, { pengirim: { _ilike: `%${filter.q}%` } }] });
      if (filter.status) w._and.push({ status: { _eq: filter.status } });
      if (w._and && !w._and.length) w = {};
      const d = await N.gql(Q.smList, { w, limit: 500, off: 0 });
      exportCsv("surat-masuk.csv", [["Nomor", "Tanggal", "Pengirim", "Perihal", "Sifat", "Prioritas", "Status"]].concat(d.surat_masuk.map((s) => [s.nomor_surat, s.tanggal_surat, s.pengirim, s.perihal, s.sifat, s.prioritas, s.status])));
    });

    await muat();
  }

  function formMasuk(existing) {
    const m = openModal(`
      <h3>${existing ? "Edit Surat Masuk" : "Registrasi Surat Masuk"}</h3>
      <form id="fm-sm">
        <div class="grid-2">
          <label>Nomor surat<input class="input" name="nomor_surat" required value="${esc(existing ? existing.nomor_surat : "")}" placeholder="800/123/KEC/2026" /></label>
          <label>Tanggal surat<input class="input" type="date" name="tanggal_surat" required value="${existing ? existing.tanggal_surat : new Date().toISOString().slice(0, 10)}" /></label>
          <label>Pengirim<input class="input" name="pengirim" required value="${esc(existing ? existing.pengirim : "")}" placeholder="Instansi pengirim" /></label>
          <label>Tujuan / unit tujuan<input class="input" name="tujuan" value="${esc(existing ? existing.tujuan || "" : "")}" /></label>
        </div>
        <label>Perihal<textarea class="input" name="perihal" rows="2" required>${esc(existing ? existing.perihal : "")}</textarea></label>
        <div class="grid-2">
          <label>Sifat<select class="input" name="sifat">${["BIASA", "PENTING", "SEGERA", "RAHASIA"].map((s) => `<option ${existing && existing.sifat === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
          <label>Prioritas<select class="input" name="prioritas">${["RENDAH", "NORMAL", "TINGGI", "DARURAT"].map((s) => `<option ${existing && existing.prioritas === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
        </div>
        <label>URL berkas (opsional — Nhost Storage)<input class="input" name="file_url" value="${esc(existing ? existing.file_url || "" : "")}" placeholder="https://…/dokumen.pdf" /></label>
        <div id="err-sm" class="form-error" hidden></div>
        <div class="modal-foot">
          <button type="button" class="btn btn-outline" data-close>Batal</button>
          <button type="submit" class="btn btn-primary">${existing ? "Simpan Perubahan" : "Simpan & Catat Riwayat"}</button>
        </div>
      </form>`);
    $("#fm-sm", m.el).addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const obj = Object.fromEntries(f.entries());
      try {
        if (existing) {
          await N.gql(Q.smUpdate, { id: existing.id, o: obj });
          await N.catatAktivitas({ suratId: existing.id, jenisSurat: "MASUK", status: existing.status, judul: existing.perihal, catatan: "Data surat diperbarui" });
        } else {
          const d = await N.gql(Q.smInsert, { o: { ...obj, created_by: SIRAT.me.id } });
          await N.catatAktivitas({ suratId: d.insert_surat_masuk_one.id, jenisSurat: "MASUK", status: "BARU", judul: obj.perihal, catatan: "Surat diregistrasi" });
        }
        m.close(); toast("Surat masuk tersimpan.", "ok");
        window.SIRAT.modules["surat-masuk"]($("#content"));
      } catch (ex) {
        const err = $("#err-sm", m.el); err.textContent = ex.message; err.hidden = false;
      }
    });
  }

  async function detailMasuk(c, id) {
    c.innerHTML = `<div class="loading-block"><span class="spinner" style="border-color:var(--green-700)"></span> Memuat…</div>`;
    const d = await N.gql(Q.smById, { id });
    const s = d.surat_masuk_by_pk;
    const bolehUbah = ["SUPERADMIN", "ADMIN"].includes(SIRAT.me.role);
    const aksi = [];
    if (s.status === "BARU") aksi.push(`<button class="btn btn-amber" data-aksi="DIPROSES">▶ Proses</button>`);
    if (s.status === "DIPROSES") aksi.push(`<button class="btn btn-primary" data-aksi="SELESAI">✔ Tandai Selesai</button>`);
    if (["SELESAI", "DIPROSES"].includes(s.status)) aksi.push(`<button class="btn btn-outline" data-aksi="DIARSIPKAN">🗄 Arsipkan</button>`);
    if (["SUPERADMIN", "ADMIN", "PIMPINAN", "VERIFIKATOR"].includes(SIRAT.me.role)) aksi.push(`<button class="btn btn-primary" id="btn-dispo">📌 Buat Disposisi</button>`);
    if (bolehUbah) aksi.push(`<button class="btn btn-outline" id="btn-edit">✏️ Edit</button>`);
    if (["SUPERADMIN", "ADMIN"].includes(SIRAT.me.role)) aksi.push(`<button class="btn btn-danger" id="btn-hapus">🗑 Hapus</button>`);

    c.innerHTML = `
      <div class="page-head">
        <div><small class="muted"><button class="tlink" id="back-list">← Surat Masuk</button></small>
          <h2>${esc(s.nomor_surat)}</h2><p>${esc(s.perihal)}</p></div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">${aksi.join("")}</div>
      </div>
      ${s.status === "BARU" ? "" : ""}
      <div class="two-col">
        <div class="panel"><div class="panel-head"><b>📄 Detail Surat</b>${badge(s.status)}</div>
          <div class="panel-body">
            <table style="min-width:0">
              <tr><td class="muted" style="width:150px">Pengirim</td><td><b>${esc(s.pengirim)}</b></td></tr>
              <tr><td class="muted">Tanggal surat</td><td>${fmtTgl(s.tanggal_surat)}</td></tr>
              <tr><td class="muted">Diterima</td><td>${fmtTgl(s.tanggal_diterima, true)}</td></tr>
              <tr><td class="muted">Sifat / Prioritas</td><td>${esc(s.sifat)} / ${esc(s.prioritas)}</td></tr>
              <tr><td class="muted">Tujuan</td><td>${esc(s.tujuan || "-")}</td></tr>
              <tr><td class="muted">Dicatat oleh</td><td>${esc(s.creator ? s.creator.nama : "-")}</td></tr>
              ${s.file_url ? `<tr><td class="muted">Berkas</td><td><a href="${esc(s.file_url)}" target="_blank" rel="noopener">📎 Unduh lampiran</a></td></tr>` : ""}
            </table>
          </div>
        </div>
        <div class="panel"><div class="panel-head"><b>🕘 Riwayat Tracking</b></div>
          <div class="panel-body">${timeline(s.riwayats)}</div>
        </div>
      </div>
      <div class="panel"><div class="panel-head"><b>📌 Disposisi (${s.disposisis.length})</b></div>
        <div class="panel-body">
          ${s.disposisis.map((x) => `
            <div style="padding:.7rem 0;border-bottom:1px solid #f1f5f9">
              <b style="font-size:.9rem">${esc(x.instruksi)}</b> ${badge(x.status)}
              <p class="muted small">Dari: ${esc(x.dari_user ? x.dari_user.nama : "-")} → Kepada: ${esc(x.kepada_user ? x.kepada_user.nama : x.kepada_unit ? x.kepada_unit.nama_unit : "-")}
              · Batas: ${fmtTgl(x.batas_waktu)} · Prioritas: ${esc(x.prioritas)}</p>
              ${x.catatan ? `<div class="tl-note">📝 ${esc(x.catatan)}</div>` : ""}
              ${x.kepada_user && x.kepada_user.id === SIRAT.me.id && x.status !== "SELESAI" ? `
                <div style="display:flex;gap:.4rem;margin-top:.4rem">
                  <button class="btn btn-sm btn-amber" data-did="${x.id}" data-dst="PROSES">Mulai Proses</button>
                  <button class="btn btn-sm btn-primary" data-did="${x.id}" data-dst="SELESAI">Selesaikan</button>
                </div>` : ""}
            </div>`).join("") || '<div class="empty-block" style="padding:1.2rem">Belum ada disposisi.</div>'}
        </div>
      </div>`;

    $("#back-list").addEventListener("click", () => modSuratMasuk(c));
    $$("[data-aksi]", c).forEach((b) => b.addEventListener("click", async () => {
      const dst = b.dataset.aksi;
      await N.gql(Q.smUpdate, { id: s.id, o: { status: dst } });
      await N.catatAktivitas({ suratId: s.id, jenisSurat: "MASUK", status: dst, judul: s.perihal, catatan: `Status diubah ke ${dst}` });
      toast(`Status surat: ${dst}`, "ok");
      detailMasuk(c, id);
    }));
    const btnEdit = $("#btn-edit");
    if (btnEdit) btnEdit.addEventListener("click", () => formMasuk(s));
    const btnHapus = $("#btn-hapus");
    if (btnHapus) btnHapus.addEventListener("click", async () => {
      if (!(await confirmDialog("Hapus surat ini?", "Surat beserta disposisi dan riwayatnya akan dihapus permanen.", "Ya, hapus"))) return;
      await N.gql(Q.smDelete, { id: s.id });
      toast("Surat dihapus.", "ok");
      modSuratMasuk(c);
    });
    const btnDispo = $("#btn-dispo");
    if (btnDispo) btnDispo.addEventListener("click", () => formDisposisi(s, () => detailMasuk(c, id)));
    $$("[data-did]", c).forEach((b) => b.addEventListener("click", async () => {
      await N.gql(Q.dispoUpdate, { id: b.dataset.did, o: { status: b.dataset.dst, catatan: b.dataset.dst === "SELESAI" ? "Diselesaikan oleh penerima" : "Mulai diproses" } });
      toast("Status disposisi diperbarui.", "ok");
      detailMasuk(c, id);
    }));
  }

  async function formDisposisi(surat, selesai) {
    const [users, units] = await Promise.all([N.gql(Q.userList, { w: {} }), N.gql(Q.unitList)]);
    const m = openModal(`
      <h3>📌 Buat Disposisi</h3>
      <p class="muted small">Surat: ${esc(surat.nomor_surat)} — ${esc(surat.perihal)}</p>
      <form id="fm-dispo">
        <label>Disposisi kepada — pengguna
          <select class="input" name="kepada_user_id"><option value="">— Pilih pengguna —</option>
            ${users.users.filter((u) => u.status === "AKTIF" && u.id !== SIRAT.me.id).map((u) => `<option value="${u.id}">${esc(u.nama)} (${esc(u.role)})</option>`).join("")}
          </select></label>
        <label>atau — unit kerja
          <select class="input" name="kepada_unit_id"><option value="">— Pilih unit —</option>
            ${units.unit_kerja.map((u) => `<option value="${u.id}">${esc(u.nama_unit)}</option>`).join("")}
          </select></label>
        <label>Instruksi<textarea class="input" name="instruksi" rows="2" required placeholder="Mis.: Proses data, koordinasi dengan UPTD…"></textarea></label>
        <div class="grid-2">
          <label>Prioritas<select class="input" name="prioritas">${["RENDAH", "NORMAL", "TINGGI", "DARURAT"].map((p) => `<option>${p}</option>`).join("")}</select></label>
          <label>Batas waktu<input class="input" type="date" name="batas_waktu" /></label>
        </div>
        <label>Catatan<textarea class="input" name="catatan" rows="2"></textarea></label>
        <div id="err-dispo" class="form-error" hidden></div>
        <div class="modal-foot"><button type="button" class="btn btn-outline" data-close>Batal</button>
          <button type="submit" class="btn btn-primary">Kirim Disposisi</button></div>
      </form>`);
    $("#fm-dispo", m.el).addEventListener("submit", async (e) => {
      e.preventDefault();
      const obj = Object.fromEntries(new FormData(e.target).entries());
      if (!obj.kepada_user_id && !obj.kepada_unit_id) {
        const err = $("#err-dispo", m.el); err.textContent = "Pilih pengguna atau unit kerja tujuan."; err.hidden = false; return;
      }
      const o = {
        surat_masuk_id: surat.id, dari_user_id: SIRAT.me.id, instruksi: obj.instruksi,
        prioritas: obj.prioritas, batas_waktu: obj.batas_waktu || null, catatan: obj.catatan || null,
        kepada_user_id: obj.kepada_user_id || null, kepada_unit_id: obj.kepada_unit_id || null,
      };
      try {
        await N.gql(Q.dispoInsert, { o });
        if (o.kepada_user_id) {
          await N.catatAktivitas({
            suratId: surat.id, jenisSurat: "MASUK", status: "DIDISPOSISIKAN", judul: surat.perihal,
            catatan: `Disposisi: ${obj.instruksi}`, notifUserIds: [o.kepada_user_id],
            notifJudul: "📌 Disposisi baru", notifPesan: `${SIRAT.me.nama} mendisposisikan surat ${surat.nomor_surat}: ${obj.instruksi}`,
          });
        }
        if (surat.status === "BARU") await N.gql(Q.smUpdate, { id: surat.id, o: { status: "DIPROSES" } });
        m.close(); toast("Disposisi terkirim.", "ok");
        selesai && selesai();
      } catch (ex) {
        const err = $("#err-dispo", m.el); err.textContent = ex.message; err.hidden = false;
      }
    });
  }

  // Modul daftar disposisi milik saya
  async function modDisposisi(c) {
    const d = await N.gql(Q.dispoSaya, { uid: SIRAT.me.id });
    c.innerHTML = `<div class="page-head"><div><h2>📌 Disposisi untuk Saya</h2><p>Instruksi dari pimpinan/atasan yang harus ditindaklanjuti.</p></div></div>
      <div class="panel"><div class="panel-body">
        ${d.disposisi.map((x) => {
          const lewat = x.batas_waktu && new Date(x.batas_waktu) < new Date() && x.status !== "SELESAI";
          return `<div style="padding:.8rem 0;border-bottom:1px solid #f1f5f9">
            <b>${esc(x.surat_masuk.nomor_surat)}</b> ${badge(x.status)} ${lewat ? '<span class="badge red">⚠ Melewati batas</span>' : ""}
            <p class="muted small">${esc(x.surat_masuk.perihal)} — dari ${esc(x.dari_user ? x.dari_user.nama : "-")}</p>
            <p style="font-size:.9rem">📌 ${esc(x.instruksi)}</p>
            <p class="small ${lewat ? "" : "muted"}">Batas waktu: <b>${fmtTgl(x.batas_waktu)}</b> · Prioritas: ${esc(x.prioritas)}</p>
            ${x.status !== "SELESAI" ? `<div style="display:flex;gap:.4rem;margin-top:.4rem">
              <button class="btn btn-sm btn-amber" data-did="${x.id}" data-dst="PROSES">Mulai Proses</button>
              <button class="btn btn-sm btn-primary" data-did="${x.id}" data-dst="SELESAI">Selesaikan</button>
              <button class="btn btn-sm btn-outline" data-buka="${x.surat_masuk.id}">Buka Surat</button>
            </div>` : x.catatan ? `<div class="tl-note">📝 ${esc(x.catatan)}</div>` : ""}
          </div>`;
        }).join("") || '<div class="empty-block"><span class="big">🎉</span>Tidak ada disposisi menunggu tindak lanjut.</div>'}
      </div></div>`;
    $$("[data-did]", c).forEach((b) => b.addEventListener("click", async () => {
      await N.gql(Q.dispoUpdate, { id: b.dataset.did, o: { status: b.dataset.dst, catatan: b.dataset.dst === "SELESAI" ? "Diselesaikan oleh penerima" : "Mulai diproses" } });
      toast("Status disposisi diperbarui.", "ok");
      modDisposisi(c);
    }));
    $$("[data-buka]", c).forEach((b) => b.addEventListener("click", () => modSuratMasuk(c, b.dataset.buka)));
  }

  window.SIRAT.modules["surat-masuk"] = modSuratMasuk;
  window.SIRAT.modules.disposisi = modDisposisi;
  window.SIRAT.formDisposisi = formDisposisi;
  void fmtUkuran; void tableWrap; void exportCsv;
})();

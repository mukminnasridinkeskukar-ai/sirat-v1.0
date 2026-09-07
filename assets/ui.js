/* ============================================================
   SIRAT — Helper UI: DOM, toast, modal, format, timeline
   ============================================================ */
(function () {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function show(el, yes) { if (el) el.hidden = !yes; }

  // ---------- Toast ----------
  function toast(msg, jenis) {
    const box = document.createElement("div");
    box.className = `toast ${jenis || ""}`;
    box.textContent = msg;
    $("#toasts").appendChild(box);
    setTimeout(() => box.remove(), 3800);
  }

  // ---------- Modal ----------
  function openModal(html, opts) {
    const o = opts || {};
    const back = document.createElement("div");
    back.className = "modal-backdrop";
    back.innerHTML = `<div class="modal ${o.lg ? "lg" : ""}">${html}</div>`;
    document.getElementById("modal-root").appendChild(back);
    back.addEventListener("mousedown", (e) => { if (e.target === back && !o.sticky) close(); });
    function close() { back.remove(); if (o.onClose) o.onClose(); }
    $$("[data-close]", back).forEach((b) => b.addEventListener("click", close));
    return { el: back, close };
  }

  function confirmDialog(judul, pesan, yaLabel) {
    return new Promise((resolve) => {
      const m = openModal(`
        <h3>${esc(judul)}</h3><p class="muted">${esc(pesan)}</p>
        <div class="modal-foot">
          <button class="btn btn-outline" data-close>Batal</button>
          <button class="btn btn-primary" data-ya>${esc(yaLabel || "Ya, lanjutkan")}</button>
        </div>`);
      $("[data-ya]", m.el).addEventListener("click", () => { m.close(); resolve(true); });
      m.el.querySelector(".modal-backdrop") && null;
      $("[data-close]", m.el).forEach((b) => b.addEventListener("click", () => resolve(false)));
    });
  }

  // ---------- Tanggal & angka ----------
  const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  function fmtTgl(v, denganJam) {
    if (!v) return "-";
    const d = new Date(v);
    const tgl = `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
    if (!denganJam) return tgl;
    return `${tgl}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  function fmtUkuran(b) {
    if (!b) return "0 KB";
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
    return `${(b / 1024 / 1024).toFixed(2)} MB`;
  }

  // ---------- Badge ----------
  function badge(status, label) {
    const kelas = window.SIRAT_NHOST.statusKelas(status);
    return `<span class="badge ${kelas}">${esc(label || window.SIRAT_NHOST.labelStatus(status))}</span>`;
  }

  // ---------- Timeline tracking ----------
  function timeline(riwayats) {
    const list = [...(riwayats || [])].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    if (!list.length) return `<div class="empty-block"><span class="big">🕘</span>Belum ada riwayat.</div>`;
    return `<div class="timeline">${list.map((r) => `
      <div class="tl-item done">
        <b>${esc(window.SIRAT_NHOST.labelStatus(r.status))}</b>
        <small>${esc(r.user ? r.user.nama : "Sistem")} · ${fmtTgl(r.timestamp, true)}</small>
        ${r.catatan ? `<div class="tl-note">📝 ${esc(r.catatan)}</div>` : ""}
      </div>`).join("")}</div>`;
  }

  // ---------- Tabel sederhana ----------
  function tableWrap(headHtml, bodyHtml, kosongMsg) {
    if (!bodyHtml) return `<div class="empty-block"><span class="big">📭</span>${esc(kosongMsg || "Belum ada data.")}</div>`;
    return `<div class="table-wrap"><table><thead><tr>${headHtml}</tr><tbody>${bodyHtml}</tbody></table></div>`;
  }

  // ---------- Ekspor CSV ----------
  function exportCsv(namaFile, rows) {
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = namaFile;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Berkas CSV diunduh.", "ok");
  }

  // ---------- QR (lazy load lib — berkas lokal, tanpa CDN) ----------
  let qrLibPromise = null;
  function loadQrLib() {
    if (!qrLibPromise) {
      qrLibPromise = new Promise((resolve, reject) => {
        if (window.QRCode) { resolve(); return; }
        const s = document.createElement("script");
        s.src = new URL("assets/vendor/qrcode.min.js", document.baseURI).href;
        s.onload = resolve; s.onerror = () => reject(new Error("Gagal memuat pustaka QR"));
        document.head.appendChild(s);
      });
    }
    return qrLibPromise;
  }
  async function renderQr(container, text) {
    await loadQrLib();
    container.innerHTML = "";
    // eslint-disable-next-line no-new
    new QRCode(container, { text, width: 150, height: 150, correctLevel: QRCode.CorrectLevel.M });
  }

  window.UI = { $, $$, esc, show, toast, openModal, confirmDialog, fmtTgl, fmtUkuran, badge, timeline, tableWrap, exportCsv, renderQr, BULAN };
})();

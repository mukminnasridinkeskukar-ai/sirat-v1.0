/* ============================================================
   SIRAT — App core: router, auth, shell, dashboard, admin, notifikasi
   ============================================================ */
(function () {
  const { $, $$, esc, show, toast, openModal, confirmDialog, fmtTgl, badge, timeline, tableWrap, exportCsv, BULAN } = window.UI;
  const N = window.SIRAT_NHOST;
  const S = window.SIRAT_CONFIG;
  const Q = window.Q;

  const SIRAT = (window.SIRAT = {
    me: null, // { id, nama, role, unitKode, unitNama, jabatan }
    modules: {},
    view: "landing",
  });

  const MENU = [
    { id: "dashboard", ico: "🏠", label: "Dashboard", roles: ["SUPERADMIN", "ADMIN", "VERIFIKATOR", "PIMPINAN", "OPERATOR", "VIEWER"] },
    { id: "surat-masuk", ico: "📥", label: "Surat Masuk", roles: ["SUPERADMIN", "ADMIN", "VERIFIKATOR", "PIMPINAN", "OPERATOR", "VIEWER"] },
    { id: "surat-keluar", ico: "📤", label: "Surat Keluar", roles: ["SUPERADMIN", "ADMIN", "VERIFIKATOR", "PIMPINAN", "OPERATOR", "VIEWER"] },
    { id: "buat-surat", ico: "📝", label: "Buat Surat", roles: ["SUPERADMIN", "ADMIN", "OPERATOR"] },
    { id: "verifikasi", ico: "📋", label: "Verifikasi", roles: ["SUPERADMIN", "VERIFIKATOR"] },
    { id: "persetujuan", ico: "✅", label: "Persetujuan", roles: ["SUPERADMIN", "PIMPINAN"] },
    { id: "disposisi", ico: "📌", label: "Disposisi", roles: ["SUPERADMIN", "ADMIN", "PIMPINAN", "OPERATOR"] },
    { id: "tracking", ico: "🔎", label: "Tracking", roles: ["SUPERADMIN", "ADMIN", "VERIFIKATOR", "PIMPINAN", "OPERATOR", "VIEWER"] },
    { id: "arsip", ico: "🗄️", label: "Arsip", roles: ["SUPERADMIN", "ADMIN", "VERIFIKATOR", "PIMPINAN", "OPERATOR", "VIEWER"] },
    { grp: "ADMINISTRASI", roles: ["SUPERADMIN", "ADMIN"] },
    { id: "admin-users", ico: "👥", label: "Pengguna", roles: ["SUPERADMIN", "ADMIN"] },
    { id: "admin-template", ico: "📄", label: "Template Surat", roles: ["SUPERADMIN", "ADMIN"] },
    { id: "admin-nomor", ico: "🔢", label: "Nomor Surat", roles: ["SUPERADMIN", "ADMIN", "VERIFIKATOR"] },
    { id: "admin-log", ico: "📊", label: "Log Aktivitas", roles: ["SUPERADMIN", "ADMIN"] },
  ];

  const JUDUL = {
    dashboard: ["Dashboard Persuratan", "Ringkasan aktivitas persuratan"],
    "surat-masuk": ["Surat Masuk", "Registrasi, verifikasi, disposisi, dan arsip surat masuk"],
    "surat-keluar": ["Surat Keluar", "Workflow surat keluar: draft hingga arsip"],
    "buat-surat": ["Buat Surat", "Tulis surat dari template baku"],
    verifikasi: ["Verifikasi Surat", "Periksa surat yang diajukan"],
    persetujuan: ["Persetujuan Pimpinan", "Keputusan pimpinan atas surat terverifikasi"],
    disposisi: ["Disposisi", "Instruksi dan tindak lanjut surat masuk"],
    tracking: ["Tracking Surat", "Lacak posisi surat — Satu Surat, Satu Tracking"],
    arsip: ["Arsip Digital", "Seluruh surat terarsip, siap dicari dan diunduh"],
    "admin-users": ["Manajemen Pengguna", "Daftar profil pengguna SIRAT"],
    "admin-template": ["Template Surat", "Kelola template baku 10 jenis surat"],
    "admin-nomor": ["Register Nomor Surat", "Seluruh nomor yang telah diterbitkan"],
    "admin-log": ["Log Aktivitas", "Jejak audit seluruh aktivitas"],
  };

  // ================= ROUTER =================
  function setView(name) {
    SIRAT.view = name;
    ["landing", "auth", "app", "verify", "fatal"].forEach((v) => show($("#view-" + v), v === name));
    window.scrollTo(0, 0);
  }

  function goto(modul, arg) {
    const fn = SIRAT.modules[modul];
    const judul = JUDUL[modul] || [modul, ""];
    $("#appbar-title").innerHTML = `<b>${esc(judul[0])}</b>`;
    $("#appbar-sub").textContent = S.namaInstansi;
    const c = $("#content");
    c.innerHTML = `<div class="loading-block"><span class="spinner" style="border-color:var(--green-700);border-top-color:transparent"></span> Memuat…</div>`;
    $$("#menu button").forEach((b) => b.classList.toggle("active", b.dataset.modul === modul));
    $("#sidebar").classList.remove("open");
    show($("#drawer-backdrop"), false);
    if (!fn) { c.innerHTML = `<div class="empty-block"><span class="big">🚧</span>Modul belum tersedia.</div>`; return; }
    Promise.resolve(fn(c, arg)).catch((e) => {
      console.error(e);
      c.innerHTML = `<div class="empty-block"><span class="big">⚠️</span><b>Gagal memuat data.</b><p>${esc(e.message)}</p></div>`;
    });
  }

  function renderMenu() {
    const m = $("#menu");
    m.innerHTML = MENU.filter((x) => !x.grp || x.roles.includes(SIRAT.me.role))
      .map((x) => x.grp
        ? `<div class="grp">${x.grp}</div>`
        : `<button data-modul="${x.id}">${x.ico} ${x.label}</button>`)
      .join("");
    $$("button[data-modul]", m).forEach((b) => b.addEventListener("click", () => goto(b.dataset.modul)));
  }

  function renderUser() {
    const inisial = (SIRAT.me.nama || "?").trim().charAt(0).toUpperCase();
    $("#userchip").innerHTML = `<span class="avatar">${esc(inisial)}</span><span><b>${esc(SIRAT.me.nama)}</b><small>${esc(SIRAT.me.role)}</small></span>`;
    $("#side-user").innerHTML = `<b>${esc(SIRAT.me.nama)}</b><span>${esc(SIRAT.me.role)}${SIRAT.me.unitKode ? " — " + esc(SIRAT.me.unitKode) : ""}</span>`;
  }

  // ================= LANDING / LOGIN =================
  function showLanding() { setView("landing"); }
  function showAuth() { setView("auth"); }

  async function afterLogin() {
    const user = await N.getSessionUser();
    if (!user) { showAuth(); return; }
    const profil = await N.ensureProfile(user);
    SIRAT.me = {
      id: user.id,
      nama: profil.nama,
      role: profil.role || "OPERATOR",
      jabatan: profil.jabatan,
      unitKode: profil.unit_kerja ? profil.unit_kerja.kode : null,
      unitNama: profil.unit_kerja ? profil.unit_kerja.nama_unit : null,
      unitKerjaId: profil.unit_kerja_id,
    };
    renderMenu(); renderUser(); setView("app");
    startNotifPolling();
    goto("dashboard");
    toast(`Selamat datang, ${profil.nama}!`, "ok");
    logAktivitas("LOGIN", "AUTH", user.id);
  }

  async function doLogout() {
    const ok = await confirmDialog("Keluar dari SIRAT?", "Sesi Anda akan diakhiri.", "Ya, keluar");
    if (!ok) return;
    if (SIRAT.me) logAktivitas("LOGOUT", "AUTH", SIRAT.me.id);
    await N.signOut();
    stopNotifPolling();
    SIRAT.me = null;
    showLanding();
    toast("Anda telah keluar.", "ok");
  }

  // ================= DASHBOARD =================
  const PALET_JENIS = ["#059669", "#0891b2", "#7c3aed", "#d97706", "#dc2626", "#0f766e"];

  async function modDashboard(c) {
    const today = new Date();
    const awal = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const akhir = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
    const [d, tindakan] = await Promise.all([
      N.gql(Q.dashStats, { uid: SIRAT.me.id, awal, akhir }),
      N.gql(Q.dashPerluTindakan, { uid: SIRAT.me.id }),
    ]);
    const stat = (label, num, ico, kelas, judul) => `
      <div class="stat" title="${esc(judul || label)}"><div><small>${label}</small><span class="num">${num}</span></div><div class="ico ${kelas}">${ico}</div></div>`;
    const hitungJenis = {};
    d.jenis_keluar.forEach((x) => { hitungJenis[x.jenis_surat] = (hitungJenis[x.jenis_surat] || 0) + 1; });
    const jenisTop = Object.entries(hitungJenis).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const totalJenis = d.jenis_keluar.length || 1;
    const totalSemua = d.masuk_total.aggregate.count + d.keluar_total.aggregate.count;

    // Sapaan + identitas
    const jam = today.getHours();
    const sapa = jam < 11 ? "Selamat pagi" : jam < 15 ? "Selamat siang" : jam < 19 ? "Selamat sore" : "Selamat malam";
    const namaDepan = (SIRAT.me.nama || "").trim().split(/\s+/)[0] || "Pengguna";
    const tglHariIni = `${today.getDate()} ${BULAN[today.getMonth()]} ${today.getFullYear()}`;
    const bolehTulis = ["SUPERADMIN", "ADMIN", "OPERATOR"].includes(SIRAT.me.role);
    const tombolTulis = bolehTulis
      ? `<button class="btn btn-primary" data-goto="buat-surat">📝 Buat Surat</button>`
      : "";

    // State kosong: panduan mulai cepat alih-alih deretan kartu "0"
    const masihKosong = totalSemua === 0 && d.dispo_saya.aggregate.count === 0;
    if (masihKosong) {
      c.innerHTML = `
        <div class="dash-hello">
          <div><h2>${sapa}, ${esc(namaDepan)} 👋</h2>
          <p class="muted small">${tglHariIni} · <span class="badge blue">${esc(SIRAT.me.role)}</span>${SIRAT.me.unitNama ? " · " + esc(SIRAT.me.unitNama) : ""}</p></div>
          ${tombolTulis}
        </div>
        <div class="panel"><div class="panel-body empty-block" style="padding:3rem 1.4rem">
          <span class="big">🚀</span>
          <b style="font-size:1.05rem">Mulai persuratan digital Anda</b>
          <p class="muted" style="max-width:460px;margin:.4rem auto 0">Belum ada surat tercatat. Buat surat keluar pertama atau registrasikan surat masuk — seluruh proses akan tercatat dan terlacak otomatis.</p>
          <div class="hero-actions" style="justify-content:center;margin-top:1.2rem">
            ${bolehTulis ? `<button class="btn btn-primary" data-goto="buat-surat">📝 Buat Surat Pertama</button>` : ""}
            <button class="btn btn-outline" data-goto="surat-masuk">📥 Registrasi Surat Masuk</button>
            <button class="btn btn-outline" data-goto="tracking">🔎 Coba Tracking</button>
          </div>
        </div></div>`;
      return;
    }

    c.innerHTML = `
      <div class="dash-hello">
        <div><h2>${sapa}, ${esc(namaDepan)} 👋</h2>
        <p class="muted small">${tglHariIni} · <span class="badge blue">${esc(SIRAT.me.role)}</span>${SIRAT.me.unitNama ? " · " + esc(SIRAT.me.unitNama) : ""}</p></div>
        ${tombolTulis}
      </div>
      <div class="cards-row">
        ${stat("Total Surat Masuk", d.masuk_total.aggregate.count, "📥", "g")}
        ${stat("Total Surat Keluar", d.keluar_total.aggregate.count, "📤", "g")}
        ${stat("Surat Draft", d.draft.aggregate.count, "📝", "gr")}
        ${stat("Menunggu Verifikasi", d.diajukan.aggregate.count, "📋", "a")}
        ${stat("Menunggu Persetujuan", d.diverifikasi.aggregate.count, "✅", "b")}
        ${stat("Disetujui", d.disetujui.aggregate.count, "✔️", "g")}
        ${stat("Ditolak / Koreksi", d.ditolak.aggregate.count, "❌", "r")}
        ${stat("Surat Selesai", d.selesai.aggregate.count, "🎯", "v")}
        ${stat("Diarsipkan", d.diarsipkan.aggregate.count, "🗄️", "gr")}
        ${stat("Surat Bulan Ini", d.bulan_ini.aggregate.count, "📅", "v")}
        ${stat("Disposisi Aktif", d.dispo_saya.aggregate.count, "📌", "a")}
      </div>
      <div class="two-col">
        <div class="panel"><div class="panel-head"><b>Status Surat Keluar</b><small class="muted">distribusi seluruh surat</small></div>
          <div class="panel-body"><div class="barchart">${barStatus(d.status_keluar)}</div></div>
        </div>
        <div class="panel"><div class="panel-head"><b>Per Jenis Surat</b><small class="muted">top 6</small></div>
          <div class="panel-body"><div class="pie-list">${jenisTop.map(([j, n], idx) => `
            <div class="pie-item"><span class="legend-dot" style="background:${PALET_JENIS[idx % PALET_JENIS.length]}"></span><span class="grow">${esc(N.LABEL_JENIS[j] || j)}</span>
            <div class="progressbar"><i style="width:${Math.round((n / totalJenis) * 100)}%"></i></div><b>${n}</b></div>`).join("") || '<span class="muted">Belum ada data</span>'}</div>
          </div>
        </div>
      </div>
      <div class="two-col eq">
        <div class="panel"><div class="panel-head"><b>⚡ Perlu Ditindaklanjuti</b><small class="muted">sesuai peran ${esc(SIRAT.me.role)}</small></div>
          <div class="panel-body">${listTindakan(tindakan)}</div>
        </div>
        <div class="panel"><div class="panel-head"><b>📋 Disposisi Menunggu Saya</b></div>
          <div class="panel-body">${(tindakan.dispo || []).map((x) => {
            const sm = x.surat_masuk || {};
            const lewat = x.batas_waktu && String(x.batas_waktu) < new Date().toISOString().slice(0, 10);
            return `<div class="dispo-item">
              <div class="dispo-top"><b>${esc(sm.nomor_surat || "(tanpa nomor)")}</b>${badge(x.status)}</div>
              <p class="muted small">${esc(sm.perihal || "")}</p>
              <p class="dispo-instruksi">📌 ${esc(x.instruksi)}</p>
              <p class="small ${lewat ? "overdue" : ""}">Batas: <b>${fmtTgl(x.batas_waktu)}</b>${lewat ? " · <b>melewati batas waktu</b>" : ""}</p>
            </div>`;
          }).join("") || '<div class="empty-block" style="padding:1.4rem"><span class="big">🎉</span>Tidak ada disposisi menunggu.</div>'}
          </div>
        </div>
      </div>`;
  }

  function barStatus(nodes) {
    const hitung = {};
    nodes.forEach((n) => { hitung[n.status] = (hitung[n.status] || 0) + 1; });
    const entri = Object.entries(hitung).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const maks = Math.max(1, ...entri.map((e) => e[1]));
    if (!entri.length) return '<span class="muted">Belum ada data</span>';
    return entri.map(([st, n]) => `
      <div class="bar" title="${esc(N.labelStatus(st))}: ${n} surat">
        <b>${n}</b><i class="${N.statusKelas(st)}" style="height:${Math.round((n / maks) * 112) + 8}px"></i>
        <span>${esc(N.labelStatus(st))}</span></div>`).join("");
  }

  function listTindakan(t) {
    const item = [];
    if (["SUPERADMIN", "VERIFIKATOR"].includes(SIRAT.me.role)) {
      (t.keluar || []).filter((x) => x.status === "DIAJUKAN").forEach((x) =>
        item.push({ txt: `Verifikasi: ${x.perihal}`, modul: "verifikasi" }));
    }
    if (["SUPERADMIN", "PIMPINAN"].includes(SIRAT.me.role)) {
      (t.keluar || []).filter((x) => x.status === "DIVERIFIKASI").forEach((x) =>
        item.push({ txt: `Persetujuan: ${x.perihal}`, modul: "persetujuan" }));
    }
    (t.koreksi || []).forEach((x) => item.push({ txt: `Perbaiki (perlu koreksi): ${x.perihal}`, modul: "surat-keluar" }));
    if (!item.length) return `<div class="empty-block" style="padding:1.4rem"><span class="big">🎉</span>Semua tugas beres!</div>`;
    return item.slice(0, 8).map((i) => `
      <button class="tindakan-item" data-goto="${i.modul}"><span class="arrow">→</span><span class="grow">${esc(i.txt)}</span></button>`).join("");
  }

  // ================= LOG AKTIVITAS =================
  async function logAktivitas(aktivitas, modul, recordId) {
    try {
      await N.gql(`mutation ($o: log_aktivitas_insert_input!) { insert_log_aktivitas_one(object: $o) { id } }`,
        { o: { user_id: SIRAT.me ? SIRAT.me.id : null, aktivitas, modul, record_id: recordId, device: navigator.userAgent } });
    } catch (_) { /* log gagal tidak memblokir */ }
  }

  // ================= NOTIFIKASI =================
  let notifTimer = null;
  function startNotifPolling() {
    stopNotifPolling();
    refreshNotifDot();
    notifTimer = setInterval(refreshNotifDot, 30000);
  }
  function stopNotifPolling() { if (notifTimer) clearInterval(notifTimer); notifTimer = null; }

  // Pesan ramah utk kegagalan jaringan/DNS (mis. net::ERR_NAME_NOT_RESOLVED)
  function pesanJaringan(e) {
    const m = String((e && e.message) || "");
    if (/fetch|network|jaringan|name_not_resolved|nhost\.run|load failed/i.test(m)) {
      return "Tidak dapat terhubung ke server. Periksa koneksi internet Anda atau konfigurasi Nhost di assets/config.js, lalu coba lagi.";
    }
    return m || "Terjadi kesalahan.";
  }

  async function refreshNotifDot() {
    if (!SIRAT.me) return;
    try {
      const d = await N.gql(Q.notifBelum, { uid: SIRAT.me.id });
      show($("#notif-dot"), d.notifikasi_aggregate.aggregate.count > 0);
    } catch (_) {}
  }

  function closeNotif() {
    show($("#sheet-notif"), false);
    show($("#notif-backdrop"), false);
  }

  async function openNotif() {
    if (!SIRAT.me) { toast("Masuk terlebih dahulu untuk melihat notifikasi.", "err"); return; }
    show($("#notif-backdrop"), true);
    const sheet = $("#sheet-notif");
    show(sheet, true);
    $("#notif-list").innerHTML = `<div class="loading-block"><span class="spinner" style="border-color:var(--green-700)"></span></div>`;
    try {
      const d = await N.gql(Q.notifList, { uid: SIRAT.me.id });
      $("#notif-list").innerHTML = d.notifikasi.map((n) => `
        <div class="notif-item ${n.dibaca ? "" : "unread"}" data-nid="${n.id}" data-sid="${n.surat_id || ""}" data-sjenis="${n.surat_jenis || ""}">
          <b>${esc(n.judul)}</b><p>${esc(n.pesan)}</p><small class="muted">${fmtTgl(n.created_at, true)}</small>
        </div>`).join("") || `<div class="empty-block"><span class="big">🔕</span>Belum ada notifikasi.</div>`;
      $$("#notif-list .notif-item").forEach((el) => el.addEventListener("click", async () => {
        if (el.dataset.nid) await N.gql(Q.notifBaca, { id: el.dataset.nid }).catch(() => {});
        el.classList.remove("unread");
        refreshNotifDot();
        if (el.dataset.sid) {
          closeNotif();
          goto(el.dataset.sjenis === "MASUK" ? "surat-masuk" : "surat-keluar", el.dataset.sid);
        }
      }));
    } catch (e) {
      $("#notif-list").innerHTML = `<div class="empty-block"><span class="big">📡</span>${esc(pesanJaringan(e))}</div>`;
    }
  }

  // ================= ADMIN MINI =================
  async function modAdminUsers(c) {
    const [units, users] = await Promise.all([
      N.gql(Q.unitList),
      N.gql(Q.userList, { w: {} }),
    ]);
    c.innerHTML = `
      <div class="panel"><div class="panel-head"><b>👥 Profil Pengguna (${users.users.length})</b>
        <small class="muted">Perubahan role dilakukan via Nhost Console (auth.users) — lihat README</small></div>
        <div class="panel-body">${tableWrap(
          "<th>Nama</th><th>Email</th><th>Role</th><th>Unit Kerja</th><th>Status</th>",
          users.users.map((u) => `<tr><td><b>${esc(u.nama)}</b><br><small class="muted">${esc(u.jabatan || "-")}</small></td><td>${esc(u.email || "-")}</td><td>${badge(u.role === "SUPERADMIN" ? "AKTIF" : "DRAFT", u.role)}</td><td>${esc(u.unit_kerja ? u.unit_kerja.nama_unit : "-")}</td><td>${badge(u.status)}</td></tr>`).join(""),
          "Belum ada pengguna.")}
        <p class="muted small" style="padding:.8rem 1.2rem">Unit kerja tersedia: ${units.unit_kerja.map((u) => esc(u.kode)).join(", ")}</p>
      </div>`;
  }

  async function modAdminTemplate(c) {
    const [tpl] = await Promise.all([N.gql(`query { template_surat(order_by: {jenis_surat: asc}) { id nama_template jenis_surat template_content status } }`)]);
    c.innerHTML = `<div class="panel"><div class="panel-head"><b>📄 Template Surat (${tpl.template_surat.length})</b></div>
      <div class="panel-body">${tableWrap(
        "<th>Nama</th><th>Jenis</th><th>Status</th><th>Aksi</th>",
        tpl.template_surat.map((t) => `<tr><td><b>${esc(t.nama_template)}</b></td><td>${esc(N.LABEL_JENIS[t.jenis_surat] || t.jenis_surat)}</td><td>${badge(t.status)}</td>
          <td><button class="btn btn-sm btn-outline" data-tpl="${t.id}">Lihat</button></td></tr>`).join(""),
        "Belum ada template.")}
    </div>`;
    $$("button[data-tpl]", c).forEach((b) => b.addEventListener("click", () => {
      const t = tpl.template_surat.find((x) => x.id === b.dataset.tpl);
      openModal(`<h3>${esc(t.nama_template)}</h3><p class="muted small">${esc(N.LABEL_JENIS[t.jenis_surat] || t.jenis_surat)}</p>
        <div class="preview-surat" style="margin-top:.8rem">${t.template_content}</div>
        <div class="modal-foot"><button class="btn btn-outline" data-close>Tutup</button></div>`);
    }));
  }

  async function modAdminNomor(c) {
    const d = await N.gql(`query { nomor_surat(order_by: {created_at: desc}, limit: 300) { id nomor_urut kode_unit kode_jenis tahun nomor_lengkap created_at surat_id } }`);
    c.innerHTML = `<div class="toolbar"><input class="input" id="cari-nomor" placeholder="Cari nomor surat…" /></div>
      <div class="panel"><div class="panel-head"><b>🔢 Register Nomor Surat</b><button class="btn btn-sm btn-outline" id="exp-nomor">⬇ Export CSV</button></div>
      <div class="panel-body" id="isi-nomor"></div></div>`;
    function isi(q) {
      const rows = d.nomor_surat.filter((n) => !q || n.nomor_lengkap.toLowerCase().includes(q.toLowerCase()));
      $("#isi-nomor").innerHTML = tableWrap(
        "<th>Nomor Lengkap</th><th>Kode Unit</th><th>Jenis</th><th>Tahun</th><th>Diterbitkan</th>",
        rows.map((n) => `<tr><td><b>${esc(n.nomor_lengkap)}</b></td><td>${esc(n.kode_unit)}</td><td>${esc(n.kode_jenis)}</td><td>${n.tahun}</td><td>${fmtTgl(n.created_at)}</td></tr>`).join(""),
        "Belum ada nomor diterbitkan.");
    }
    isi("");
    $("#cari-nomor").addEventListener("input", (e) => isi(e.target.value));
    $("#exp-nomor").addEventListener("click", () => exportCsv("register-nomor-surat.csv", [["Nomor", "Kode Unit", "Kode Jenis", "Tahun", "Diterbitkan"]].concat(d.nomor_surat.map((n) => [n.nomor_lengkap, n.kode_unit, n.kode_jenis, n.tahun, n.created_at]))));
  }

  async function modAdminLog(c) {
    const d = await N.gql(Q.logList, { limit: 300 });
    c.innerHTML = `<div class="panel"><div class="panel-head"><b>📊 Log Aktivitas (300 terakhir)</b>
      <button class="btn btn-sm btn-outline" id="exp-log">⬇ Export CSV</button></div>
      <div class="panel-body">${tableWrap(
        "<th>Waktu</th><th>Pengguna</th><th>Aktivitas</th><th>Modul</th><th>Perangkat</th>",
        d.log_aktivitas.map((l) => `<tr><td>${fmtTgl(l.created_at, true)}</td><td>${esc(l.user ? l.user.nama : "Sistem")}</td><td>${badge(l.aktivitas === "LOGIN" || l.aktivitas === "LOGOUT" ? "AKTIF" : "DIAJUKAN", esc(l.aktivitas))}</td><td>${esc(l.modul)}</td><td class="muted small">${esc((l.device || "").slice(0, 40))}</td></tr>`).join(""),
        "Belum ada aktivitas.")}
    </div>`;
    $("#exp-log").addEventListener("click", () => exportCsv("log-aktivitas.csv", [["Waktu", "Pengguna", "Aktivitas", "Modul", "Perangkat"]].concat(d.log_aktivitas.map((l) => [l.created_at, l.user ? l.user.nama : "", l.aktivitas, l.modul, l.device]))));
  }

  // ================= VERIFIKASI QR PUBLIK =================
  async function modVerify(token) {
    setView("verify");
    const body = $("#verify-body");
    body.innerHTML = `<div class="loading-block"><span class="spinner" style="border-color:var(--green-700)"></span> Memeriksa dokumen…</div>`;
    try {
      const d = await N.gql(Q.verifyByToken, { t: token });
      const s = d.surat_keluar[0];
      if (!s) {
        body.innerHTML = `<div class="verify-hero invalid"><h2>❌ DOKUMEN TIDAK DITEMUKAN</h2><p>Dokumen tidak sah, belum ditandatangani, atau tautan salah.</p></div>
          <div class="verify-grid"><div class="verify-card"><small>SARAN</small><b>Pastikan QR dipindai dari dokumen resmi SIRAT Dinkes Kutai Kartanegara.</b></div></div>`;
        return;
      }
      body.innerHTML = `
        <div class="verify-hero"><h2>✅ VERIFIKASI DOKUMEN</h2><p>Dokumen ditemukan dan <b>TERVERIFIKASI / SAH</b></p></div>
        <div class="verify-grid">
          <div class="verify-card"><small>📄 NOMOR SURAT</small><b>${esc(s.nomor_surat || "Belum bernomor")}</b></div>
          <div class="verify-card"><small>📅 TANGGAL SURAT</small><b>${fmtTgl(s.tanggal_surat)}</b></div>
          <div class="verify-card"><small>🏢 UNIT KERJA</small><b>${esc(s.unit_kerja ? s.unit_kerja.nama_unit : "-")}</b></div>
          <div class="verify-card"><small>✍️ PENANDATANGAN</small><b>${esc(s.penandatangan ? s.penandatangan.nama + " — " + s.penandatangan.jabatan : "-")}</b></div>
          <div class="verify-card" style="grid-column:1/-1"><small>📌 PERIHAL</small><b>${esc(s.perihal)}</b><br><small class="muted">Tujuan: ${esc(s.tujuan)}</small></div>
          <div class="verify-card" style="grid-column:1/-1"><small>STATUS SAAT INI</small>${badge(s.status)}</div>
        </div>`;
    } catch (e) {
      body.innerHTML = `<div class="verify-hero invalid"><h2>⚠️ GAGAL MEMERIKSA</h2><p>${esc(e.message)}</p></div>`;
    }
  }

  // ================= EVENT GLOBAL =================
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-action],[data-goto]");
    if (!t) return;
    if (t.dataset.action === "go-login") showAuth();
    if (t.dataset.action === "go-landing") showLanding();
    if (t.dataset.action === "logout") doLogout();
    if (t.dataset.action === "toggle-menu") { $("#sidebar").classList.add("open"); show($("#drawer-backdrop"), true); }
    if (t.dataset.action === "close-menu") { $("#sidebar").classList.remove("open"); show($("#drawer-backdrop"), false); }
    if (t.dataset.action === "open-notif") openNotif();
    if (t.dataset.action === "close-notif") closeNotif();
    if (t.dataset.action === "close-conn") show($("#conn-banner"), false);
    if (t.dataset.action === "read-all-notif" && SIRAT.me) N.gql(Q.notifBacaSemua, { uid: SIRAT.me.id }).then(() => { openNotif(); refreshNotifDot(); toast("Semua notifikasi ditandai dibaca.", "ok"); });
    if (t.dataset.action === "toggle-pw") {
      const inp = $("#login-password");
      inp.type = inp.type === "password" ? "text" : "password";
      t.textContent = inp.type === "password" ? "👁" : "🙈";
    }
    if (t.dataset.goto) goto(t.dataset.goto);
  });

  document.addEventListener("submit", async (e) => {
    if (e.target.id === "form-login") {
      e.preventDefault();
      const btn = $("#btn-login");
      const err = $("#login-error");
      show(err, false); btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Memproses…`;
      try {
        await N.signIn($("#login-email").value.trim(), $("#login-password").value);
        await afterLogin();
      } catch (ex) {
        err.textContent = ex.message.includes("Invalid") || ex.message.includes("invalid") ? "Email atau kata sandi salah." : ex.message;
        show(err, true);
      } finally {
        btn.disabled = false; btn.textContent = "Masuk";
      }
    }
    if (e.target.id === "form-daftar") {
      e.preventDefault();
      const btn = $("#btn-daftar");
      const err = $("#daftar-error");
      show(err, false); btn.disabled = true;
      try {
        const email = $("#daftar-email").value.trim();
        const hasil = await N.signUp({
          nama: $("#daftar-nama").value.trim(),
          email,
          password: $("#daftar-password").value,
          username: email.split("@")[0],
          unit_kerja_id: $("#daftar-unit").value || null,
        });
        toast(hasil.needsVerification ? "Akun dibuat! Cek email Anda untuk verifikasi, lalu masuk." : "Akun dibuat! Silakan masuk.", "ok");
        document.querySelector('[data-auth-tab="login"]').click();
        $("#login-email").value = email;
      } catch (ex) {
        err.textContent = ex.message;
        show(err, true);
      } finally {
        btn.disabled = false; btn.textContent = "Buat Akun";
      }
    }
  });

  document.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-auth-tab]");
    if (!tab) return;
    $$("[data-auth-tab]").forEach((b) => b.classList.toggle("active", b === tab));
    show($("#form-login"), tab.dataset.authTab === "login");
    show($("#form-daftar"), tab.dataset.authTab === "daftar");
  });

  // Tombol Esc menutup panel notifikasi
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNotif();
  });

  // Banner status koneksi (sirat:net-error / sirat:net-ok dikirim dari nhost.js)
  let connShown = false;
  window.addEventListener("sirat:net-error", (e) => {
    const det = $("#conn-detail");
    if (det) det.textContent = "Periksa koneksi internet, subdomain/region Nhost pada assets/config.js, atau status proyek Nhost Anda." + (e.detail ? ` (${e.detail})` : "");
    show($("#conn-banner"), true);
    connShown = true;
  });
  window.addEventListener("sirat:net-ok", () => {
    if (connShown) {
      show($("#conn-banner"), false);
      connShown = false;
      toast("Koneksi ke server pulih.", "ok");
    }
  });

  // ================= BOOT =================
  function configValid() {
    return Boolean(S.nhostSubdomain) && !/ubahkan|subdomain-anda/i.test(String(S.nhostSubdomain));
  }

  function showFatal(judul, pesan, detail) {
    setView("fatal");
    $("#fatal-body").innerHTML = `
      <div class="auth-brand">⚠️ <b>${esc(judul)}</b><div>${esc(pesan)}</div></div>
      ${detail ? `<div class="tl-note" style="margin-top:1rem;white-space:pre-wrap">${esc(detail)}</div>` : ""}
      <div class="modal-foot"><button class="btn btn-primary" onclick="location.reload()">Muat Ulang</button></div>`;
  }

  async function boot() {
    // Route verifikasi QR publik: ?verify=TOKEN
    const params = new URLSearchParams(location.search);
    if (params.get("verify")) {
      try {
        await N.init();
      } catch (e) {
        return showFatal("Koneksi Gagal", "SIRAT tidak dapat memuat komponen yang diperlukan.", e.message);
      }
      return modVerify(params.get("verify"));
    }
    // Subdomain Nhost masih placeholder → jangan panggil backend, cukup landing + petunjuk
    if (!configValid()) {
      showLanding();
      toast("Backend Nhost belum dikonfigurasi — edit berkas assets/config.js (subdomain & region).", "err");
      return;
    }
    try {
      const user = await N.getSessionUser();
      if (user) { await afterLogin(); return; }
      showLanding();
    } catch (e) {
      console.error(e);
      showLanding();
      toast("Gagal menghubungi Nhost: " + e.message, "err");
    }
  }

  // Isi pilihan unit kerja di form daftar
  N.init()
    .then(async () => {
      try {
        const d = await N.gql(Q.unitList);
        $("#daftar-unit").innerHTML = `<option value="">— Pilih unit kerja —</option>` +
          d.unit_kerja.map((u) => `<option value="${u.id}">${esc(u.nama_unit)}</option>`).join("");
      } catch (_) {}
      boot();
    })
    .catch(() => boot()); // SDK gagal dimuat → tetap tampilkan landing (bukan halaman kosong)

  // Registrasi modul inti
  SIRAT.modules.dashboard = modDashboard;
  SIRAT.modules["admin-users"] = modAdminUsers;
  SIRAT.modules["admin-template"] = modAdminTemplate;
  SIRAT.modules["admin-nomor"] = modAdminNomor;
  SIRAT.modules["admin-log"] = modAdminLog;
})();

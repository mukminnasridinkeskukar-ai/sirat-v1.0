/* ============================================================
   SIRAT — Konfigurasi Aplikasi (EDIT FILE INI)
   Isi subdomain & region proyek Nhost Anda:
   Dashboard Nhost → Settings → Project subdomain/region
   URL GraphQL Anda akan menjadi:
   https://{SUBDOMAIN}.hasura.{REGION}.nhost.run/v1/graphql
   ============================================================ */
window.SIRAT_CONFIG = {
  // Wajib disesuaikan dengan proyek Nhost Anda:
  nhostSubdomain: "ubahkan-subdomain-anda",
  nhostRegion: "ap-southeast-1",

  // Identitas aplikasi:
  namaApp: "SIRAT",
  namaInstansi: "Dinas Kesehatan Kabupaten Kutai Kartanegara",
  kodeInstansi: "DINKES",
  alamatInstansi: "Jl. Kesbangpol No. 1, Tenggarong, Kutai Kartanegara, Kaltim",
  logoUrl: "", // opsional: URL logo (mis. hasil upload ke Nhost Storage)

  // Workflow:
  roles: ["SUPERADMIN", "ADMIN", "VERIFIKATOR", "PIMPINAN", "OPERATOR", "VIEWER"],
  bulanRomawi: ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"],
};

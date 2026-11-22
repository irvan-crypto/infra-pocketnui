// ============================================================
// Konfigurasi tabel monitoring harian (18 tabel Supabase)
// Sumber tunggal untuk: form input, kolom DataTable, whitelist API
// ============================================================

export interface MonitoringField {
  key: string;
  label: string; // label di form input
  shortLabel?: string; // header kolom tabel (fallback: label)
  type: "number" | "text";
  group?: string; // pengelompokan di form (mis. "OPC", "PCC")
  subGroup?: string; // sub-grup header tabel (mis. "Rilis Semen Curah OPC")
  generated?: boolean; // generated column — dihitung database, tidak diisi manual
  virtual?: boolean; // kolom turunan yang dihitung di UI (tidak ada di database)
  sumOf?: string[]; // untuk kolom virtual: key kolom sumber yang dijumlahkan
  integer?: boolean; // tampil tanpa desimal (retase, armada)
  required?: boolean;
}

/** Satu seri pada grafik garis (nilai = jumlah kolom-kolom `fieldKeys`) */
export interface MonitoringLineChartSeries {
  label: string;
  color: string;
  fieldKeys: string[];
}

/** Definisi grafik garis (mis. PP: OPC, PCC, Rilis OPC, Rilis PCC) */
export interface MonitoringLineChartConfig {
  title: string;
  series: MonitoringLineChartSeries[];
}

export interface MonitoringTableConfig {
  slug: string; // segmen URL: /monitoring/<slug>
  table: string; // nama tabel Supabase
  title: string;
  heading?: string; // judul H1 halaman (fallback: title)
  subtitle?: string;
  pageSubtitle?: string; // subjudul H1 halaman (fallback: subtitle)
  uniquePerDate: boolean; // hanya 1 baris per tanggal
  uniqueBy?: string; // keunikan = tanggal + field ini (mis. nama_expeditur)
  fields: MonitoringField[];
  chart?: MonitoringChartConfig; // grafik tabung silo (opsional)
  /** Grup header tabel data (mis. TONASA 2/3 membawahi Silo 21-24) */
  tableGroups?: { label: string; columns: number[] }[];
  /** Tampilkan grid card ringkasan per grup (OPC/PCC) di atas tabel */
  groupedSummary?: boolean;
  /** Grafik garis tren harian (opsional) */
  lineCharts?: MonitoringLineChartConfig[];
}

/** Konfigurasi grafik tabung silo */
export interface MonitoringChartConfig {
  groups: number[][]; // kelompok silo per kartu
  groupNames: Record<number, string>; // nama kartu (kunci = nomor pertama grup)
  columnPrefix: string; // kolom stok = prefix + nomor (mis. "stok_silo" + 21)
  scaleHeight?: boolean; // tinggi tabung proporsional kapasitas
}

/**
 * Satu blok (OPC atau PCC) untuk tabel PP cabang — 10 kolom.
 * Urutan (sesuai header 3 baris):
 *   Stok Awal | Masuk | [Rilis Curah, Jumbo Curah, Total Curah,
 *              Zak 50, Zak 40, Total Zak] | Stok Akhir | Total Rilis
 */
function ppBlock(
  prefix: string,
  suffix: "opc" | "pcc",
  group: string
): MonitoringField[] {
  const key = (name: string) => `${prefix}_${name}_${suffix}`;
  const groupRilis = `Rilis ${group}`;
  return [
    { key: key("stokawal"), label: `Stok Awal (${group})`, shortLabel: "Stok Awal", type: "number", group },
    { key: key("masuk"), label: `Masuk (${group})`, shortLabel: "Masuk", type: "number", group },
    { key: key("riliscurah"), label: `Rilis Curah (${group})`, shortLabel: "Rilis Curah", type: "number", group, subGroup: groupRilis },
    { key: key("rilisjcurah"), label: `Rilis Jumbo Curah (${group})`, shortLabel: "Jumbo Curah", type: "number", group, subGroup: groupRilis },
    { key: key("totalcurah"), label: `Total Curah (${group})`, shortLabel: "Total Curah", type: "number", group, subGroup: groupRilis, generated: true },
    { key: key("riliszak50"), label: `Rilis Zak 50 (${group})`, shortLabel: "Zak 50", type: "number", group, subGroup: groupRilis },
    { key: key("riliszak40"), label: `Rilis Zak 40 (${group})`, shortLabel: "Zak 40", type: "number", group, subGroup: groupRilis },
    { key: key("totalzak"), label: `Total Zak (${group})`, shortLabel: "Total Zak", type: "number", group, subGroup: groupRilis, generated: true },
    { key: key("stokakhir"), label: `Stok Akhir (${group})`, shortLabel: "Stok Akhir", type: "number", group },
    {
      // Dihitung di UI (= total curah + total zak), bukan kolom database
      key: `${prefix}_totalrilis_${suffix}`,
      label: `Total Rilis (${group})`,
      shortLabel: "Total Rilis",
      type: "number",
      group,
      virtual: true,
      sumOf: [key("riliscurah"), key("rilisjcurah"), key("riliszak50"), key("riliszak40")],
    },
  ];
}

/** Kolom OPC + PCC untuk PP cabang (20 kolom tampilan, pola sama, prefiks berbeda) */
function ppFields(prefix: string): MonitoringField[] {
  return [...ppBlock(prefix, "opc", "OPC"), ...ppBlock(prefix, "pcc", "PCC")];
}

/** Nilai numerik satu field dari 1 baris data (kolom virtual dihitung dari sumOf) */
export function monitoringFieldValue(
  row: Record<string, unknown> | null | undefined,
  field: MonitoringField
): number {
  if (field.virtual && field.sumOf) {
    return field.sumOf.reduce((sum, k) => sum + Number(row?.[k] ?? 0), 0);
  }
  return Number(row?.[field.key] ?? 0);
}

/** Kolom "Total ..." (generated/virtual) — ditampilkan bold di tabel data */
export function isTotalField(field: MonitoringField): boolean {
  return field.generated === true || field.virtual === true || /total/i.test(field.key);
}

function ppLineCharts(prefix: string): MonitoringLineChartConfig[] {
  const k = (name: string, sfx: "opc" | "pcc") => `${prefix}_${name}_${sfx}`;
  const COLOR = { masuk: "#2563eb", rilis: "#f43f5e", curah: "#0ea5e9", zak: "#f59e0b" };

  return [
    {
      title: "OPC",
      series: [
        { label: "Masuk OPC", color: COLOR.masuk, fieldKeys: [k("masuk", "opc")] },
        { label: "Rilis OPC", color: COLOR.rilis, fieldKeys: [k("totalrilis", "opc")] },
      ],
    },
    {
      title: "PCC",
      series: [
        { label: "Masuk PCC", color: COLOR.masuk, fieldKeys: [k("masuk", "pcc")] },
        { label: "Rilis PCC", color: COLOR.rilis, fieldKeys: [k("totalrilis", "pcc")] },
      ],
    },
    {
      title: "Rilis OPC",
      series: [
        { label: "Total Curah", color: COLOR.curah, fieldKeys: [k("totalcurah", "opc")] },
        { label: "Total Zak", color: COLOR.zak, fieldKeys: [k("totalzak", "opc")] },
      ],
    },
    {
      title: "Rilis PCC",
      series: [
        { label: "Total Curah", color: COLOR.curah, fieldKeys: [k("totalcurah", "pcc")] },
        { label: "Total Zak", color: COLOR.zak, fieldKeys: [k("totalzak", "pcc")] },
      ],
    },
  ];
}

function ppConfig(
  slug: string,
  table: string,
  title: string,
  prefix: string
): MonitoringTableConfig {
  return {
    slug,
    table,
    title,
    subtitle: "Monitoring harian stok awal, masuk, rilis & stok akhir OPC/PCC (ton)",
    uniquePerDate: true,
    fields: ppFields(prefix),
    groupedSummary: true,
    lineCharts: ppLineCharts(prefix),
  };
}

export const MONITORING_CONFIGS: MonitoringTableConfig[] = [
  {
    slug: "silo-semen",
    table: "silo_semen",
    title: "Silo Semen",
    heading: "MONITORING SILO SEMEN",
    subtitle: "Stok harian per silo (ton)",
    pageSubtitle: "Update Data terbaru per 17 Nov 2026",
    uniquePerDate: true,
    tableGroups: [
      { label: "TONASA 2/3", columns: [21, 22, 23, 24] },
      { label: "TONASA 4", columns: [41, 42, 43] },
      { label: "TONASA 5", columns: [51, 52, 53] },
    ],
    chart: {
      groups: [[21, 22, 23, 24], [41, 42, 43], [51, 52, 53]],
      groupNames: { 21: "TONASA 2/3", 41: "TONASA 4", 51: "TONASA 5" },
      columnPrefix: "stok_silo",
    },
    fields: [
      { key: "stok_silo21", label: "Stok Silo 21", shortLabel: "Silo 21", type: "number" },
      { key: "stok_silo22", label: "Stok Silo 22", shortLabel: "Silo 22", type: "number" },
      { key: "stok_silo23", label: "Stok Silo 23", shortLabel: "Silo 23", type: "number" },
      { key: "stok_silo24", label: "Stok Silo 24", shortLabel: "Silo 24", type: "number" },
      { key: "stok_silo41", label: "Stok Silo 41", shortLabel: "Silo 41", type: "number" },
      { key: "stok_silo42", label: "Stok Silo 42", shortLabel: "Silo 42", type: "number" },
      { key: "stok_silo43", label: "Stok Silo 43", shortLabel: "Silo 43", type: "number" },
      { key: "stok_silo51", label: "Stok Silo 51", shortLabel: "Silo 51", type: "number" },
      { key: "stok_silo52", label: "Stok Silo 52", shortLabel: "Silo 52", type: "number" },
      { key: "stok_silo53", label: "Stok Silo 53", shortLabel: "Silo 53", type: "number" },
    ],
  },
  {
    slug: "silo-pantai",
    table: "silo_pantai",
    title: "Silo Pantai",
    subtitle: "Stok harian Silo Pantai 1–10 (ton)",
    uniquePerDate: true,
    chart: {
      groups: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]],
      groupNames: { 1: "Silo Pantai" },
      columnPrefix: "silo_",
      scaleHeight: true,
    },
    fields: [
      { key: "silo_1", label: "Silo 1", type: "number" },
      { key: "silo_2", label: "Silo 2", type: "number" },
      { key: "silo_3", label: "Silo 3", type: "number" },
      { key: "silo_4", label: "Silo 4", type: "number" },
      { key: "silo_5", label: "Silo 5", type: "number" },
      { key: "silo_6", label: "Silo 6", type: "number" },
      { key: "silo_7", label: "Silo 7", type: "number" },
      { key: "silo_8", label: "Silo 8", type: "number" },
      { key: "silo_9", label: "Silo 9", type: "number" },
      { key: "silo_10", label: "Silo 10", type: "number" },
      { key: "total_stok", label: "Total Stok", shortLabel: "Total", type: "number", generated: true },
    ],
  },
  {
    slug: "cp-tonasa",
    table: "cp_tonasa",
    title: "CP Tonasa",
    subtitle: "Produksi & rilis harian OPC & PCC (ton)",
    uniquePerDate: true,
    groupedSummary: true,
    fields: [
      { key: "prod_fmopc", label: "Produksi FM (OPC)", shortLabel: "Prod. FM", type: "number", group: "OPC" },
      { key: "rilis_spantaiopc", label: "Rilis Silo Pantai (OPC)", shortLabel: "Silo Pantai", type: "number", group: "OPC", subGroup: "Rilis Semen Curah OPC" },
      { key: "rilis_sminiopc", label: "Rilis Silo Mini (OPC)", shortLabel: "Silo Mini", type: "number", group: "OPC", subGroup: "Rilis Semen Curah OPC" },
      { key: "rilis_curah_fotopc", label: "Rilis Curah FOT (OPC)", shortLabel: "Curah FOT", type: "number", group: "OPC", subGroup: "Rilis Semen Curah OPC" },
      { key: "rilis_jumbo_fobopc", label: "Rilis Jumbo FOB (OPC)", shortLabel: "Jumbo FOB", type: "number", group: "OPC", subGroup: "Rilis Jumbo Curah OPC" },
      { key: "rilis_jumbo_fotopc", label: "Rilis Jumbo FOT (OPC)", shortLabel: "Jumbo FOT", type: "number", group: "OPC", subGroup: "Rilis Jumbo Curah OPC" },
      { key: "total_rilisopc", label: "Total Rilis (OPC)", shortLabel: "Total Rilis", type: "number", group: "OPC", generated: true },
      { key: "prod_fmpcc", label: "Produksi FM (PCC)", shortLabel: "Prod. FM", type: "number", group: "PCC" },
      { key: "rilis_spantaipcc", label: "Rilis Silo Pantai (PCC)", shortLabel: "Silo Pantai", type: "number", group: "PCC", subGroup: "Rilis Semen Curah PCC" },
      { key: "rilis_curah_fotpcc", label: "Rilis Curah FOT (PCC)", shortLabel: "Curah FOT", type: "number", group: "PCC", subGroup: "Rilis Semen Curah PCC" },
      { key: "rilis_ppmkspcc", label: "Rilis PPMKS (PCC)", shortLabel: "PPMKS", type: "number", group: "PCC", subGroup: "Rilis Semen Curah PCC" },
      { key: "rilis_packerpcc", label: "Rilis Packer (PCC)", shortLabel: "Packer", type: "number", group: "PCC", subGroup: "Rilis Packer PCC" },
      { key: "rilis_polyslingpcc", label: "Rilis Polysling (PCC)", shortLabel: "Polysling", type: "number", group: "PCC", subGroup: "Rilis Packer PCC" },
      { key: "rilis_jumbo_fobpcc", label: "Rilis Jumbo FOB (PCC)", shortLabel: "Jumbo FOB", type: "number", group: "PCC", subGroup: "Rilis Jumbo Curah PCC" },
      { key: "rilis_jumbo_fotpcc", label: "Rilis Jumbo FOT (PCC)", shortLabel: "Jumbo FOT", type: "number", group: "PCC", subGroup: "Rilis Jumbo Curah PCC" },
      { key: "total_rilispcc", label: "Total Rilis (PCC)", shortLabel: "Total Rilis", type: "number", group: "PCC", generated: true },
    ],
  },
  {
    slug: "pp-biringkassi",
    table: "pp_biringkassi",
    title: "PP Biringkassi",
    subtitle: "Masuk, rilis, dan stok harian OPC & PCC (ton)",
    uniquePerDate: true,
    fields: [
      { key: "masukopc", label: "Masuk (OPC)", shortLabel: "Masuk", type: "number", group: "OPC" },
      { key: "rilis_jumboopc", label: "Rilis Jumbo (OPC)", shortLabel: "Jumbo", type: "number", group: "OPC" },
      { key: "rilis_packeropc", label: "Rilis Packer (OPC)", shortLabel: "Packer", type: "number", group: "OPC" },
      { key: "rilis_outletppopc", label: "Rilis Outlet PP (OPC)", shortLabel: "Outlet PP", type: "number", group: "OPC" },
      { key: "total_rilisopc", label: "Total Rilis (OPC)", shortLabel: "Total Rilis", type: "number", group: "OPC", generated: true },
      { key: "stok_opc", label: "Stok (OPC)", shortLabel: "Stok", type: "number", group: "OPC" },
      { key: "masukpcc", label: "Masuk (PCC)", shortLabel: "Masuk", type: "number", group: "PCC" },
      { key: "rilis_jumbopcc", label: "Rilis Jumbo (PCC)", shortLabel: "Jumbo", type: "number", group: "PCC" },
      { key: "rilis_packerpcc", label: "Rilis Packer (PCC)", shortLabel: "Packer", type: "number", group: "PCC" },
      { key: "rilis_outletpppcc", label: "Rilis Outlet PP (PCC)", shortLabel: "Outlet PP", type: "number", group: "PCC" },
      { key: "total_rilispcc", label: "Total Rilis (PCC)", shortLabel: "Total Rilis", type: "number", group: "PCC", generated: true },
      { key: "stok_pcc", label: "Stok (PCC)", shortLabel: "Stok", type: "number", group: "PCC" },
    ],
  },
  {
    slug: "silo-mini",
    table: "silo_mini",
    title: "Silo Mini",
    subtitle: "Masuk, rilis jumbo, dan stok harian OPC (ton)",
    uniquePerDate: true,
    fields: [
      { key: "masukopc", label: "Masuk (OPC)", shortLabel: "Masuk", type: "number" },
      { key: "rilis_jumboopc", label: "Rilis Jumbo (OPC)", shortLabel: "Jumbo", type: "number" },
      { key: "stok_opc", label: "Stok (OPC)", shortLabel: "Stok", type: "number" },
    ],
  },
  ppConfig("pp1-samarinda", "pp1_samarinda", "PP1 Samarinda", "sama"),
  ppConfig("pp1-balikpapan", "pp1_balikpapan", "PP1 Balikpapan", "bpp"),
  ppConfig("pp1-banjarmasin", "pp1_banjarmasin", "PP1 Banjarmasin", "bjr"),
  ppConfig("pp1-palu", "pp1_palu", "PP1 Palu", "palu"),
  ppConfig("pp1-lembar", "pp1_lembar", "PP1 Lembar", "lbr"),
  ppConfig("pp1-makassar", "pp1_makassar", "PP1 Makassar", "mks"),
  ppConfig("pp2-bitung", "pp2_bitung", "PP2 Bitung", "btg"),
  ppConfig("pp2-mamuju", "pp2_mamuju", "PP2 Mamuju", "mmju"),
  ppConfig("pp2-kendari", "pp2_kendari", "PP2 Kendari", "kdri"),
  ppConfig("pp2-oba", "pp2_oba", "PP2 Oba", "oba"),
  ppConfig("pp2-ambon", "pp2_ambon", "PP2 Ambon", "abn"),
  ppConfig("pp2-sorong", "pp2_sorong", "PP2 Sorong", "srg"),
  {
    slug: "angkutan-darat",
    table: "angkutan_darat",
    title: "Angkutan Darat",
    subtitle: "Retase & armada operasi per expeditur",
    uniquePerDate: false, // beberapa expeditur bisa di tanggal yang sama
    uniqueBy: "nama_expeditur", // 1 expeditur hanya 1 baris per tanggal
    fields: [
      { key: "nama_expeditur", label: "Nama Expeditur", shortLabel: "Expeditur", type: "text", required: true },
      { key: "retase", label: "Retase", type: "number", integer: true },
      { key: "tonase", label: "Tonase (ton)", shortLabel: "Tonase", type: "number" },
      { key: "armada_operasi", label: "Armada Operasi", shortLabel: "Armada", type: "number", integer: true },
    ],
  },
];

export function getMonitoringConfig(slug: string): MonitoringTableConfig | undefined {
  return MONITORING_CONFIGS.find((c) => c.slug === slug);
}

/** Whitelist nama tabel untuk API generik */
export const MONITORING_TABLE_NAMES = MONITORING_CONFIGS.map((c) => c.table);

/** Format angka gaya Indonesia: 1.234,56 (atau tanpa desimal jika integer) */
export function formatMonitoringNumber(
  value: number | string | null | undefined,
  integer = false
): string {
  const n = Number(value || 0);
  return n.toLocaleString("id-ID", {
    minimumFractionDigits: integer ? 0 : 2,
    maximumFractionDigits: integer ? 0 : 2,
  });
}

/** Format tanggal "YYYY-MM-DD" -> "12 Jul 2026" */
export function formatTanggalPanjang(date: string | null | undefined): string {
  if (!date) return "-";
  const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const [y, m, d] = date.slice(0, 10).split("-");
  if (!y || !m || !d) return date;
  return `${d} ${bulan[Number(m) - 1] ?? m} ${y}`;
}

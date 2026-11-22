// ============================================================
// Konfigurasi & helper halaman /monitoring/semua-silo
// Sumber: tabel packing_plant (kapasitas & deadstok) + stok aktual
// dari tabel monitoring harian (silo_semen, silo_pantai, pp*).
// Dipakai bersama oleh API (server) dan halaman (client).
// ============================================================

export type SemuaSiloGroupKey = "cp-tonasa" | "silo-pantai" | "pp1" | "pp2";

export interface SemuaSiloGroup {
  key: SemuaSiloGroupKey;
  label: string;
}

/** Urutan tombol filter (default: CP Tonasa) */
export const SEMUA_SILO_GROUPS: SemuaSiloGroup[] = [
  { key: "cp-tonasa", label: "CP Tonasa" },
  { key: "silo-pantai", label: "Silo Pantai" },
  { key: "pp1", label: "Packing Plant 1" },
  { key: "pp2", label: "Packing Plant 2" },
];

export interface PpUnit {
  /** nama di tabel packing_plant */
  nama: string;
  group: SemuaSiloGroupKey;
  /** tabel monitoring harian */
  table: string;
  /** prefiks kolom, mis. "sama" -> sama_stokakhir_opc / sama_stokakhir_pcc */
  prefix: string;
}

/** 12 packing plant: stok = <prefix>_stokakhir_opc + <prefix>_stokakhir_pcc */
export const PP_UNITS: PpUnit[] = [
  { nama: "PP. Samarinda", group: "pp1", table: "pp1_samarinda", prefix: "sama" },
  { nama: "PP. Balikpapan", group: "pp1", table: "pp1_balikpapan", prefix: "bpp" },
  { nama: "PP. Banjarmasin", group: "pp1", table: "pp1_banjarmasin", prefix: "bjr" },
  { nama: "PP. Palu", group: "pp1", table: "pp1_palu", prefix: "palu" },
  { nama: "PP. Makassar", group: "pp1", table: "pp1_makassar", prefix: "mks" },
  { nama: "PP. Lembar", group: "pp1", table: "pp1_lembar", prefix: "lbr" },
  { nama: "PP. Bitung", group: "pp2", table: "pp2_bitung", prefix: "btg" },
  { nama: "PP. Mamuju", group: "pp2", table: "pp2_mamuju", prefix: "mmju" },
  { nama: "PP. Kendari", group: "pp2", table: "pp2_kendari", prefix: "kdri" },
  { nama: "PP. Oba", group: "pp2", table: "pp2_oba", prefix: "oba" },
  { nama: "PP. Ambon", group: "pp2", table: "pp2_ambon", prefix: "abn" },
  { nama: "PP. Sorong", group: "pp2", table: "pp2_sorong", prefix: "srg" },
];

/** Nomor silo dari nama_pp: "Silo 21" -> 21 */
export function siloNumberOf(nama: string): number | null {
  const match = String(nama).match(/^silo\s*(\d+)$/i);
  return match ? Number(match[1]) : null;
}

/**
 * Kelompok satu baris packing_plant:
 * - Silo 1–10   -> silo-pantai
 * - Silo 21–53  -> cp-tonasa
 * - PP. …       -> pp1 / pp2
 */
export function groupKeyOf(nama: string): SemuaSiloGroupKey | null {
  const n = siloNumberOf(nama);
  if (n !== null) {
    if (n >= 1 && n <= 10) return "silo-pantai";
    return "cp-tonasa";
  }
  const key = String(nama).trim().toLowerCase();
  const unit = PP_UNITS.find((u) => u.nama.toLowerCase() === key);
  return unit ? unit.group : null;
}

/** Sumber kolom stok silo: silo 1–10 -> silo_pantai.silo_N, sisanya silo_semen.stok_siloN */
export function siloStokSource(nomor: number): { table: string; column: string } {
  if (nomor >= 1 && nomor <= 10) return { table: "silo_pantai", column: `silo_${nomor}` };
  return { table: "silo_semen", column: `stok_silo${nomor}` };
}

export function groupLabelOf(key: SemuaSiloGroupKey): string {
  return SEMUA_SILO_GROUPS.find((g) => g.key === key)?.label ?? key;
}

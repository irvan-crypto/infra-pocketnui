// ============================================================
// SCOPE UNIT KERJA
// Operator hanya boleh CRUD data pada unit kerjanya.
// Daftar unit di bawah adalah satu sumber kebenaran untuk
// pemetaan unit -> tabel monitoring / tujuan shipment.
// ============================================================

import { MONITORING_CONFIGS } from "./monitoring-config";

export interface UnitDefinition {
  key: string;
  label: string;
  /** Alias nama unit (huruf kecil) yang mungkin ada di data pengguna */
  aliases: string[];
  /** slug halaman monitoring yang boleh di-CRUD */
  monitoringSlugs: string[];
  /** nilai tujuan_pp / packing_plant yang dianggap milik unit ini */
  shipmentTargets: string[];
  /** tabel tanpa dimensi unit yang boleh di-CRUD unit ini */
  globalTables: string[];
}

const pp = (
  key: string,
  label: string,
  slug: string,
  aliases: string[],
  targets: string[]
): UnitDefinition => ({
  key,
  label,
  aliases,
  monitoringSlugs: [slug],
  shipmentTargets: targets,
  globalTables: [],
});

export const UNIT_DEFINITIONS: UnitDefinition[] = [
  {
    key: "head-office",
    label: "Head Office",
    aliases: ["head office", "ho", "hq", "kantor pusat", "pusat"],
    monitoringSlugs: MONITORING_CONFIGS.map((c) => c.slug),
    shipmentTargets: [],
    globalTables: ["angkutan_darat", "shipments_darat"],
  },
  pp("pp-biringkassi", "Packing Plant Biringkassi", "pp-biringkassi", ["packing plant biringkassi", "pp biringkassi", "biringkassi"], ["PP. Biringkassi", "Biringkassi"]),

  pp("pp1-samarinda", "PP1 Samarinda", "pp1-samarinda", ["pp. samarinda", "pp1 samarinda", "samarinda"], ["PP. Samarinda", "PP1 Samarinda"]),
  pp("pp1-balikpapan", "PP1 Balikpapan", "pp1-balikpapan", ["pp. balikpapan", "pp1 balikpapan", "balikpapan"], ["PP. Balikpapan", "PP1 Balikpapan"]),
  pp("pp1-banjar", "PP1 Banjar", "pp1-banjar", ["pp. banjar", "pp1 banjar", "banjar"], ["PP. Banjar", "PP1 Banjar"]),
  pp("pp1-palu", "PP1 Palu", "pp1-palu", ["pp. palu", "pp1 palu", "palu"], ["PP. Palu", "PP1 Palu"]),
  pp("pp1-lembar", "PP1 Lembar", "pp1-lembar", ["pp. lembar", "pp1 lembar", "lembar"], ["PP. Lembar", "PP1 Lembar"]),
  pp("pp1-makassar", "PP1 Makassar", "pp1-makassar", ["pp. makassar", "pp1 makassar", "makassar"], ["PP. Makassar", "PP1 Makassar"]),
  pp("pp2-bitung", "PP2 Bitung", "pp2-bitung", ["pp. bitung", "pp2 bitung", "bitung"], ["PP. Bitung", "PP2 Bitung"]),
  pp("pp2-mamuju", "PP2 Mamuju", "pp2-mamuju", ["pp. mamuju", "pp2 mamuju", "mamuju"], ["PP. Mamuju", "PP2 Mamuju"]),
  pp("pp2-kendari", "PP2 Kendari", "pp2-kendari", ["pp. kendari", "pp2 kendari", "kendari"], ["PP. Kendari", "PP2 Kendari"]),
  pp("pp2-oba", "PP2 Oba", "pp2-oba", ["pp. oba", "pp2 oba", "oba"], ["PP. Oba", "PP2 Oba"]),
  pp("pp2-ambon", "PP2 Ambon", "pp2-ambon", ["pp. ambon", "pp2 ambon", "ambon"], ["PP. Ambon", "PP2 Ambon"]),
  pp("pp2-sorong", "PP2 Sorong", "pp2-sorong", ["pp. sorong", "pp2 sorong", "sorong"], ["PP. Sorong", "PP2 Sorong"]),

  {
    key: "silo-pantai",
    label: "Silo Pantai",
    aliases: ["silo pantai"],
    monitoringSlugs: ["silo-pantai"],
    shipmentTargets: [],
    globalTables: [],
  },
  {
    key: "silo-semen",
    label: "Silo Semen",
    aliases: ["silo semen", "silo"],
    monitoringSlugs: ["silo-semen"],
    shipmentTargets: [],
    globalTables: [],
  },
  {
    key: "silo-mini",
    label: "Silo Mini",
    aliases: ["silo mini"],
    monitoringSlugs: ["silo-mini"],
    shipmentTargets: [],
    globalTables: [],
  },
  {
    key: "cp-tonasa",
    label: "CP Tonasa",
    aliases: ["cp tonasa", "cp. tonasa", "tonasa"],
    monitoringSlugs: ["cp-tonasa"],
    shipmentTargets: [],
    globalTables: [],
  },
];

export interface UnitScope {
  /** true = tidak dibatasi unit (HO / role dengan akses penuh) */
  all: boolean;
  /** label unit yang dikenali, untuk ditampilkan */
  labels: string[];
  /** slug monitoring yang boleh di-CRUD */
  monitoringSlugs: string[];
  /** nama tujuan_pp / packing_plant yang dianggap milik unit */
  shipmentTargets: string[];
  /** tabel global (tanpa dimensi unit) yang boleh di-CRUD */
  globalTables: string[];
}

export const NO_SCOPE: UnitScope = {
  all: false,
  labels: [],
  monitoringSlugs: [],
  shipmentTargets: [],
  globalTables: [],
};

export const FULL_SCOPE: UnitScope = {
  all: true,
  labels: ["Semua Unit"],
  monitoringSlugs: MONITORING_CONFIGS.map((c) => c.slug),
  shipmentTargets: [],
  globalTables: ["angkutan_darat", "shipments_darat"],
};

/** Samakan penulisan nama unit: "PP. Palu" == "pp palu" == "PP1 Palu" */
export function normalizeUnitName(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .trim()
    .toLowerCase()
    .replace(/\./g, " ")
    .replace(/\s+/g, " ");
}

function findUnit(value: string): UnitDefinition | undefined {
  if (!value) return undefined;
  return UNIT_DEFINITIONS.find((u) => u.aliases.some((a) => normalizeUnitName(a) === value));
}

/**
 * Gabungkan unit_kerja + unit_pp menjadi satu scope.
 * - Jika salah satu mengenal "Head Office" => scope penuh (all).
 * - Jika tidak ada yang dikenali => NO_SCOPE (hanya bisa melihat).
 */
export function resolveUnitScope(...units: (string | null | undefined)[]): UnitScope {
  const found: UnitDefinition[] = [];
  for (const raw of units) {
    const key = normalizeUnitName(raw);
    if (!key) continue;
    const unit = findUnit(key);
    if (unit && !found.some((f) => f.key === unit.key)) found.push(unit);
  }

  if (found.length === 0) return NO_SCOPE;
  if (found.some((u) => u.key === "head-office")) {
    return { ...FULL_SCOPE, labels: found.map((u) => u.label) };
  }

  const uniq = (arr: string[]) => Array.from(new Set(arr));
  return {
    all: false,
    labels: found.map((u) => u.label),
    monitoringSlugs: uniq(found.flatMap((u) => u.monitoringSlugs)),
    shipmentTargets: uniq(found.flatMap((u) => u.shipmentTargets)),
    globalTables: uniq(found.flatMap((u) => u.globalTables)),
  };
}

/** Cocokkan nama tujuan_pp / packing_plant dengan scope unit operator */
export function isTargetInScope(scope: UnitScope, target: unknown): boolean {
  if (scope.all) return true;
  const value = normalizeUnitName(target);
  if (!value) return false;
  return scope.shipmentTargets.some((t) => normalizeUnitName(t) === value);
}

/** Operator boleh CRUD tabel monitoring ini? */
export function isMonitoringSlugInScope(scope: UnitScope, slug: string): boolean {
  if (scope.all) return true;
  return scope.monitoringSlugs.includes(slug);
}

/** Operator boleh CRUD tabel global (angkutan_darat / shipments_darat)? */
export function isGlobalTableInScope(scope: UnitScope, table: string): boolean {
  if (scope.all) return true;
  return scope.globalTables.includes(table);
}

// ============================================================
// SCOPE BERDASARKAN users_akun.akses + users_akun.akses_pp
// (unit_kerja tidak lagi menentukan hak CRUD)
// ============================================================

export const AKSES_SEMUA = "Semua Akses";
export const AKSES_PP1 = "Packing Plant 1";
export const AKSES_PP2 = "Packing Plant 2";
export const AKSES_SILO = "Silo";
export const AKSES_ANGKUTAN_DARAT = "Angkutan Darat";

export const AKSES_OPTIONS = [
  AKSES_SEMUA,
  AKSES_PP1,
  AKSES_PP2,
  AKSES_SILO,
  AKSES_ANGKUTAN_DARAT,
];

/** Pilihan Akses PP yang valid untuk sebuah Akses */
export function getAksesPpOptions(akses: unknown): string[] {
  const a = normalizeUnitName(akses);
  if (a === normalizeUnitName(AKSES_PP1)) {
    return UNIT_DEFINITIONS.filter((u) => u.key.startsWith("pp1-")).map((u) => u.label);
  }
  if (a === normalizeUnitName(AKSES_PP2)) {
    return UNIT_DEFINITIONS.filter((u) => u.key.startsWith("pp2-")).map((u) => u.label);
  }
  return [];
}

/** Akses PP hanya relevan untuk Packing Plant 1 / 2 */
export function requiresAksesPp(akses: unknown): boolean {
  return getAksesPpOptions(akses).length > 0;
}

/** Scope dari nilai akses + akses_pp */
export function resolveAccessScope(
  akses: string | null | undefined,
  aksesPp: string | null | undefined
): UnitScope {
  const a = normalizeUnitName(akses);
  if (!a) return NO_SCOPE;

  if (a === normalizeUnitName(AKSES_SEMUA) || a === "semua" || a === "all") {
    return FULL_SCOPE;
  }

  if (requiresAksesPp(akses)) {
    const unitScope = resolveUnitScope(aksesPp);
    return unitScope.all ? NO_SCOPE : unitScope;
  }

  if (a === normalizeUnitName(AKSES_SILO)) {
    return {
      ...NO_SCOPE,
      labels: [AKSES_SILO],
      monitoringSlugs: ["silo-semen", "silo-pantai", "silo-mini", "cp-tonasa"],
    };
  }

  if (a === normalizeUnitName(AKSES_ANGKUTAN_DARAT)) {
    return {
      ...NO_SCOPE,
      labels: [AKSES_ANGKUTAN_DARAT],
      globalTables: ["angkutan_darat", "shipments_darat"],
    };
  }

  // Fallback: akses berisi nama unit langsung (mis. "Packing Plant Biringkassi")
  return aksesPp ? resolveUnitScope(aksesPp) : resolveUnitScope(akses);
}

/**
 * Scope efektif seorang user:
 * - operator  -> mengikuti akses/akses_pp
 * - role lain -> penuh (mereka memang read-only atau admin)
 */
export function resolveUserScope(
  role: string | null | undefined,
  akses: string | null | undefined,
  aksesPp: string | null | undefined
): UnitScope {
  const r = (role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (r !== "operator") return FULL_SCOPE;
  return resolveAccessScope(akses, aksesPp);
}

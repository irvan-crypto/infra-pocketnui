import { normalizeRole, canManageUsers, canWriteData, canDeleteData, type Role } from "./roles";
import {
  resolveUserScope,
  isTargetInScope,
  isMonitoringSlugInScope,
  isGlobalTableInScope,
  normalizeUnitName,
  AKSES_PLANT_PORT,
  AKSES_ANGKUTAN_LAUT,
  type UnitScope,
} from "./units";
import type { AuthUser } from "./auth-types";

// ============================================================
// ATURAN AKSES HALAMAN (dipakai Sidebar + guard ClientLayout)
// ============================================================

export interface RouteRule {
  prefix: string;
  label: string;
  roles: Role[];
}

/** Halaman sistem — role di luar daftar ini tidak boleh masuk */
export const RESTRICTED_ROUTES: RouteRule[] = [
  { prefix: "/kelola-pengguna", label: "Kelola Pengguna", roles: ["admin", "asisten_admin"] },
  { prefix: "/db-status", label: "DB Status", roles: ["admin", "asisten_admin"] },
  { prefix: "/monitoring/semua-silo", label: "Semua Silo", roles: ["admin"] },
  { prefix: "/rkap", label: "RKAP", roles: ["admin", "asisten_admin"] },
];

/** Role yang boleh membuka halaman Profil */
export const PROFILE_ROLES: Role[] = [
  "admin",
  "asisten_admin",
  "general_manager",
  "senior_manager",
  "manager",
  "direksi",
  "operator",
  "staff",
];

/** Role yang boleh melihat semua halaman data (selain halaman sistem di atas) */
const FULL_VIEW_ROLES: Role[] = [
  "admin",
  "asisten_admin",
  "general_manager",
  "senior_manager",
  "manager",
  "direksi",
];

/** Role yang hanya boleh Dashboard + Ringkasan Monitoring (+ Profil untuk staff) */
const BASIC_ROLES: Role[] = ["staff", "guest"];

export function getRouteRule(pathname: string): RouteRule | null {
  return (
    RESTRICTED_ROUTES.find(
      (rule) => pathname === rule.prefix || pathname.startsWith(rule.prefix + "/")
    ) ?? null
  );
}

/** Normalisasi path: buang query/hash & garis miring di akhir */
function cleanPath(pathname: string): string {
  const path = String(pathname || "/").split("?")[0].split("#")[0];
  if (path.length > 1 && path.endsWith("/")) return path.replace(/\/+$/, "");
  return path || "/";
}

/**
 * Boleh membuka halaman ini?
 * `user` dibutuhkan untuk operator (akses/akses_pp menentukan unit).
 */
export function canAccessPath(
  role: unknown,
  pathname: string,
  user?: { akses?: string | null; aksesPp?: string | null } | null
): boolean {
  const r = normalizeRole(role);
  if (!r) return false;

  const path = cleanPath(pathname);

  // Halaman yang sudah dihapus
  if (path === "/shipments" || path.startsWith("/shipments/")) return false;
  if (path.startsWith("/interplant-logistic")) return false;

  // Profil: semua role kecuali guest
  if (path === "/profil") return PROFILE_ROLES.includes(r);

  // Halaman sistem
  const rule = getRouteRule(path);
  if (rule) return rule.roles.includes(r);

  // Root (redirect ke dashboard)
  if (path === "/") return true;

  // Admin, Asisten Admin, GM, SM, Manager, Direksi: semua halaman data
  if (FULL_VIEW_ROLES.includes(r)) return true;

  // Ringkasan monitoring (semua role)
  if (path === "/monitoring") return true;

  // Dashboard (semua role)
  if (path === "/dashboard" || path.startsWith("/dashboard/")) return true;

  // Staff & Guest: hanya dashboard + ringkasan monitoring
  if (BASIC_ROLES.includes(r)) return false;

  // Operator: halaman unitnya sendiri + angkutan laut + stok harian (view-only)
  if (r === "operator") {
    const scope = resolveUserScope(r, user?.akses, user?.aksesPp);
    const akses = normalizeUnitName(user?.akses);
    const slug = path.match(/^\/monitoring\/([a-z0-9-]+)$/)?.[1];
    if (!slug) return false;

    if (slug === "angkutan-darat") return isGlobalTableInScope(scope, "angkutan_darat");
    if (slug === "angkutan-laut") {
      return (
        scope.all ||
        akses === normalizeUnitName(AKSES_ANGKUTAN_LAUT) ||
        scope.labels.includes(AKSES_ANGKUTAN_LAUT)
      );
    }
    // Stok harian: operator Plant & Port Prod boleh melihat (view-only)
    if (slug === "silo-semen") {
      return scope.all || akses === normalizeUnitName(AKSES_PLANT_PORT);
    }
    return isMonitoringSlugInScope(scope, slug);
  }

  return false;
}

// ============================================================
// PERMISSIONS UNTUK UI
// ============================================================

export interface PagePermissions {
  role: Role | null;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  isViewOnly: boolean;
  scope: UnitScope;
  /** label unit yang dikenali (kosong = belum dipetakan) */
  unitLabels: string[];
}

export function getPermissions(user: AuthUser | null): PagePermissions {
  const role = normalizeRole(user?.role);
  const write = canWriteData(role);
  const scope = resolveUserScope(role, user?.akses, user?.aksesPp);

  return {
    role,
    canCreate: write,
    canUpdate: write,
    canDelete: canDeleteData(role),
    canManageUsers: canManageUsers(role),
    isViewOnly: !write,
    scope,
    unitLabels: scope.labels,
  };
}

/** Operator hanya boleh menambah/mengubah data pada baris milik unitnya */
export function canEditShipmentRow(
  perms: PagePermissions,
  row: { tujuan_pp?: string | null } | null | undefined
): boolean {
  if (!perms.canUpdate) return false;
  if (!row) return false;
  return isTargetInScope(perms.scope, row.tujuan_pp);
}

export function canEditRkapRow(
  perms: PagePermissions,
  row: { packing_plant?: string | null } | null | undefined
): boolean {
  if (!perms.canUpdate) return false;
  if (!row) return false;
  return isTargetInScope(perms.scope, row.packing_plant);
}

/** Halaman monitoring (slug) boleh di-CRUD oleh operator unit ini? */
export function canEditMonitoringPage(perms: PagePermissions, slug: string): boolean {
  if (!perms.canUpdate) return false;
  return isMonitoringSlugInScope(perms.scope, slug);
}

/** Alasan singkat kenapa tombol edit disembunyikan */
export function writeDeniedMessage(user: AuthUser | null): string {
  const role = normalizeRole(user?.role);
  const scope = resolveUserScope(role, user?.akses, user?.aksesPp);
  if (!role) return "Sesi tidak valid. Silakan login ulang.";
  if (!canWriteData(role)) {
    return "Role Anda hanya memiliki akses lihat (read-only).";
  }
  if (!scope.all && scope.labels.length === 0) {
    return "Akses Anda belum diatur (Akses / Akses PP kosong), sehingga akses ubah data dibatasi.";
  }
  if (!scope.all) {
    return `Akses ubah data dibatasi untuk: ${scope.labels.join(", ")}.`;
  }
  return "";
}

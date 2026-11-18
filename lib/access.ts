import { normalizeRole, canManageUsers, canWriteData, canDeleteData, type Role } from "./roles";
import {
  resolveUserScope,
  isTargetInScope,
  isMonitoringSlugInScope,
  type UnitScope,
} from "./units";
import type { AuthUser } from "./auth-types";

// ============================================================
// ATURAN AKSES HALAMAN (dipakai Sidebar + guard ClientLayout)
// Semua role yang login boleh MELIHAT modul data.
// Halaman sistem (kelola pengguna, db status) hanya admin.
// ============================================================

export interface RouteRule {
  prefix: string;
  label: string;
  roles: Role[];
}

export const RESTRICTED_ROUTES: RouteRule[] = [
  { prefix: "/kelola-pengguna", label: "Kelola Pengguna", roles: ["admin", "asisten_admin"] },
  { prefix: "/db-status", label: "DB Status", roles: ["admin", "asisten_admin"] },
];

export function getRouteRule(pathname: string): RouteRule | null {
  return (
    RESTRICTED_ROUTES.find(
      (rule) => pathname === rule.prefix || pathname.startsWith(rule.prefix + "/")
    ) ?? null
  );
}

export function canAccessPath(role: unknown, pathname: string): boolean {
  const r = normalizeRole(role);
  if (!r) return false;
  const rule = getRouteRule(pathname);
  return rule ? rule.roles.includes(r) : true;
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

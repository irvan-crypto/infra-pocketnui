import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "./session";
import { normalizeRole, canWriteData, canDeleteData, canManageUsers } from "@/lib/roles";

// ============================================================
// GUARD UNTUK API ROUTE
// Semua endpoint data wajib punya sesi; tulis/hapus butuh role.
// ============================================================

export const unauthorized = (message = "Sesi tidak valid. Silakan login ulang.") =>
  NextResponse.json({ ok: false, message }, { status: 401 });

export const forbidden = (message = "Anda tidak memiliki akses untuk aksi ini.") =>
  NextResponse.json({ ok: false, message }, { status: 403 });

type GuardResult = { user: SessionUser } | { error: NextResponse };

/** Wajib login (semua role boleh) */
export async function requireUser(): Promise<GuardResult> {
  const user = await getSessionUser();
  if (!user) return { error: unauthorized() };
  return { user };
}

/** Wajib login + boleh menulis data operasional */
export async function requireWriter(): Promise<GuardResult> {
  const user = await getSessionUser();
  if (!user) return { error: unauthorized() };
  if (!canWriteData(user.role)) {
    return {
      error: forbidden("Role Anda hanya memiliki akses lihat (read-only)."),
    };
  }
  return { user };
}

/** Wajib login + boleh menghapus data operasional */
export async function requireDeleter(): Promise<GuardResult> {
  const user = await getSessionUser();
  if (!user) return { error: unauthorized() };
  if (!canDeleteData(user.role)) {
    return { error: forbidden("Hanya Admin / Asisten Admin yang boleh menghapus data.") };
  }
  return { user };
}

/** Wajib login + boleh mengelola pengguna & halaman sistem */
export async function requireAdmin(): Promise<GuardResult> {
  const user = await getSessionUser();
  if (!user) return { error: unauthorized() };
  if (!canManageUsers(user.role)) {
    return { error: forbidden("Hanya Admin / Asisten Admin yang boleh mengakses fitur ini.") };
  }
  return { user };
}

export function isAdminRole(role: unknown): boolean {
  return canManageUsers(normalizeRole(role));
}

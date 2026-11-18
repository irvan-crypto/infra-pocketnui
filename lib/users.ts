// ============================================================
// Tipe & aturan untuk tabel users_akun
// ============================================================

export const DEFAULT_PASSWORD = "Password123";

export const STATUS_OPTIONS = ["Aktif", "Nonaktif"] as const;
export type UserStatus = (typeof STATUS_OPTIONS)[number];

export interface UsersAkun {
  id: string;
  nama_lengkap: string;
  email: string | null;
  no_handphone: string | null;
  jabatan: string | null;
  unit_kerja: string | null;
  departemen: string | null;
  username: string;
  role: string;
  akses: string | null;
  akses_pp: string | null;
  status: UserStatus | string;
  created_at?: string;
  updated_at?: string;
}

/** Kolom yang aman dikirim ke client (tanpa password) */
export const USERS_SAFE_COLUMNS =
  "id, nama_lengkap, email, no_handphone, jabatan, unit_kerja, departemen, username, role, akses, akses_pp, status, created_at, updated_at";

export interface PasswordCheck {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  valid: boolean;
}

export function checkPassword(password: string): PasswordCheck {
  const value = password || "";
  const minLength = value.length >= 8;
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  return {
    minLength,
    hasUpper,
    hasLower,
    hasNumber,
    valid: minLength && hasUpper && hasLower && hasNumber,
  };
}

export function passwordErrors(password: string): string[] {
  const c = checkPassword(password);
  const errors: string[] = [];
  if (!c.minLength) errors.push("Minimal 8 karakter");
  if (!c.hasUpper) errors.push("Mengandung huruf besar");
  if (!c.hasLower) errors.push("Mengandung huruf kecil");
  if (!c.hasNumber) errors.push("Mengandung angka");
  return errors;
}

/** Status dianggap aktif (toleran case) */
export function isActiveStatus(status: unknown): boolean {
  return String(status || "").trim().toLowerCase() === "aktif";
}

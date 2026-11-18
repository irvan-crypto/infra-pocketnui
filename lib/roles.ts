// ============================================================
// SATU SUMBER KEBENARAN UNTUK ROLE
// Dipakai oleh client (UI) maupun server (API/guard).
// Jangan mendefinisikan role di tempat lain.
// ============================================================

export const ROLES = [
  "admin",
  "asisten_admin",
  "general_manager",
  "senior_manager",
  "manager",
  "operator",
  "guest",
] as const;

export type Role = (typeof ROLES)[number];

export interface RoleMeta {
  /** Label yang tampil di UI */
  label: string;
  /** Label pendek untuk badge */
  short: string;
  icon: string;
  /** Tailwind class badge */
  badge: string;
  description: string;
  /** true = hanya boleh melihat (read-only) */
  viewOnly: boolean;
}

export const ROLE_META: Record<Role, RoleMeta> = {
  admin: {
    label: "Admin",
    short: "Admin",
    icon: "🛡️",
    badge: "bg-purple-50 text-purple-700",
    description: "Akses penuh: CRUD semua modul + kelola pengguna.",
    viewOnly: false,
  },
  asisten_admin: {
    label: "Asisten Admin",
    short: "Asmin",
    icon: "🧰",
    badge: "bg-indigo-50 text-indigo-700",
    description: "Akses penuh: CRUD semua modul + kelola pengguna.",
    viewOnly: false,
  },
  general_manager: {
    label: "General Manager",
    short: "GM",
    icon: "👔",
    badge: "bg-blue-50 text-blue-700",
    description: "Melihat semua modul tanpa hak ubah.",
    viewOnly: true,
  },
  senior_manager: {
    label: "Senior Manager",
    short: "SM",
    icon: "🎯",
    badge: "bg-sky-50 text-sky-700",
    description: "Melihat semua modul tanpa hak ubah.",
    viewOnly: true,
  },
  manager: {
    label: "Manager",
    short: "Mgr",
    icon: "📊",
    badge: "bg-cyan-50 text-cyan-700",
    description: "Melihat semua modul tanpa hak ubah.",
    viewOnly: true,
  },
  operator: {
    label: "Operator",
    short: "Ops",
    icon: "📝",
    badge: "bg-emerald-50 text-emerald-700",
    description: "CRUD data sesuai unit kerja.",
    viewOnly: false,
  },
  guest: {
    label: "Guest",
    short: "Guest",
    icon: "👁️",
    badge: "bg-gray-100 text-gray-700",
    description: "Melihat semua modul tanpa hak ubah.",
    viewOnly: true,
  },
};

export const ROLE_OPTIONS: { value: Role; label: string; description: string }[] = ROLES.map(
  (role) => ({
    value: role,
    label: ROLE_META[role].label,
    description: ROLE_META[role].description,
  })
);

/** Role yang boleh menulis (create/update) data operasional */
export const WRITE_ROLES: Role[] = ["admin", "asisten_admin", "operator"];

/** Role yang boleh menghapus data operasional */
export const DELETE_ROLES: Role[] = ["admin", "asisten_admin"];

/** Role yang boleh mengelola pengguna & halaman sistem */
export const USER_MANAGEMENT_ROLES: Role[] = ["admin", "asisten_admin"];

/** Role yang hanya boleh melihat */
export const VIEW_ONLY_ROLES: Role[] = ROLES.filter((r) => ROLE_META[r].viewOnly);

/** Alias role lama / variasi penulisan dari form & data historis */
const ROLE_ALIASES: Record<string, Role> = {
  admin: "admin",
  administrator: "admin",
  asisten_admin: "asisten_admin",
  asistenadmin: "asisten_admin",
  "asisten admin": "asisten_admin",
  assistant_admin: "asisten_admin",
  "assistant admin": "asisten_admin",
  adm_asis: "asisten_admin",
  general_manager: "general_manager",
  generalmanager: "general_manager",
  "general manager": "general_manager",
  gm: "general_manager",
  senior_manager: "senior_manager",
  seniormanager: "senior_manager",
  "senior manager": "senior_manager",
  sm: "senior_manager",
  manager: "manager",
  mgr: "manager",
  operator: "operator",
  ops: "operator",
  guest: "guest",
  // role lama (sebelum standarisasi)
  viewer: "guest",
  "viewer only": "guest",
  tamu: "guest",
};

function canonical(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, " ")
    .replace(/\./g, "");
}

/** Normalisasi role dari DB/form (toleran terhadap alias & case). */
export function normalizeRole(input: unknown): Role | null {
  if (typeof input !== "string") return null;
  const key = canonical(input);
  if (ROLE_ALIASES[key]) return ROLE_ALIASES[key];
  const underscored = key.replace(/ /g, "_");
  if ((ROLES as readonly string[]).includes(underscored)) return underscored as Role;
  return null;
}

export function isRole(input: unknown): input is Role {
  return normalizeRole(input) !== null;
}

/** True jika role valid (sudah dinormalisasi) */
export function safeRole(input: unknown): Role {
  return normalizeRole(input) ?? "guest";
}

export const roleLabel = (role: unknown): string => {
  const r = normalizeRole(role);
  return r ? ROLE_META[r].label : "User";
};

export const roleBadgeClass = (role: unknown): string => {
  const r = normalizeRole(role);
  return r ? ROLE_META[r].badge : "bg-gray-50 text-gray-700";
};

// ── Kapabilitas ────────────────────────────────────────────
export function canWriteData(role: unknown): boolean {
  const r = normalizeRole(role);
  return !!r && WRITE_ROLES.includes(r);
}

export function canDeleteData(role: unknown): boolean {
  const r = normalizeRole(role);
  return !!r && DELETE_ROLES.includes(r);
}

export function canManageUsers(role: unknown): boolean {
  const r = normalizeRole(role);
  return !!r && USER_MANAGEMENT_ROLES.includes(r);
}

export function isViewOnly(role: unknown): boolean {
  const r = normalizeRole(role);
  return !!r && VIEW_ONLY_ROLES.includes(r);
}

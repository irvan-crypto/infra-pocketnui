import { ROLE_META, type Role } from "./roles";

/** Label + ikon untuk kebutuhan UI (Sidebar, badge, dsb.) */
export const ROLE_LABELS: Record<Role, { label: string; icon: string }> = Object.fromEntries(
  (Object.keys(ROLE_META) as Role[]).map((role) => [
    role,
    { label: ROLE_META[role].label, icon: ROLE_META[role].icon },
  ])
) as Record<Role, { label: string; icon: string }>;

export const getAccessibleRoutes = (): string[] => [];

export const DEFAULT_AVATAR_URL = "/icons/avatar-default.png";

/** Key localStorage lama — tidak lagi dipakai untuk otorisasi (sesi = cookie HttpOnly) */
export const STORAGE_KEY_AUTH = "shipmonitor_auth";

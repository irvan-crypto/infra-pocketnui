import type { Role, RouteKey } from "./auth-types";

export const ROLE_LABELS: Record<Role, { label: string; icon: string }> = {
  admin: { label: "Admin", icon: "🛡️" },
  manager: { label: "Manager", icon: "📊" },
  operator: { label: "Operator", icon: "📝" },
};

export const ROLE_ROUTES: Record<Role, RouteKey[]> = {
  admin: ["dashboard", "shipments", "profile"],
  manager: ["dashboard", "shipments", "profile"],
  operator: ["dashboard", "shipments", "profile"],
};

export const getAccessibleRoutes = (role: Role): RouteKey[] => {
  return ROLE_ROUTES[role] || [];
};

export const DEFAULT_AVATAR_URL = "/icons/avatar-default.png";

export const STORAGE_KEY_AUTH = "shipmonitor_auth";
export const DEFAULT_PASSWORD = "Password123";
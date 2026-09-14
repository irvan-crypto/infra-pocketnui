export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "v1.0.0";
export const APP_NAME = "ShipMonitor Pocket";
export const COMPANY_NAME = "PT. Semen Tonasa / SBI";

export const STORAGE_KEY_AUTH = "shipmonitor_auth";

export const DEFAULT_PASSWORD = "Password123";

// Status pelayaran kapal (urutan linear)
export const SHIP_STATUS_ORDER = [
  "ta_tiba",
  "sandar",
  "muat",
  "selesai_muat",
  "td_pelabuhan",
  "ta_pp",
] as const;

export type ShipStatusKey = (typeof SHIP_STATUS_ORDER)[number];

export const SHIP_STATUS_LABELS: Record<ShipStatusKey, string> = {
  ta_tiba: "TA.",
  sandar: "SANDAR",
  muat: "MUAT",
  selesai_muat: "Selesai MUAT",
  td_pelabuhan: "TD. BKS/TUBAN",
  ta_pp: "TA. PP",
};

export const SHIP_STATUS_COLORS: Record<ShipStatusKey, string> = {
  ta_tiba: "bg-blue-100 text-blue-800 border-blue-200",
  sandar: "bg-yellow-100 text-yellow-800 border-yellow-200",
  muat: "bg-orange-100 text-orange-800 border-orange-200",
  selesai_muat: "bg-amber-100 text-amber-800 border-amber-200",
  td_pelabuhan: "bg-purple-100 text-purple-800 border-purple-200",
  ta_pp: "bg-green-100 text-green-800 border-green-200",
};

export const SHIP_STATUS_ICONS: Record<ShipStatusKey, string> = {
  ta_tiba: "⚓",
  sandar: "🚢",
  muat: "📦",
  selesai_muat: "✅",
  td_pelabuhan: "🌊",
  ta_pp: "🏭",
};
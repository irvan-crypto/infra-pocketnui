import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guard";
import { MONITORING_TABLE_NAMES } from "@/lib/monitoring-config";
import { PP_UNITS } from "@/lib/semua-silo";

// ============================================================
// GET /api/monitoring-periods?tables=silo_semen,silo_pantai
// Daftar periode (tahun-bulan) yang benar-benar ada di data.
// Dipakai untuk mengisi dropdown filter Tahun & Bulan pada
// halaman ringkasan (yang barisnya bukan data mentah).
//
// Respons: { ok: true, periods: ["2026-11", "2026-10", ...] }
// ============================================================

const SEMUA_SILO_TABLES = ["silo_semen", "silo_pantai", ...PP_UNITS.map((u) => u.table)];

/** Tabel yang boleh dibaca endpoint ini */
const ALLOWED = new Set<string>([
  ...MONITORING_TABLE_NAMES,
  ...SEMUA_SILO_TABLES,
  "angkutan_darat",
]);

export async function GET(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const requested = (searchParams.get("tables") || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const tables = (requested.length > 0 ? requested : MONITORING_TABLE_NAMES).filter(
    (t) => ALLOWED.has(t)
  );

  try {
    const client = createAdminClient();

    const results = await Promise.all(
      tables.map(async (table) => {
        // Hanya butuh kolom tanggal → payload kecil
        const { data, error } = await client
          .from(table)
          .select("tanggal")
          .not("tanggal", "is", null)
          .order("tanggal", { ascending: false })
          .limit(2000);
        if (error) {
          console.error(`periods ${table} error:`, error);
          return [] as string[];
        }
        return (data ?? [])
          .map((r: { tanggal?: string | null }) => String(r.tanggal ?? "").slice(0, 7))
          .filter((p) => /^\d{4}-\d{2}$/.test(p));
      })
    );

    const periods = Array.from(new Set(results.flat())).sort((a, b) => b.localeCompare(a));

    return NextResponse.json({ ok: true, periods });
  } catch (error) {
    console.error("GET monitoring-periods error:", error);
    return NextResponse.json(
      { ok: false, message: "Gagal mengambil daftar periode" },
      { status: 500 }
    );
  }
}

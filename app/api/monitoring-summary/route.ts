import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guard";
import { MONITORING_TABLE_NAMES } from "@/lib/monitoring-config";
import { periodEndISO, type Period } from "@/lib/period";

// ============================================================
// API ringkasan monitoring: baris terakhir pada/ sebelum
// akhir periode terpilih, dari setiap tabel monitoring.
// Query: ?tahun=2026&bulan=11 (opsional, tanpa query = data terbaru)
// ============================================================

export async function GET(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("tahun")) || "all";
  const month = Number(searchParams.get("bulan")) || "all";
  const period: Period = { year, month: year === "all" ? "all" : month };
  const end = periodEndISO(period);

  try {
    const client = createAdminClient();

    const entries = await Promise.all(
      MONITORING_TABLE_NAMES.map(async (table) => {
        let query = client
          .from(table)
          .select("*")
          .order("tanggal", { ascending: false })
          .limit(1);
        if (end) query = query.lte("tanggal", end);
        const { data, error } = await query;
        if (error) {
          console.error(`summary ${table} error:`, error);
          return [table, null];
        }
        return [table, data?.[0] ?? null];
      })
    );

    return NextResponse.json({
      ok: true,
      period: end,
      latest: Object.fromEntries(entries),
    });
  } catch (error) {
    console.error("GET monitoring-summary error:", error);
    return NextResponse.json(
      { ok: false, message: "Gagal mengambil ringkasan" },
      { status: 500 }
    );
  }
}

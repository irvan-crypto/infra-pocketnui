import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";
import { MONITORING_TABLE_NAMES } from "@/lib/monitoring-config";

// ============================================================
// API ringkasan monitoring: baris terakhir (tanggal terbaru)
// dari setiap tabel monitoring.
// ============================================================

export async function GET() {
  try {
    const client = createClient();

    const entries = await Promise.all(
      MONITORING_TABLE_NAMES.map(async (table) => {
        const { data, error } = await client
          .from(table)
          .select("*")
          .order("tanggal", { ascending: false })
          .limit(1);
        if (error) {
          console.error(`summary ${table} error:`, error);
          return [table, null];
        }
        return [table, data?.[0] ?? null];
      })
    );

    return NextResponse.json({ ok: true, latest: Object.fromEntries(entries) });
  } catch (error) {
    console.error("GET monitoring-summary error:", error);
    return NextResponse.json(
      { ok: false, message: "Gagal mengambil ringkasan" },
      { status: 500 }
    );
  }
}

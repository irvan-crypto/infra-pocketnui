import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireUser, forbidden } from "@/lib/auth/guard";
import { normalizeRole } from "@/lib/roles";
import { PP_UNITS, siloNumberOf, siloStokSource } from "@/lib/semua-silo";
import { periodEndISO, type Period } from "@/lib/period";

// ============================================================
// GET /api/semua-silo
// Kapasitas & deadstok (packing_plant) + stok aktual terbaru:
// - Silo 1–10  : silo_pantai.silo_1..10
// - Silo 21–53 : silo_semen.stok_silo21..53
// - PP.xxx     : <prefix>_stokakhir_opc + <prefix>_stokakhir_pcc
// Tanggal terbaru diambil per tabel masing-masing — dibatasi akhir
// periode terpilih (query ?tahun=2026&bulan=11) supaya kartu menampilkan
// kondisi akhir bulan tersebut. Tanpa query = data terbaru.
// ============================================================

function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (normalizeRole(auth.user.role) !== "admin") {
    return forbidden("Hanya Admin yang boleh mengakses halaman Semua Silo.");
  }

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("tahun")) || "all";
  const month = Number(searchParams.get("bulan")) || "all";
  const period: Period = { year, month: year === "all" ? "all" : month };
  const end = periodEndISO(period);

  try {
    const supabase = createAdminClient();

    // Baris terbaru satu tabel harian (dibatasi akhir periode)
    const latestOf = async (table: string) => {
      let query = supabase
        .from(table)
        .select("*")
        .order("tanggal", { ascending: false })
        .limit(1);
      if (end) query = query.lte("tanggal", end);
      const { data, error } = await query;
      if (error) throw error;
      return data?.[0] ?? null;
    };

    const [ppRows, siloSemen, siloPantai, ...ppLatest] = await Promise.all([
      supabase.from("packing_plant").select("*").order("nama_pp", { ascending: true }),
      latestOf("silo_semen"),
      latestOf("silo_pantai"),
      ...PP_UNITS.map((unit) => latestOf(unit.table)),
    ]);

    if (ppRows.error) throw ppRows.error;

    const stok: Record<string, number> = {};
    const tanggal: Record<string, string | null> = {};

    for (const row of ppRows.data ?? []) {
      const nama = String(row.nama_pp ?? "").trim();
      if (!nama) continue;
      const nomor = siloNumberOf(nama);
      if (nomor === null) continue; // PP ditangani di bawah

      const { table, column } = siloStokSource(nomor);
      const source = table === "silo_pantai" ? siloPantai : siloSemen;
      if (!source) continue;
      stok[nama] = num(source[column]);
      tanggal[nama] = source.tanggal ?? null;
    }

    PP_UNITS.forEach((unit, index) => {
      const row = ppLatest[index];
      if (!row) return;
      const opc = num(row[`${unit.prefix}_stokakhir_opc`]);
      const pcc = num(row[`${unit.prefix}_stokakhir_pcc`]);
      stok[unit.nama] = opc + pcc;
      tanggal[unit.nama] = row.tanggal ?? null;
    });

    return NextResponse.json({
      ok: true,
      period: end,
      rows: ppRows.data ?? [],
      stok,
      tanggal,
    });
  } catch (error) {
    console.error("GET semua-silo error:", error);
    return NextResponse.json(
      { ok: false, message: "Gagal mengambil data kapasitas & stok silo." },
      { status: 500 }
    );
  }
}

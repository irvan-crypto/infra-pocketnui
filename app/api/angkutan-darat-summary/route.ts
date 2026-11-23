import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guard";

// ============================================================
// Ringkasan Angkutan Darat per Expeditur
// - Query: ?tahun=2026&bulan=11 (opsional)
//   · tanpa query  → bulan berjalan
//   · tahun saja   → seluruh tahun itu
// - Harian: baris terakhir di dalam periode
// - MTD: agregasi seluruh baris di dalam periode
// ============================================================

export async function GET(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const tahunParam = Number(searchParams.get("tahun")) || null;
  const bulanParam = Number(searchParams.get("bulan")) || null;

  try {
    const client = createAdminClient();

    const { data, error } = await client
      .from("angkutan_darat")
      .select("*")
      .order("tanggal", { ascending: false });

    if (error) throw error;

    const byExpeditur = new Map<string, any[]>();
    for (const row of data || []) {
      const name = row.nama_expeditur || "—";
      if (!byExpeditur.has(name)) byExpeditur.set(name, []);
      byExpeditur.get(name)!.push(row);
    }

    // Periode acuan: parameter URL, fallback ke bulan berjalan
    const today = new Date();
    const curYear = tahunParam ?? today.getFullYear();
    const curMonth = bulanParam ?? (tahunParam ? null : today.getMonth() + 1);

    const result = [];
    for (const [name, rows] of byExpeditur) {
      rows.sort(
        (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
      );

      // Baris di dalam periode
      const mtdRows = rows.filter((r) => {
        const d = new Date(r.tanggal);
        if (d.getFullYear() !== curYear) return false;
        if (curMonth !== null && d.getMonth() + 1 !== curMonth) return false;
        return true;
      });

      // Expeditur tanpa data di periode ini tidak ditampilkan
      if (mtdRows.length === 0) continue;

      const latest = mtdRows[0]; // harian (tgl terbaru dalam periode)

      const totalTonase = mtdRows.reduce(
        (sum, r) => sum + Number(r.tonase || 0),
        0
      );
      const totalRetase = mtdRows.reduce(
        (sum, r) => sum + Number(r.retase || 0),
        0
      );
      const avgArmada =
        mtdRows.length > 0
          ? mtdRows.reduce((sum, r) => sum + Number(r.armada_operasi || 0), 0) /
            mtdRows.length
          : 0;

      result.push({
        nama_expeditur: name,
        harian: {
          tanggal: latest.tanggal,
          tonase: Number(latest.tonase || 0),
          retase: Number(latest.retase || 0),
          armada_operasi: Number(latest.armada_operasi || 0),
        },
        mtd: {
          total_tonase: totalTonase,
          total_retase: totalRetase,
          avg_armada: avgArmada,
          days: mtdRows.length,
        },
      });
    }

    // Urutkan: total tonase MTD terbesar dulu
    result.sort((a, b) => b.mtd.total_tonase - a.mtd.total_tonase);

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    console.error("GET angkutan-darat-summary error:", error);
    return NextResponse.json(
      { ok: false, message: "Gagal mengambil ringkasan angkutan darat" },
      { status: 500 }
    );
  }
}
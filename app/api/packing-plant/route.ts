import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";

// ============================================================
// Data kapasitas & deadstok silo/PP dari tabel packing_plant
// ============================================================

export async function GET() {
  try {
    const { data, error } = await createClient()
      .from("packing_plant")
      .select("*")
      .order("nama_pp", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("GET packing_plant error:", error);
    return NextResponse.json(
      { ok: false, message: "Gagal mengambil data packing plant" },
      { status: 500 }
    );
  }
}

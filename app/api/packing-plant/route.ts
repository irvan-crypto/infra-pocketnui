import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guard";

// ============================================================
// Data kapasitas & deadstok silo/PP dari tabel packing_plant
// ============================================================

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const { data, error } = await createAdminClient()
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

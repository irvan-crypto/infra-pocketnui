import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireUser, forbidden } from "@/lib/auth/guard";
import { normalizeRole } from "@/lib/roles";

// ============================================================
// Data kapasitas & deadstok silo/PP dari tabel packing_plant
// - GET   : semua user login (dipakai grafik tabung silo)
// - Tulis : HANYA role admin (halaman /monitoring/semua-silo)
// ============================================================

/** Guard khusus: hanya role admin (bukan asisten admin) */
async function requireStrictAdmin() {
  const auth = await requireUser();
  if ("error" in auth) return auth;
  if (normalizeRole(auth.user.role) !== "admin") {
    return { error: forbidden("Hanya Admin yang boleh mengubah data kapasitas silo.") };
  }
  return auth;
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function buildPayload(body: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};
  if (body.nama_pp !== undefined) payload.nama_pp = String(body.nama_pp ?? "").trim();
  if (body.kapasitas_pp !== undefined) payload.kapasitas_pp = toNumber(body.kapasitas_pp);
  if (body.deadstok_pp !== undefined) payload.deadstok_pp = toNumber(body.deadstok_pp);
  return payload;
}

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

export async function POST(request: Request) {
  const auth = await requireStrictAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const payload = buildPayload(body);

    if (!payload.nama_pp) {
      return NextResponse.json(
        { ok: false, message: "Nama silo / PP wajib diisi." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from("packing_plant")
      .select("id")
      .eq("nama_pp", payload.nama_pp)
      .maybeSingle();

    if (existing?.id) {
      return NextResponse.json(
        { ok: false, message: `Nama "${payload.nama_pp}" sudah ada.` },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("packing_plant")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("POST packing_plant error:", error);
    return NextResponse.json(
      { ok: false, message: "Gagal menambah data kapasitas silo." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireStrictAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const id = body.id;
    if (!id) {
      return NextResponse.json({ ok: false, message: "ID data wajib diisi." }, { status: 400 });
    }

    const payload = buildPayload(body);
    if (payload.nama_pp !== undefined && !payload.nama_pp) {
      return NextResponse.json(
        { ok: false, message: "Nama silo / PP wajib diisi." },
        { status: 400 }
      );
    }
    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ ok: false, message: "Tidak ada data yang diubah." }, { status: 400 });
    }

    const { data, error } = await createAdminClient()
      .from("packing_plant")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("PUT packing_plant error:", error);
    return NextResponse.json(
      { ok: false, message: "Gagal menyimpan perubahan data kapasitas silo." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireStrictAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const id = body?.id;
    if (!id) {
      return NextResponse.json({ ok: false, message: "ID data wajib diisi." }, { status: 400 });
    }

    const { error } = await createAdminClient().from("packing_plant").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE packing_plant error:", error);
    return NextResponse.json(
      { ok: false, message: "Gagal menghapus data kapasitas silo." },
      { status: 500 }
    );
  }
}

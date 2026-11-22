import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireUser, forbidden } from "@/lib/auth/guard";
import { canWriteData, canManageUsers, isScopedRole } from "@/lib/roles";
import { resolveUserScope, isTargetInScope } from "@/lib/units";
import type { SessionUser } from "@/lib/auth/session";

/** Halaman & API RKAP hanya untuk Admin / Asisten Admin */
async function requireRkapAccess() {
  const auth = await requireUser();
  if ("error" in auth) return auth;
  if (!canManageUsers(auth.user.role)) {
    return { error: forbidden("Halaman RKAP hanya untuk Admin / Asisten Admin.") };
  }
  return auth;
}



// ============================================================
// RKAP shipment laut (target per packing plant).
// Supervisor/Operator hanya boleh CRUD untuk packing_plant unitnya.
// ============================================================

function canWritePlant(user: SessionUser, plant: unknown): boolean {
  if (!canWriteData(user.role)) return false;
  if (isScopedRole(user.role)) {
    return isTargetInScope(resolveUserScope(user.role, user.akses, user.aksesPp), plant);
  }
  return true;
}

const outOfScope = (message: string) =>
  NextResponse.json({ ok: false, message }, { status: 403 });

export async function GET() {
  const auth = await requireRkapAccess();
  if ("error" in auth) return auth.error;

  try {
    const { data, error } = await createAdminClient()
      .from("rkap_shipments")
      .select("*")
      .order("tahun", { ascending: false })
      .order("bulan", { ascending: false })
      .order("packing_plant", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("GET rkap_shipments error:", error);
    return NextResponse.json({ ok: false, message: "Gagal mengambil data RKAP shipment" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireRkapAccess();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();

    if (!canWritePlant(auth.user, body.packing_plant)) {
      return outOfScope("Packing plant di luar unit kerja Anda.");
    }

    const { data, error } = await createAdminClient()
      .from("rkap_shipments")
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("POST rkap_shipments error:", error);
    const message =
      typeof error === "object" && error && "message" in error
        ? String((error as { message?: unknown }).message)
        : "Gagal menambah data RKAP shipment";
    const details =
      typeof error === "object" && error && "details" in error
        ? String((error as { details?: unknown }).details)
        : undefined;
    const hint =
      typeof error === "object" && error && "hint" in error
        ? String((error as { hint?: unknown }).hint)
        : undefined;
    return NextResponse.json(
      { ok: false, message, details, hint },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireRkapAccess();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ ok: false, message: "ID wajib diisi" }, { status: 400 });

    const client = createAdminClient();

    if (isScopedRole(auth.user.role)) {
      const { data: existing } = await client
        .from("rkap_shipments")
        .select("packing_plant")
        .eq("id", id)
        .single();

      if (!existing) {
        return NextResponse.json({ ok: false, message: "Data tidak ditemukan" }, { status: 404 });
      }
      if (!canWritePlant(auth.user, existing.packing_plant)) {
        return outOfScope("Data ini bukan milik unit kerja Anda.");
      }
      if (updates.packing_plant !== undefined && !canWritePlant(auth.user, updates.packing_plant)) {
        return outOfScope("Packing plant baru di luar unit kerja Anda.");
      }
    }

    const { data, error } = await client
      .from("rkap_shipments")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("PUT rkap_shipments error:", error);
    return NextResponse.json({ ok: false, message: "Gagal update data RKAP shipment" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireRkapAccess();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ ok: false, message: "ID wajib diisi" }, { status: 400 });

    const client = createAdminClient();

    if (isScopedRole(auth.user.role)) {
      const { data: existing } = await client
        .from("rkap_shipments")
        .select("packing_plant")
        .eq("id", id)
        .single();
      if (!existing || !canWritePlant(auth.user, existing.packing_plant)) {
        return outOfScope("Data ini bukan milik unit kerja Anda.");
      }
    }

    const { error } = await client.from("rkap_shipments").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE rkap_shipments error:", error);
    return NextResponse.json({ ok: false, message: "Gagal hapus data RKAP shipment" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireUser, requireWriter } from "@/lib/auth/guard";
import { canWriteData } from "@/lib/roles";
import { resolveUserScope, isTargetInScope } from "@/lib/units";
import type { SessionUser } from "@/lib/auth/session";

// ============================================================
// Shipment laut.
// - GET  : semua role yang login
// - POST/PUT : admin, asisten admin, operator (operator hanya
//              untuk tujuan_pp sesuai unit kerjanya)
// - DELETE : admin & asisten admin
// ============================================================

function scopeOf(user: SessionUser) {
  return resolveUserScope(user.role, user.akses, user.aksesPp);
}

/** Operator tanpa unit yang dikenal tidak boleh menulis */
function canWriteTarget(user: SessionUser, target: unknown): boolean {
  if (!canWriteData(user.role)) return false;
  const scope = scopeOf(user);
  if (user.role === "operator") return isTargetInScope(scope, target);
  return true;
}

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const { data, error } = await createAdminClient()
      .from("shipments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("GET shipments error:", error);
    return NextResponse.json(
      { ok: false, message: "Gagal mengambil data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireWriter();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();

    if (!canWriteTarget(auth.user, body.tujuan_pp)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Tujuan PP di luar unit kerja Anda. Hubungi Admin bila perlu.",
        },
        { status: 403 }
      );
    }

    const { data, error } = await createAdminClient()
      .from("shipments")
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("POST shipment error:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Gagal menambah data",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireWriter();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, message: "ID wajib diisi" },
        { status: 400 }
      );
    }

    const client = createAdminClient();

    // Operator hanya boleh mengubah baris milik unitnya
    if (auth.user.role === "operator") {
      const { data: existing } = await client
        .from("shipments")
        .select("tujuan_pp")
        .eq("id", id)
        .single();

      if (!existing) {
        return NextResponse.json(
          { ok: false, message: "Data tidak ditemukan" },
          { status: 404 }
        );
      }
      if (!canWriteTarget(auth.user, existing.tujuan_pp)) {
        return NextResponse.json(
          { ok: false, message: "Data ini bukan milik unit kerja Anda." },
          { status: 403 }
        );
      }
      if (updates.tujuan_pp !== undefined && !canWriteTarget(auth.user, updates.tujuan_pp)) {
        return NextResponse.json(
          { ok: false, message: "Tujuan PP baru di luar unit kerja Anda." },
          { status: 403 }
        );
      }
    }

    const { data, error } = await client
      .from("shipments")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("PUT shipment error:", error);
    return NextResponse.json(
      { ok: false, message: "Gagal update data" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireWriter();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { ok: false, message: "ID wajib diisi" },
        { status: 400 }
      );
    }

    const client = createAdminClient();

    if (auth.user.role === "operator") {
      const { data: existing } = await client
        .from("shipments")
        .select("tujuan_pp")
        .eq("id", id)
        .single();
      if (!existing || !canWriteTarget(auth.user, existing.tujuan_pp)) {
        return NextResponse.json(
          { ok: false, message: "Data ini bukan milik unit kerja Anda." },
          { status: 403 }
        );
      }
    }

    const { error } = await client.from("shipments").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE shipment error:", error);
    return NextResponse.json(
      { ok: false, message: "Gagal hapus data" },
      { status: 500 }
    );
  }
}

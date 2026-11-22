import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireUser, requireWriter } from "@/lib/auth/guard";
import { resolveUserScope, isGlobalTableInScope } from "@/lib/units";
import { isScopedRole } from "@/lib/roles";
import type { SessionUser } from "@/lib/auth/session";

// ============================================================
// Shipment darat (interplant).
// Supervisor/Operator hanya boleh menulis bila unitnya punya scope global
// (mis. Head Office); unit PP hanya untuk tabel PP-nya sendiri.
// ============================================================

const TABLE = "shipments_darat";

function canWriteShipmentDarat(user: SessionUser): boolean {
  if (!isScopedRole(user.role)) return true;
  return isGlobalTableInScope(resolveUserScope(user.role, user.akses, user.aksesPp), TABLE);
}

const outOfScope = () =>
  NextResponse.json(
    { ok: false, message: "Akses ubah shipment darat di luar unit kerja Anda." },
    { status: 403 }
  );

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const { data, error } = await createAdminClient()
      .from(TABLE)
      .select("*")
      .order("tanggal", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("GET shipments_darat error:", error);
    return NextResponse.json(
      { ok: false, message: "Gagal mengambil data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireWriter();
  if ("error" in auth) return auth.error;
  if (!canWriteShipmentDarat(auth.user)) return outOfScope();

  try {
    const body = await request.json();
    const { data, error } = await createAdminClient()
      .from(TABLE)
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("POST shipment_darat error:", error);
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
  if (!canWriteShipmentDarat(auth.user)) return outOfScope();

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, message: "ID wajib diisi" },
        { status: 400 }
      );
    }

    const { data, error } = await createAdminClient()
      .from(TABLE)
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("PUT shipment_darat error:", error);
    return NextResponse.json(
      { ok: false, message: "Gagal update data" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireWriter();
  if ("error" in auth) return auth.error;
  if (!canWriteShipmentDarat(auth.user)) return outOfScope();

  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { ok: false, message: "ID wajib diisi" },
        { status: 400 }
      );
    }

    const { error } = await createAdminClient().from(TABLE).delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE shipment_darat error:", error);
    return NextResponse.json(
      { ok: false, message: "Gagal hapus data" },
      { status: 500 }
    );
  }
}

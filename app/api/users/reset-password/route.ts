import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/guard";
import { normalizeRole } from "@/lib/roles";
import { DEFAULT_PASSWORD } from "@/lib/users";
import bcrypt from "bcryptjs";

// ============================================================
// Reset password ke default "Password123".
// Asisten Admin tidak boleh mereset akun Admin.
// ============================================================

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ ok: false, message: "ID wajib diisi" }, { status: 400 });
    }

    const client = createAdminClient();
    const { data: target } = await client
      .from("users_akun")
      .select("id, username, role")
      .eq("id", id)
      .single();

    if (!target) {
      return NextResponse.json({ ok: false, message: "Pengguna tidak ditemukan" }, { status: 404 });
    }

    if (auth.user.role === "asisten_admin" && normalizeRole(target.role) === "admin") {
      return NextResponse.json(
        { ok: false, message: "Asisten Admin tidak dapat mereset password akun Admin." },
        { status: 403 }
      );
    }

    const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const { error } = await client
      .from("users_akun")
      .update({ password: hashed })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      message: `Password ${target.username} direset menjadi "${DEFAULT_PASSWORD}"`,
    });
  } catch (error) {
    console.error("POST reset-password error:", error);
    return NextResponse.json(
      { ok: false, message: "Gagal reset password" },
      { status: 500 }
    );
  }
}

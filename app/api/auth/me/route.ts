import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getSessionUser, setSessionCookie, clearSessionCookie } from "@/lib/auth/session";
import { normalizeRole } from "@/lib/roles";

// ============================================================
// Profil pengguna yang sedang login (dari tabel users_akun).
// Client memakai endpoint ini (bukan localStorage).
// ============================================================

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ ok: false, message: "Belum login" }, { status: 401 });
    }

    const { data: user, error } = await createAdminClient()
      .from("users_akun")
      .select(
        "username, nama_lengkap, email, no_handphone, jabatan, unit_kerja, departemen, role, akses, akses_pp, status"
      )
      .eq("username", session.username)
      .single();

    if (error || !user) {
      await clearSessionCookie();
      return NextResponse.json(
        { ok: false, message: "Akun tidak ditemukan. Silakan login ulang." },
        { status: 401 }
      );
    }

    const role = normalizeRole(user.role);
    if (!role) {
      await clearSessionCookie();
      return NextResponse.json(
        { ok: false, message: "Role akun tidak valid. Hubungi admin." },
        { status: 403 }
      );
    }

    if ((user.status || "").trim().toLowerCase() !== "aktif") {
      await clearSessionCookie();
      return NextResponse.json(
        { ok: false, message: "Akun Anda tidak aktif. Hubungi admin." },
        { status: 403 }
      );
    }

    await setSessionCookie({
      username: user.username,
      role,
      nama: user.nama_lengkap || user.username,
      unitKerja: user.unit_kerja || undefined,
      akses: user.akses || undefined,
      aksesPp: user.akses_pp || undefined,
      status: user.status || undefined,
    });

    return NextResponse.json({
      ok: true,
      data: {
        username: user.username,
        role,
        nama: user.nama_lengkap,
        email: user.email,
        no_handphone: user.no_handphone,
        jabatan: user.jabatan,
        unit_kerja: user.unit_kerja,
        departemen: user.departemen,
        akses: user.akses,
        akses_pp: user.akses_pp,
        status: user.status,
        avatar_url: null,
      },
    });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json({ ok: false, message: "Gagal memuat sesi" }, { status: 500 });
  }
}

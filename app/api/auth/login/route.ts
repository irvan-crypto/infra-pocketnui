import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { setSessionCookie } from "@/lib/auth/session";
import { normalizeRole } from "@/lib/roles";
import bcrypt from "bcryptjs";

// ============================================================
// Login memakai tabel `users_akun`.
// Status selain "Aktif" ditolak.
// ============================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, message: "Username dan password wajib diisi" },
        { status: 400 }
      );
    }

    const { data: user, error } = await createAdminClient()
      .from("users_akun")
      .select("*")
      .eq("username", username)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { ok: false, message: "Username atau password salah" },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { ok: false, message: "Username atau password salah" },
        { status: 401 }
      );
    }

    if ((user.status || "").trim().toLowerCase() !== "aktif") {
      return NextResponse.json(
        { ok: false, message: "Akun Anda tidak aktif. Hubungi admin." },
        { status: 403 }
      );
    }

    const role = normalizeRole(user.role);
    if (!role) {
      console.error(`Login ditolak: role tidak dikenal "${user.role}" (${user.username})`);
      return NextResponse.json(
        { ok: false, message: "Role akun tidak valid. Hubungi admin." },
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
    console.error("Login error:", error);
    return NextResponse.json(
      { ok: false, message: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}

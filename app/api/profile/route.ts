import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

export async function PUT(request: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ ok: false, message: "Belum login" }, { status: 401 });
  try {
    const body = await request.json();
    const payload = {
      nama_lengkap: String(body.nama_lengkap ?? "").trim(),
      email: body.email ? String(body.email).trim() : null,
      no_handphone: body.no_handphone ? String(body.no_handphone).trim() : null,
      jabatan: body.jabatan ? String(body.jabatan).trim() : null,
      unit_kerja: body.unit_kerja ? String(body.unit_kerja).trim() : null,
      departemen: body.departemen ? String(body.departemen).trim() : null,
      avatar_url: body.avatar_url === undefined ? undefined : (body.avatar_url || null),
    };
    if (!payload.nama_lengkap) return NextResponse.json({ ok: false, message: "Nama lengkap wajib diisi" }, { status: 400 });
    const { error } = await createAdminClient().from("users_akun").update(payload).eq("username", session.username);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT profile error", error);
    return NextResponse.json({ ok: false, message: "Gagal menyimpan profil" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { checkPassword } from "@/lib/users";

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ ok: false, message: "Belum login" }, { status: 401 });
  try {
    const { currentPassword, newPassword, confirmPassword } = await request.json();
    if (!currentPassword || !newPassword || !confirmPassword) return NextResponse.json({ ok: false, message: "Semua field password wajib diisi" }, { status: 400 });
    if (newPassword !== confirmPassword) return NextResponse.json({ ok: false, message: "Konfirmasi password tidak cocok" }, { status: 400 });
    if (!checkPassword(newPassword).valid) return NextResponse.json({ ok: false, message: "Password minimal 8 karakter dan harus mengandung huruf besar, huruf kecil, serta angka" }, { status: 400 });
    const client = createAdminClient();
    const { data: user } = await client.from("users_akun").select("password").eq("username", session.username).single();
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) return NextResponse.json({ ok: false, message: "Password saat ini salah" }, { status: 400 });
    const { error } = await client.from("users_akun").update({ password: await bcrypt.hash(newPassword, 10) }).eq("username", session.username);
    if (error) throw error;
    return NextResponse.json({ ok: true, message: "Password berhasil diubah" });
  } catch (error) {
    console.error("POST profile password error", error);
    return NextResponse.json({ ok: false, message: "Gagal mengubah password" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";
import bcrypt from "bcryptjs";

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

    const supabase = createClient();
    
    // Cari user di database
    const { data: user, error } = await supabase
      .from("pengguna")
      .select("*")
      .eq("username", username)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { ok: false, message: "Username atau password salah" },
        { status: 401 }
      );
    }

    // Bandingkan password yang di-hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { ok: false, message: "Username atau password salah" },
        { status: 401 }
      );
    }

    // Return user data (tanpa password)
    return NextResponse.json({
      ok: true,
      data: {
        username: user.username,
        role: user.role,
        nama: user.nama,
        sap: user.sap,
        jabatan: user.jabatan,
        unit_kerja: user.unit_kerja,
        unit_pp: user.unit_pp,
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
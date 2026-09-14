import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";
import bcrypt from "bcryptjs";

// Helper untuk generate password hash
const hashPassword = async (password: string) => {
  return await bcrypt.hash(password, 10);
};

export async function POST() {
  try {
    const supabase = createClient();
    
    // Data pengguna untuk masing-masing role
    const seedUsers = [
      {
        nama: "Admin Utama",
        sap: "001",
        jabatan: "Direktur",
        unit_kerja: "Head Office",
        username: "admin",
        password: "admin123",
        role: "admin",
        unit_pp: "Head Office",
      },
      {
        nama: "Operator Palu",
        sap: "101",
        jabatan: "Koordinator",
        unit_kerja: "PP. Palu",
        username: "operator_palu",
        password: "operator123",
        role: "operator",
        unit_pp: "PP. Palu",
      },
      {
        nama: "Operator Bitung",
        sap: "201",
        jabatan: "Koordinator",
        unit_kerja: "PP. Bitung",
        username: "operator_bitung",
        password: "operator123",
        role: "operator",
        unit_pp: "PP. Bitung",
      },
      {
        nama: "Viewer Palu",
        sap: "301",
        jabatan: "Staff",
        unit_kerja: "PP. Palu",
        username: "viewer_palu",
        password: "viewer123",
        role: "viewer",
        unit_pp: "PP. Palu",
      },
      {
        nama: "Supervisor Operasional",
        sap: "401",
        jabatan: "Supervisor",
        unit_kerja: "Head Office",
        username: "supervisor",
        password: "supervisor123",
        role: "operator",
        unit_pp: "Head Office",
      },
    ];

    const results: any[] = [];

    for (const user of seedUsers) {
      const hashedPassword = await hashPassword(user.password);
      
      const { data, error } = await supabase
        .from("pengguna")
        .upsert({
          nama: user.nama,
          sap: user.sap,
          jabatan: user.jabatan,
          unit_kerja: user.unit_kerja,
          username: user.username,
          password: hashedPassword,
          role: user.role,
          unit_pp: user.unit_pp,
        }, { onConflict: "username" })
        .select()
        .single();

      if (error) {
        results.push({ username: user.username, status: "error", message: error.message });
      } else {
        results.push({ username: user.username, status: "success" });
      }
    }

    const successCount = results.filter(r => r.status === "success").length;
    const errorCount = results.filter(r => r.status === "error").length;

    return NextResponse.json({
      ok: true,
      message: `Seeding selesai. ${successCount} berhasil, ${errorCount} gagal`,
      data: results,
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { ok: false, message: "Gagal melakukan seeding data pengguna", error: error.message },
      { status: 500 }
    );
  }
}

// Endpoint untuk generate hash password (untuk debugging)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const password = searchParams.get("password") || "admin123";
  
  const hash = await bcrypt.hash(password, 10);
  
  return NextResponse.json({
    password,
    hash,
  });
}
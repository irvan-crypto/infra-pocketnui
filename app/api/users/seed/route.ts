import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/guard";
import { DEFAULT_PASSWORD } from "@/lib/users";
import bcrypt from "bcryptjs";

// ============================================================
// Seed akun demo di users_akun (1 akun per role).
// Semua password: "Password123".
// ============================================================

const SEED_USERS = [
  { nama_lengkap: "Admin Utama", username: "admin", role: "admin", jabatan: "Direktur", unit_kerja: "Head Office", departemen: "IT", akses: "Plant & Port Prod", akses_pp: null },
  { nama_lengkap: "Asisten Admin", username: "asisten_admin", role: "asisten_admin", jabatan: "Asisten Admin", unit_kerja: "Head Office", departemen: "IT", akses: "Plant & Port Prod", akses_pp: null },
  { nama_lengkap: "General Manager", username: "general_manager", role: "general_manager", jabatan: "General Manager", unit_kerja: "Head Office", departemen: "Operasional", akses: "Plant & Port Prod", akses_pp: null },
  { nama_lengkap: "Senior Manager", username: "senior_manager", role: "senior_manager", jabatan: "Senior Manager", unit_kerja: "Head Office", departemen: "Operasional", akses: "Plant & Port Prod", akses_pp: null },
  { nama_lengkap: "Manager Operasional", username: "manager", role: "manager", jabatan: "Manager", unit_kerja: "Head Office", departemen: "Operasional", akses: "Plant & Port Prod", akses_pp: null },
  { nama_lengkap: "Supervisor Operasional", username: "supervisor", role: "operator", jabatan: "Supervisor", unit_kerja: "Head Office", departemen: "Operasional", akses: "Plant & Port Prod", akses_pp: null },
  { nama_lengkap: "Operator Palu", username: "operator_palu", role: "operator", jabatan: "Koordinator", unit_kerja: "PP. Palu", departemen: "Operasional", akses: "Packing Plant 1", akses_pp: "PP1 Palu" },
  { nama_lengkap: "Operator Bitung", username: "operator_bitung", role: "operator", jabatan: "Koordinator", unit_kerja: "PP. Bitung", departemen: "Operasional", akses: "Packing Plant 2", akses_pp: "PP2 Bitung" },
  { nama_lengkap: "Guest Palu", username: "guest_palu", role: "guest", jabatan: "Staff", unit_kerja: "PP. Palu", departemen: "Operasional", akses: "Plant & Port Prod", akses_pp: null },
] as const;

export async function POST() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const supabase = createAdminClient();
    const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const results: { username: string; status: string; message?: string }[] = [];

    for (const user of SEED_USERS) {
      const { error } = await supabase
        .from("users_akun")
        .upsert(
          {
            ...user,
            email: `${user.username}@internal.local`,
            no_handphone: null,
            password: hashed,
            status: "Aktif",
          },
          { onConflict: "username" }
        )
        .select("id")
        .single();

      results.push(
        error
          ? { username: user.username, status: "error", message: error.message }
          : { username: user.username, status: "success" }
      );
    }

    const success = results.filter((r) => r.status === "success").length;
    const failed = results.length - success;

    return NextResponse.json({
      ok: true,
      message: `Seeding selesai. ${success} berhasil, ${failed} gagal. Password: ${DEFAULT_PASSWORD}`,
      data: results,
    });
  } catch (error) {
    console.error("Seed users_akun error:", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Gagal melakukan seeding pengguna",
        error: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 }
    );
  }
}

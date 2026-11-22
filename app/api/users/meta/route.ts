import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/guard";
import { ROLES, normalizeRole } from "@/lib/roles";
import { AKSES_OPTIONS, getAksesPpOptions } from "@/lib/units";

// ============================================================
// Meta dropdown form pengguna, diambil dari tabel users_role.
// roles        : daftar role unik
// roleAkses    : role -> daftar Akses
// aksesPp      : Akses -> daftar Akses PP (Packing Plant 1/2)
// ============================================================

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const { data, error } = await createAdminClient()
      .from("users_role")
      .select("role, akses_role, akses_pp")
      .order("role")
      .order("akses_role")
      .order("akses_pp");

    if (error) throw error;

    const rows = (data || []) as {
      role: string | null;
      akses_role: string | null;
      akses_pp: string | null;
    }[];

    const roleSet = new Set<string>();
    const roleAkses = new Map<string, Set<string>>();
    const aksesPpFromDb = new Map<string, Set<string>>();

    for (const row of rows) {
      const role = normalizeRole(row.role);
      const akses = (row.akses_role || "").trim();
      if (!role || !akses) continue;

      roleSet.add(role);
      if (!roleAkses.has(role)) roleAkses.set(role, new Set());
      roleAkses.get(role)!.add(akses);

      if (!aksesPpFromDb.has(akses)) aksesPpFromDb.set(akses, new Set());
      if (row.akses_pp) aksesPpFromDb.get(akses)!.add(row.akses_pp);
    }

    // Urutkan role sesuai urutan resmi, akses sesuai AKSES_OPTIONS.
    // Role Admin & Asisten Admin hanya ditampilkan untuk pengguna ber-role Admin.
    const isAdmin = normalizeRole(auth.user.role) === "admin";
    const roles = ROLES.filter(
      (r) =>
        roleSet.has(r) && (isAdmin || (r !== "admin" && r !== "asisten_admin"))
    );
    const aksesOrder = (value: string) => {
      const idx = AKSES_OPTIONS.indexOf(value);
      return idx === -1 ? AKSES_OPTIONS.length : idx;
    };

    return NextResponse.json({
      ok: true,
      data: {
        roles: roles.length > 0 ? roles : [...ROLES],
        roleAkses: Object.fromEntries(
          roles.map((role) => [
            role,
            Array.from(roleAkses.get(role) || []).sort((a, b) => aksesOrder(a) - aksesOrder(b)),
          ])
        ),
        aksesPp: Object.fromEntries(
          AKSES_OPTIONS.map((akses) => {
            const fromDb = Array.from(aksesPpFromDb.get(akses) || []);
            const fallback = getAksesPpOptions(akses);
            return [akses, fromDb.length > 0 ? fromDb : fallback];
          })
        ),
      },
    });
  } catch (error) {
    console.error("GET users_role meta error:", error);
    return NextResponse.json(
      { ok: false, message: "Gagal mengambil master role/akses" },
      { status: 500 }
    );
  }
}

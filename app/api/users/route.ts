import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/guard";
import { isScopedRole, normalizeRole, ROLE_OPTIONS } from "@/lib/roles";
import {
  AKSES_OPTIONS,
  getAksesPpOptions,
  requiresAksesPp,
} from "@/lib/units";
import {
  DEFAULT_PASSWORD,
  STATUS_OPTIONS,
  USERS_SAFE_COLUMNS,
  checkPassword,
} from "@/lib/users";
import bcrypt from "bcryptjs";
import type { SessionUser } from "@/lib/auth/session";

// ============================================================
// Kelola pengguna (tabel users_akun) — Admin & Asisten Admin.
// Asisten Admin tidak boleh mengelola akun ber-role Admin.
// ============================================================

const VALID_ROLES = ROLE_OPTIONS.map((r) => r.value);
const VALID_AKSES = AKSES_OPTIONS;
const VALID_STATUS: string[] = [...STATUS_OPTIONS];

function forbidden(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 403 });
}

/** Asisten Admin tidak boleh menyentuh akun Admin */
function canManageTarget(session: SessionUser, targetRole: unknown): boolean {
  const target = normalizeRole(targetRole);
  // Role Admin & Asisten Admin hanya boleh diberikan oleh Admin
  if ((target === "admin" || target === "asisten_admin") && session.role !== "admin") {
    return false;
  }
  if (session.role === "asisten_admin" && target === "admin") return false;
  return true;
}

/** Validasi payload form (create/update) */
function validatePayload(body: Record<string, any>, isCreate: boolean): string | null {
  const nama = String(body.nama_lengkap ?? "").trim();
  const username = String(body.username ?? "").trim();
  const role = normalizeRole(body.role);

  if (!nama) return "Nama lengkap wajib diisi";
  if (!username) return "Username wajib diisi";
  if (!role || !VALID_ROLES.includes(role)) return "Role tidak valid";

  // Akses & Hak Akses hanya relevan untuk Supervisor & Operator
  if (isScopedRole(role)) {
    const akses = String(body.akses ?? "").trim();
    if (!akses || !VALID_AKSES.includes(akses)) return "Akses tidak valid";

    if (requiresAksesPp(akses)) {
      const aksesPp = String(body.akses_pp ?? "").trim();
      if (!aksesPp || !getAksesPpOptions(akses).includes(aksesPp)) {
        return `Hak Akses wajib dipilih untuk ${akses}`;
      }
    }
  }

  const status = String(body.status ?? "Aktif").trim();
  if (!VALID_STATUS.includes(status)) return "Status tidak valid";

  const password = String(body.password ?? "");
  if (isCreate) {
    const finalPassword = password || DEFAULT_PASSWORD;
    if (!checkPassword(finalPassword).valid) {
      return "Password minimal 8 karakter serta mengandung huruf besar, huruf kecil, dan angka";
    }
  } else if (password && !checkPassword(password).valid) {
    return "Password minimal 8 karakter serta mengandung huruf besar, huruf kecil, dan angka";
  }

  return null;
}

function buildPayload(body: Record<string, any>) {
  const role = normalizeRole(body.role);
  const akses = isScopedRole(role) ? String(body.akses ?? "").trim() : "";
  return {
    nama_lengkap: String(body.nama_lengkap ?? "").trim(),
    email: body.email ? String(body.email).trim() : null,
    no_handphone: body.no_handphone ? String(body.no_handphone).trim() : null,
    jabatan: body.jabatan ? String(body.jabatan).trim() : null,
    unit_kerja: body.unit_kerja ? String(body.unit_kerja).trim() : null,
    departemen: body.departemen ? String(body.departemen).trim() : null,
    username: String(body.username ?? "").trim(),
    role,
    akses: akses || null,
    akses_pp: requiresAksesPp(akses)
      ? String(body.akses_pp ?? "").trim() || null
      : null,
    status: String(body.status ?? "Aktif").trim(),
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const { data, error } = await createAdminClient()
      .from("users_akun")
      .select(USERS_SAFE_COLUMNS)
      .order("nama_lengkap");

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("GET users_akun error:", error);
    return NextResponse.json(
      { ok: false, message: "Gagal mengambil data pengguna" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();

    const problem = validatePayload(body, true);
    if (problem) {
      return NextResponse.json({ ok: false, message: problem }, { status: 400 });
    }

    if (!canManageTarget(auth.user, body.role)) {
      return forbidden("Asisten Admin tidak dapat membuat akun Admin.");
    }

    const payload = buildPayload(body);
    const password = String(body.password ?? "") || DEFAULT_PASSWORD;

    const { data, error } = await createAdminClient()
      .from("users_akun")
      .insert({
        ...payload,
        password: await bcrypt.hash(password, 10),
      })
      .select(USERS_SAFE_COLUMNS)
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    console.error("POST users_akun error:", error);

    if (error?.code === "23505" || error?.message?.includes("duplicate key")) {
      return NextResponse.json(
        { ok: false, message: "Username atau email sudah digunakan" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, message: "Gagal menambah pengguna" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ ok: false, message: "ID wajib diisi" }, { status: 400 });
    }

    const client = createAdminClient();
    const { data: target, error: findError } = await client
      .from("users_akun")
      .select("id, username, role")
      .eq("id", id)
      .single();

    if (findError || !target) {
      return NextResponse.json({ ok: false, message: "Pengguna tidak ditemukan" }, { status: 404 });
    }
    if (!canManageTarget(auth.user, target.role)) {
      return forbidden("Asisten Admin tidak dapat mengubah akun Admin.");
    }

    const problem = validatePayload(body, false);
    if (problem) {
      return NextResponse.json({ ok: false, message: problem }, { status: 400 });
    }
    if (!canManageTarget(auth.user, body.role)) {
      return forbidden("Role Admin & Asisten Admin hanya dapat diberikan oleh Admin.");
    }

    const payload = buildPayload(body);
    const updateData: Record<string, unknown> = { ...payload };

    const password = String(body.password ?? "");
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const { data, error } = await client
      .from("users_akun")
      .update(updateData)
      .eq("id", id)
      .select(USERS_SAFE_COLUMNS)
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    console.error("PUT users_akun error:", error);

    if (error?.code === "23505" || error?.message?.includes("duplicate key")) {
      return NextResponse.json(
        { ok: false, message: "Username atau email sudah digunakan" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, message: "Gagal update pengguna" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
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
      .select("username, role")
      .eq("id", id)
      .single();

    if (!target) {
      return NextResponse.json({ ok: false, message: "Pengguna tidak ditemukan" }, { status: 404 });
    }
    if (target.username === auth.user.username) {
      return NextResponse.json(
        { ok: false, message: "Anda tidak dapat menghapus akun sendiri" },
        { status: 400 }
      );
    }
    if (!canManageTarget(auth.user, target.role)) {
      return forbidden("Asisten Admin tidak dapat menghapus akun Admin.");
    }

    const { error } = await client.from("users_akun").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE users_akun error:", error);
    return NextResponse.json(
      { ok: false, message: "Gagal hapus pengguna" },
      { status: 500 }
    );
  }
}

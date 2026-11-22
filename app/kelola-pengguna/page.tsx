"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import DataTable from "@/components/ui/DataTable";
import AccessDenied from "@/components/AccessDenied";
import { getPermissions } from "@/lib/access";
import {
  ROLE_META,
  ROLES,
  isScopedRole,
  normalizeRole,
  roleBadgeClass,
  roleLabel,
} from "@/lib/roles";
import { AKSES_OPTIONS, getAksesPpOptions, requiresAksesPp } from "@/lib/units";
import {
  DEFAULT_PASSWORD,
  STATUS_OPTIONS,
  checkPassword,
  type UsersAkun,
} from "@/lib/users";
import { Edit2, KeyRound, Loader2, Plus, Trash2, X, Eye, EyeOff } from "lucide-react";

interface UsersMeta {
  roles: string[];
  roleAkses: Record<string, string[]>;
  aksesPp: Record<string, string[]>;
}

interface UserForm {
  nama_lengkap: string;
  email: string;
  no_handphone: string;
  jabatan: string;
  unit_kerja: string;
  departemen: string;
  username: string;
  password: string;
  role: string;
  akses: string;
  akses_pp: string;
  status: string;
}

const emptyForm = (): UserForm => ({
  nama_lengkap: "",
  email: "",
  no_handphone: "",
  jabatan: "",
  unit_kerja: "",
  departemen: "",
  username: "",
  password: DEFAULT_PASSWORD,
  role: "operator",
  akses: AKSES_OPTIONS[0],
  akses_pp: "",
  status: "Aktif",
});

const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

export default function KelolaPenggunaPage() {
  const { user } = useAuth();
  const router = useRouter();

  const permissions = getPermissions(user);
  const canManage = permissions.canManageUsers;
  const isAsisten = user?.role === "asisten_admin";

  const [rows, setRows] = useState<UsersAkun[]>([]);
  const [meta, setMeta] = useState<UsersMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<UsersAkun | null>(null);
  const [pendingReset, setPendingReset] = useState<UsersAkun | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchRows = useCallback(async () => {
    const res = await fetch("/api/users", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || data.ok === false) {
      throw new Error(data.message || "Gagal memuat pengguna");
    }
    setRows((data.data || []) as UsersAkun[]);
  }, []);

  const fetchMeta = useCallback(async () => {
    const res = await fetch("/api/users/meta", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || data.ok === false) {
      throw new Error(data.message || "Gagal memuat master role");
    }
    setMeta(data.data as UsersMeta);
  }, []);

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }
    if (!canManage) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        await Promise.all([fetchRows(), fetchMeta()]);
      } catch (error) {
        console.error(error);
        alert(error instanceof Error ? error.message : "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, canManage, router, fetchRows, fetchMeta]);

  // Admin & Asisten Admin hanya muncul untuk pengguna yang login sebagai admin
  const roleOptions = useMemo(() => {
    const fromMeta = meta?.roles?.length ? meta.roles : [...ROLES];
    const known = fromMeta
      .map((r) => normalizeRole(r))
      .filter((r): r is NonNullable<ReturnType<typeof normalizeRole>> => Boolean(r));
    const ordered = ROLES.filter((r) => known.includes(r));
    const list = ordered.length > 0 ? ordered : [...ROLES];
    if (user?.role === "admin") return list as string[];
    return list.filter((r) => r !== "admin" && r !== "asisten_admin") as string[];
  }, [meta, user?.role]);

  // Supervisor diperlakukan sama seperti Operator (Akses + Hak Akses)
  const isOperatorForm = isScopedRole(form.role);

  const aksesOptionsForRole = useMemo(() => {
    if (!isOperatorForm) return [];
    const fromMeta = meta?.roleAkses?.[form.role];
    if (fromMeta && fromMeta.length > 0) return fromMeta;
    return AKSES_OPTIONS;
  }, [meta, form.role, isOperatorForm]);

  const aksesPpOptions = useMemo(() => {
    const fromMeta = meta?.aksesPp?.[form.akses];
    if (fromMeta && fromMeta.length > 0) return fromMeta;
    return getAksesPpOptions(form.akses);
  }, [meta, form.akses]);

  const showAkses = isOperatorForm;
  const showAksesPp = isOperatorForm && requiresAksesPp(form.akses) && aksesPpOptions.length > 0;
  const passwordCheck = checkPassword(form.password);

  // ── Form helpers ──────────────────────────────────────────
  const resetForm = () => {
    setForm(emptyForm());
    setFormError("");
    setShowPassword(false);
    setIsEditing(false);
    setEditingId(null);
  };

  const openCreate = () => {
    const base = emptyForm();
    base.akses = meta?.roleAkses?.[base.role]?.[0] || AKSES_OPTIONS[0];
    setForm(base);
    setFormError("");
    setIsEditing(false);
    setEditingId(null);
    setShowForm(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "role") {
        const isOperator = isScopedRole(value);
        if (!isOperator) {
          // Akses & Hak Akses hanya relevan untuk Supervisor & Operator
          next.akses = "";
          next.akses_pp = "";
        } else {
          const options = meta?.roleAkses?.[value] ?? AKSES_OPTIONS;
          next.akses = options[0] || AKSES_OPTIONS[0];
          next.akses_pp = requiresAksesPp(next.akses)
            ? meta?.aksesPp?.[next.akses]?.[0] || getAksesPpOptions(next.akses)[0] || ""
            : "";
        }
      }

      if (name === "akses") {
        const ppOptions = meta?.aksesPp?.[value] ?? getAksesPpOptions(value);
        next.akses_pp = requiresAksesPp(value) ? ppOptions[0] || "" : "";
      }

      return next;
    });
  };

  const handleEdit = (row: UsersAkun) => {
    setForm({
      nama_lengkap: row.nama_lengkap || "",
      email: row.email || "",
      no_handphone: row.no_handphone || "",
      jabatan: row.jabatan || "",
      unit_kerja: row.unit_kerja || "",
      departemen: row.departemen || "",
      username: row.username || "",
      password: "",
      role: normalizeRole(row.role) || "guest",
      akses: row.akses || AKSES_OPTIONS[0],
      akses_pp: row.akses_pp || "",
      status: row.status || "Aktif",
    });
    setFormError("");
    setIsEditing(true);
    setEditingId(row.id);
    setShowPassword(false);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!form.nama_lengkap.trim()) return setFormError("Nama lengkap wajib diisi");
    if (!form.username.trim()) return setFormError("Username wajib diisi");
    if (!form.email.trim()) return setFormError("Email wajib diisi");

    if (!isEditing || form.password) {
      if (!passwordCheck.valid) {
        return setFormError(
          "Password minimal 8 karakter serta mengandung huruf besar, huruf kecil, dan angka"
        );
      }
    }

    if (showAksesPp && !form.akses_pp) {
      return setFormError("Hak Akses wajib dipilih");
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        nama_lengkap: form.nama_lengkap,
        email: form.email,
        no_handphone: form.no_handphone,
        jabatan: form.jabatan,
        unit_kerja: form.unit_kerja,
        departemen: form.departemen,
        username: form.username,
        role: form.role,
        akses: showAkses ? form.akses : null,
        akses_pp: showAksesPp ? form.akses_pp : null,
        status: form.status,
      };
      if (form.password) payload.password = form.password;

      const res = await fetch("/api/users", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditing ? { id: editingId, ...payload } : payload),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.message || "Gagal menyimpan data");
      }

      setShowForm(false);
      resetForm();
      await fetchRows();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!pendingReset) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pendingReset.id }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.message || "Gagal reset password");
      }
      setPendingReset(null);
      alert(data.message || `Password direset menjadi "${DEFAULT_PASSWORD}"`);
      await fetchRows();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pendingDelete.id }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.message || "Gagal hapus data");
      }
      setPendingDelete(null);
      await fetchRows();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setProcessing(false);
    }
  };

  // Asisten Admin tidak boleh menyentuh akun Admin; akun sendiri tidak bisa dihapus
  const canEditRow = (row: UsersAkun) =>
    !(isAsisten && normalizeRole(row.role) === "admin");
  const canDeleteRow = (row: UsersAkun) =>
    canEditRow(row) && row.username !== user?.username;

  const columns = useMemo(
    () => [
      {
        key: "nama_lengkap",
        header: "Nama Lengkap",
        render: (s: UsersAkun) => (
          <span className="font-semibold text-gray-900">{s.nama_lengkap || "-"}</span>
        ),
      },
      {
        key: "email",
        header: "Email",
        render: (s: UsersAkun) => <span className="text-gray-600">{s.email || "-"}</span>,
      },
      {
        key: "no_handphone",
        header: "No. Handphone",
        hideOnMobile: true,
        render: (s: UsersAkun) => <span>{s.no_handphone || "-"}</span>,
      },
      {
        key: "jabatan",
        header: "Jabatan",
        hideOnMobile: true,
        render: (s: UsersAkun) => <span>{s.jabatan || "-"}</span>,
      },
      {
        key: "unit_kerja",
        header: "Unit Kerja",
        hideOnMobile: true,
        render: (s: UsersAkun) => <span>{s.unit_kerja || "-"}</span>,
      },
      {
        key: "departemen",
        header: "Departemen",
        hideOnMobile: true,
        render: (s: UsersAkun) => <span>{s.departemen || "-"}</span>,
      },
      {
        key: "username",
        header: "Username",
        render: (s: UsersAkun) => <span className="font-mono text-gray-700">{s.username}</span>,
      },
      {
        key: "role",
        header: "Role",
        render: (s: UsersAkun) => (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${roleBadgeClass(s.role)}`}
          >
            {roleLabel(s.role)}
          </span>
        ),
      },
      {
        key: "akses",
        header: "Akses",
        render: (s: UsersAkun) => <span className="whitespace-nowrap">{s.akses || "-"}</span>,
      },
      {
        key: "akses_pp",
        header: "Hak Akses",
        hideOnMobile: true,
        render: (s: UsersAkun) => <span className="whitespace-nowrap">{s.akses_pp || "-"}</span>,
      },
      {
        key: "status",
        header: "Status",
        render: (s: UsersAkun) => {
          const active = String(s.status || "").toLowerCase() === "aktif";
          return (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {s.status || "-"}
            </span>
          );
        },
      },
      {
        key: "_action",
        header: "Action",
        className: "text-right",
        render: (s: UsersAkun) => {
          const editable = canEditRow(s);
          const deletable = canDeleteRow(s);
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => handleEdit(s)}
                disabled={!editable}
                title="Edit"
                className="inline-flex items-center justify-center w-7 h-7 rounded text-xs transition-colors bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Edit2 size={13} />
              </button>
              <button
                type="button"
                onClick={() => setPendingReset(s)}
                disabled={!editable}
                title="Reset Password"
                className="inline-flex items-center justify-center w-7 h-7 rounded text-xs transition-colors bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white border border-amber-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <KeyRound size={13} />
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(s)}
                disabled={!deletable}
                title="Delete"
                className="inline-flex items-center justify-center w-7 h-7 rounded text-xs transition-colors bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAsisten, user?.username]
  );

  if (!canManage) {
    return <AccessDenied feature="Kelola Pengguna" requiredRoles={["Admin", "Asisten Admin"]} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-full mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Pengguna</h1>
          <p className="text-sm text-gray-500 mt-1">
            Akun, role, dan hak akses modul (tabel <span className="font-mono">users_akun</span>)
          </p>
        </div>
      </div>

      {/* ── Form Tambah / Edit ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 p-4 md:p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">
                {isEditing ? "Edit Pengguna" : "Tambah Pengguna"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
                title="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Baris 1 */}
                <div>
                  <label className={labelClass}>Nama Lengkap</label>
                  <input
                    type="text"
                    name="nama_lengkap"
                    value={form.nama_lengkap}
                    onChange={handleChange}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className={inputClass}
                    required
                  />
                </div>

                {/* Baris 2 */}
                <div>
                  <label className={labelClass}>No. Handphone</label>
                  <input
                    type="tel"
                    name="no_handphone"
                    value={form.no_handphone}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <div>
                  <label className={labelClass}>Jabatan</label>
                  <input
                    type="text"
                    name="jabatan"
                    value={form.jabatan}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                {/* Baris 3 */}
                <div>
                  <label className={labelClass}>Unit Kerja</label>
                  <input
                    type="text"
                    name="unit_kerja"
                    value={form.unit_kerja}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="cth: PP. Palu"
                  />
                </div>
                <div>
                  <label className={labelClass}>Departemen</label>
                  <input
                    type="text"
                    name="departemen"
                    value={form.departemen}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                {/* Baris 4 */}
                <div>
                  <label className={labelClass}>Username</label>
                  <input
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    className={inputClass}
                    autoComplete="off"
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      className={`${inputClass} pr-10`}
                      placeholder={
                        isEditing ? "Kosongkan jika tidak diubah" : DEFAULT_PASSWORD
                      }
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                      title={showPassword ? "Sembunyikan password" : "Lihat password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <ul className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
                    {[
                      { ok: passwordCheck.minLength, text: "Min. 8 karakter" },
                      { ok: passwordCheck.hasUpper, text: "Huruf besar" },
                      { ok: passwordCheck.hasLower, text: "Huruf kecil" },
                      { ok: passwordCheck.hasNumber, text: "Angka" },
                    ].map((rule) => (
                      <li
                        key={rule.text}
                        className={rule.ok ? "text-emerald-600" : "text-gray-400"}
                      >
                        {rule.ok ? "✓" : "•"} {rule.text}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Baris 5 */}
                <div>
                  <label className={labelClass}>Role</label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className={inputClass}
                    required
                  >
                    {roleOptions.map((r) => {
                      const role = normalizeRole(r) || "guest";
                      return (
                        <option key={r} value={role}>
                          {ROLE_META[role]?.label || r}
                        </option>
                      );
                    })}
                    {form.role &&
                      !roleOptions.some((r) => normalizeRole(r) === normalizeRole(form.role)) && (
                        <option value={form.role}>
                          {ROLE_META[normalizeRole(form.role) || "guest"]?.label || form.role} (lama)
                        </option>
                      )}
                  </select>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {ROLE_META[normalizeRole(form.role) || "guest"]?.description || ""}
                  </p>
                </div>
                {showAkses && (
                <div>
                  <label className={labelClass}>Akses</label>
                  <select
                    name="akses"
                    value={form.akses}
                    onChange={handleChange}
                    className={inputClass}
                    required
                  >
                    {aksesOptionsForRole.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                    {form.akses && !aksesOptionsForRole.includes(form.akses) && (
                      <option value={form.akses}>{form.akses} (lama)</option>
                    )}
                  </select>
                </div>
                )}

                {/* Baris 6 — Hak Akses (kondisional) + Status */}
                {showAksesPp && (
                  <div>
                    <label className={labelClass}>Hak Akses</label>
                    <select
                      name="akses_pp"
                      value={form.akses_pp}
                      onChange={handleChange}
                      className={inputClass}
                      required
                    >
                      <option value="">- Pilih Hak Akses -</option>
                      {aksesPpOptions.map((pp) => (
                        <option key={pp} value={pp}>
                          {pp}
                        </option>
                      ))}
                      {form.akses_pp && !aksesPpOptions.includes(form.akses_pp) && (
                        <option value={form.akses_pp}>{form.akses_pp} (lama)</option>
                      )}
                    </select>
                  </div>
                )}
                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formError && (
                <p className="mt-4 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              <div className="flex gap-3 mt-5">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {isEditing ? "Update" : "Simpan"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DataTable
        title="Daftar Pengguna"
        columns={columns}
        data={rows}
        searchable
        searchPlaceholder="Cari nama, email, username, role..."
        actions={
          <button
            onClick={openCreate}
            className="btn-glow flex items-center justify-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus size={16} /> Tambah Data
          </button>
        }
      />

      {/* ── Konfirmasi Reset Password ── */}
      {pendingReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reset Password</h3>
            <p className="text-sm text-gray-600 mb-5">
              Reset password <span className="font-semibold">{pendingReset.username}</span> menjadi{" "}
              <span className="font-mono">{DEFAULT_PASSWORD}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingReset(null)}
                disabled={processing}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition disabled:opacity-60"
              >
                Tidak
              </button>
              <button
                onClick={handleReset}
                disabled={processing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition disabled:opacity-60"
              >
                {processing && <Loader2 size={14} className="animate-spin" />}
                Ya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Konfirmasi Delete ── */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Konfirmasi</h3>
            <p className="text-sm text-gray-600 mb-5">
              Apakah anda ingin menghapus <span className="font-semibold">{pendingDelete.username}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingDelete(null)}
                disabled={processing}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition disabled:opacity-60"
              >
                Tidak
              </button>
              <button
                onClick={handleDelete}
                disabled={processing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition disabled:opacity-60"
              >
                {processing && <Loader2 size={14} className="animate-spin" />}
                Ya
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

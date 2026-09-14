"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import DataTable from "@/components/ui/DataTable";
import { Shield, Trash2, Edit2, Plus, X, Download } from "lucide-react";
import bcrypt from "bcryptjs";

interface Pengguna {
  id: string;
  nama: string;
  sap: string;
  jabatan: string | null;
  unit_kerja: string | null;
  username: string;
  password: string;
  role: string;
  unit_pp: string | null;
  created_at?: string;
  updated_at?: string;
}

type PenggunaFormData = Partial<Omit<Pengguna, "id" | "password" | "created_at" | "updated_at">> & {
  password?: string;
};

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "operator", label: "Operator" },
];

const formatNumber = (value: number | null | undefined) =>
  Number(value || 0).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function KelolaPenggunaPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<Pengguna[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState<PenggunaFormData>({
    nama: "",
    sap: "",
    jabatan: "",
    unit_kerja: "",
    username: "",
    password: "",
    role: "operator",
    unit_pp: "",
  });

  const canEdit = user?.role === "admin";
  const canDelete = user?.role === "admin";

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }
    fetchRows();
  }, [user, router]);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pengguna");
      const data = await res.json();
      if (data.ok) setRows(data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      nama: "",
      sap: "",
      jabatan: "",
      unit_kerja: "",
      username: "",
      password: "",
      role: "operator",
      unit_pp: "",
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData };

    try {
      const res = await fetch("/api/pengguna", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditing ? { id: editingId, ...payload } : payload),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.message || "Gagal menyimpan data");

      resetForm();
      setShowForm(false);
      await fetchRows();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Terjadi kesalahan");
    }
  };

  const handleEdit = (row: Pengguna) => {
    setIsEditing(true);
    setEditingId(row.id);
    setFormData({
      nama: row.nama || "",
      sap: row.sap || "",
      jabatan: row.jabatan || "",
      unit_kerja: row.unit_kerja || "",
      username: row.username || "",
      role: row.role || "operator",
      unit_pp: row.unit_pp || "",
    });
    setShowForm(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      const res = await fetch("/api/pengguna", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pendingDeleteId }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.message || "Gagal hapus data");
      setShowDeleteConfirm(false);
      setPendingDeleteId(null);
      await fetchRows();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Terjadi kesalahan");
    }
  };

  const formatRole = (role: string) => {
    const roleLabels: Record<string, string> = {
      admin: "Admin",
      operator: "Operator",
    };
    return roleLabels[role] || role;
  };

  const getRoleColor = (role: string) => {
    if (role === "admin") return "bg-red-100 text-red-700";
    return "bg-green-100 text-green-700";
  };

  const columns = useMemo(() => [
    { key: "nama", header: "Nama", render: (s: Pengguna) => <span>{s.nama || "-"}</span> },
    {
      key: "username",
      header: "Username",
      className: "text-left",
      render: (s: Pengguna) => <span className="font-bold">{s.username}</span>,
    },
    {
      key: "sap",
      header: "SAP",
      className: "text-left",
      render: (s: Pengguna) => <span className="font-mono">{s.sap}</span>,
    },
    {
      key: "role",
      header: "Role",
      className: "text-left",
      render: (s: Pengguna) => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleColor(s.role)}`}>
          {formatRole(s.role)}
        </span>
      ),
    },
    {
      key: "unit_kerja",
      header: "Unit Kerja",
      className: "text-left",
      render: (s: Pengguna) => <span>{s.unit_kerja || "-"}</span>,
    },
    {
      key: "unit_pp",
      header: "Unit PP",
      className: "text-left",
      render: (s: Pengguna) => <span>{s.unit_pp || "-"}</span>,
    },
    {
      key: "_aksi",
      header: "Aksi",
      className: "text-right",
      render: (s: Pengguna) => (
        <div className="flex items-center gap-1.5">
          {canEdit && (
            <button
              onClick={() => handleEdit(s)}
              className="inline-flex items-center justify-center w-7 h-7 rounded text-xs transition-colors bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white border border-amber-100"
              title="Edit"
            >
              <Edit2 size={13} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => {
                setPendingDeleteId(s.id);
                setShowDeleteConfirm(true);
              }}
              className="inline-flex items-center justify-center w-7 h-7 rounded text-xs transition-colors bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-100"
              title="Hapus"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ),
    },
  ], [canDelete, canEdit]);

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
        <h1 className="text-2xl font-bold text-gray-900">Kelola Pengguna</h1>
      </div>

      {canEdit && showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 p-4 md:p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">{isEditing ? "Edit Pengguna" : "Tambah Pengguna"}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600" title="Tutup">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                  <input type="text" name="nama" value={formData.nama || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SAP</label>
                  <input type="text" name="sap" value={formData.sap || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input type="text" name="username" value={formData.username || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select name="role" value={formData.role || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                    {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                {!isEditing && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input type="password" name="password" value={formData.password || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan</label>
                  <input type="text" name="jabatan" value={formData.jabatan || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Kerja</label>
                  <input type="text" name="unit_kerja" value={formData.unit_kerja || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit PP</label>
                  <input type="text" name="unit_pp" value={formData.unit_pp || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">{isEditing ? "Update" : "Simpan"}</button>
                <button type="button" onClick={() => { resetForm(); setShowForm(false); }} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Batal</button>
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
        searchPlaceholder="Cari nama, username, SAP..."
        actions={
          canEdit ? (
            <button onClick={() => setShowForm(true)} className="btn-glow flex items-center justify-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap">
              <Plus size={16} /> Tambah Data
            </button>
          ) : undefined
        }
      />

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Konfirmasi</h3>
            <p className="text-sm text-gray-600 mb-5">Apakah anda ingin menghapus data ini?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowDeleteConfirm(false); setPendingDeleteId(null); }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Tidak</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition">Ya</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

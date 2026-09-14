"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { PORTS, PLANTS } from "@/lib/coordinates";
import { SHIP_STATUS_LABELS, SHIP_STATUS_ORDER } from "@/lib/app-config";
import { formatDateIndonesian } from "@/lib/utils";

interface Shipment {
  id: string;
  nama_kapal: string;
  nama_vendor: string;
  type_muatan: string;
  muatan_ton: number;
  tujuan_pp: string;
  pelabuhan_asal: string;
  ta_tiba: string | null;
  sandar: string | null;
  muat: string | null;
  selesai_muat: string | null;
  td_pelabuhan: string | null;
  ta_pp: string | null;
}

type ShipmentField = keyof Omit<Shipment, "id" | "created_at" | "updated_at">;

export default function ShipmentsPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Shipment>>({
    nama_kapal: "",
    nama_vendor: "",
    type_muatan: "",
    muatan_ton: 0,
    tujuan_pp: "",
    pelabuhan_asal: "",
    ta_tiba: "",
    sandar: "",
    muat: "",
    selesai_muat: "",
    td_pelabuhan: "",
    ta_pp: "",
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
      return;
    }
    fetchShipments();
  }, [isAuthenticated, user, router]);

  const fetchShipments = async () => {
    try {
      const res = await fetch("/api/shipments");
      const data = await res.json();
      if (data.ok) {
        setShipments(data.data);
      }
    } catch (error) {
      console.error("Error fetching shipments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = isEditing ? "/api/shipments" : "/api/shipments";
      const method = isEditing ? "PUT" : "POST";
      const body = isEditing ? { id: editingId, ...formData } : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        resetForm();
        fetchShipments();
      } else {
        alert(data.message || "Gagal menyimpan data");
      }
    } catch (error) {
      alert("Terjadi kesalahan");
    }
  };

  const handleEdit = (shipment: Shipment) => {
    setIsEditing(true);
    setEditingId(shipment.id);
    setFormData({
      nama_kapal: shipment.nama_kapal,
      nama_vendor: shipment.nama_vendor,
      type_muatan: shipment.type_muatan,
      muatan_ton: shipment.muatan_ton,
      tujuan_pp: shipment.tujuan_pp,
      pelabuhan_asal: shipment.pelabuhan_asal,
      ta_tiba: shipment.ta_tiba || "",
      sandar: shipment.sandar || "",
      muat: shipment.muat || "",
      selesai_muat: shipment.selesai_muat || "",
      td_pelabuhan: shipment.td_pelabuhan || "",
      ta_pp: shipment.ta_pp || "",
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus data ini?")) return;
    try {
      const res = await fetch("/api/shipments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.ok) {
        fetchShipments();
      } else {
        alert(data.message || "Gagal hapus data");
      }
    } catch (error) {
      alert("Terjadi kesalahan");
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      nama_kapal: "",
      nama_vendor: "",
      type_muatan: "",
      muatan_ton: 0,
      tujuan_pp: "",
      pelabuhan_asal: "",
      ta_tiba: "",
      sandar: "",
      muat: "",
      selesai_muat: "",
      td_pelabuhan: "",
      ta_pp: "",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  const canEdit = user?.role === "admin" || user?.role === "operator";
  const canDelete = user?.role === "admin";

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Kapal</h1>
        {canEdit && (
          <button
            onClick={resetForm}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            + Tambah Kapal
          </button>
        )}
      </div>

      {/* Form */}
      {canEdit && (formData.nama_kapal || isEditing) && (
        <form onSubmit={handleSubmit} className="card p-4 md:p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            {isEditing ? "Edit Kapal" : "Tambah Kapal Baru"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kapal</label>
              <input
                type="text"
                name="nama_kapal"
                value={formData.nama_kapal || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
              <input
                type="text"
                name="nama_vendor"
                value={formData.nama_vendor || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Muatan</label>
              <input
                type="text"
                name="type_muatan"
                value={formData.type_muatan || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Muatan (ton)</label>
              <input
                type="number"
                name="muatan_ton"
                step="0.01"
                value={formData.muatan_ton || 0}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pelabuhan Asal</label>
              <select
                name="pelabuhan_asal"
                value={formData.pelabuhan_asal || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Pilih Pelabuhan</option>
                {PORTS.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tujuan PP</label>
              <select
                name="tujuan_pp"
                value={formData.tujuan_pp || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Pilih Packing Plant</option>
                {PLANTS.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            {SHIP_STATUS_ORDER.map((statusKey) => (
              <div key={statusKey}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{SHIP_STATUS_LABELS[statusKey]}</label>
                <input
                  type="datetime-local"
                  name={statusKey}
                  value={formData[statusKey] ? new Date(formData[statusKey]!).toISOString().slice(0, 16) : ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              {isEditing ? "Update" : "Simpan"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Kapal</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Asal</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tujuan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Muatan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {shipments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Belum ada data kapal</td>
                </tr>
              ) : (
                shipments.map((shipment) => {
                  // Determine latest status
                  const statusFields = SHIP_STATUS_ORDER.map((key) => ({
                    key,
                    value: shipment[key as keyof Shipment] as string | null,
                  }));
                  let latestStatus = "Belum mulai";
                  let latestTime: string | null = null;
                  for (const field of statusFields) {
                    if (field.value) {
                      latestStatus = SHIP_STATUS_LABELS[field.key as keyof typeof SHIP_STATUS_LABELS] || field.key;
                      latestTime = field.value;
                    }
                  }
                  return (
                    <tr key={shipment.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{shipment.nama_kapal}</td>
                      <td className="px-4 py-3">{shipment.pelabuhan_asal}</td>
                      <td className="px-4 py-3">{shipment.tujuan_pp}</td>
                      <td className="px-4 py-3">{shipment.muatan_ton.toLocaleString("id-ID")} ton</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {latestStatus} {latestTime ? formatDateIndonesian(latestTime) : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {canEdit && (
                            <button
                              onClick={() => handleEdit(shipment)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(shipment.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
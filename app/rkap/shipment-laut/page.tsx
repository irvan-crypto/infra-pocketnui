"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { PORTS, PLANTS } from "@/lib/coordinates";
import DataTable from "@/components/ui/DataTable";
import { Download, Edit3, FileText, Plus, Trash2, X } from "lucide-react";
import * as XLSX from "xlsx";

interface RkapShipment {
  id: string;
  pelabuhan_asal: string;
  packing_plant: string;
  bulan: number;
  tahun: number;
  target_pcc: number;
  target_opc: number;
  target_spk: number;
  plant: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ShipmentRealization {
  id: string;
  tujuan_pp: string;
  muatan_ton: number;
  ta_pp: string | null;
}

type RkapFormData = Partial<Omit<RkapShipment, "bulan" | "tahun" | "target_pcc" | "target_opc" | "target_spk">> & {
  bulan?: number | "";
  tahun?: number | "";
  target_pcc?: number | "";
  target_opc?: number | "";
  target_spk?: number | "";
};

const BULAN_OPTIONS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

const uploadHeaders = [
  "pelabuhan_asal",
  "packing_plant",
  "bulan",
  "tahun",
  "target_pcc",
  "target_opc",
  "target_spk",
  "plant",
];

const formatNumber = (value: number | null | undefined) =>
  Number(value || 0).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getMonthLabel = (month: number) => BULAN_OPTIONS.find((b) => b.value === month)?.label || String(month);

export default function RkapShipmentLautPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<RkapShipment[]>([]);
  const [realizations, setRealizations] = useState<ShipmentRealization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState<RkapFormData>({
    pelabuhan_asal: "",
    packing_plant: "",
    bulan: new Date().getMonth() + 1,
    tahun: currentYear,
    target_pcc: "",
    target_opc: "",
    target_spk: "",
    plant: "",
  });

  const canEdit = user?.role === "admin" || user?.role === "operator";
  const canDelete = user?.role === "admin";

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }
    fetchRows();
  }, [user, router]);

  useEffect(() => {
    if (uploadStatus !== "success") return;

    const timeoutId = window.setTimeout(() => {
      setShowUploadModal(false);
      setUploadStatus("idle");
      setUploadMessage("");
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [uploadStatus]);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const [rkapRes, shipmentRes] = await Promise.all([
        fetch("/api/rkap-shipments"),
        fetch("/api/shipments"),
      ]);
      const rkapData = await rkapRes.json();
      const shipmentData = await shipmentRes.json();
      if (rkapData.ok) setRows(rkapData.data || []);
      if (shipmentData.ok) setRealizations(shipmentData.data || []);
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
      pelabuhan_asal: "",
      packing_plant: "",
      bulan: new Date().getMonth() + 1,
      tahun: currentYear,
      target_pcc: "",
      target_opc: "",
      target_spk: "",
      plant: "",
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  const normalizePayload = (data: RkapFormData) => ({
    pelabuhan_asal: data.pelabuhan_asal || "",
    packing_plant: data.packing_plant || "",
    bulan: Number(data.bulan || 1),
    tahun: Number(data.tahun || currentYear),
    target_pcc: Number(data.target_pcc || 0),
    target_opc: Number(data.target_opc || 0),
    target_spk: Number(data.target_spk || 0),
    plant: data.plant || null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = normalizePayload(formData);

    try {
      const res = await fetch("/api/rkap-shipments", {
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

  const handleEdit = (row: RkapShipment) => {
    setIsEditing(true);
    setEditingId(row.id);
    setFormData({
      pelabuhan_asal: row.pelabuhan_asal || "",
      packing_plant: row.packing_plant || "",
      bulan: row.bulan,
      tahun: row.tahun,
      target_pcc: row.target_pcc ?? "",
      target_opc: row.target_opc ?? "",
      target_spk: row.target_spk ?? "",
      plant: row.plant || "",
    });
    setShowForm(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      const res = await fetch("/api/rkap-shipments", {
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

  const getTarget = (s: RkapShipment) => (s.target_pcc || 0) + (s.target_opc || 0) + (s.target_spk || 0);

  const getRealization = (s: RkapShipment) => realizations.reduce((total, item) => {
    if (!item.ta_pp) return total;
    const date = new Date(item.ta_pp);
    if (Number.isNaN(date.getTime())) return total;
    const isSamePeriod = date.getMonth() + 1 === s.bulan && date.getFullYear() === s.tahun;
    const isSamePlant = item.tujuan_pp === s.packing_plant;
    return isSamePeriod && isSamePlant ? total + (item.muatan_ton || 0) : total;
  }, 0);

  const getAchievement = (target: number, realization: number) => {
    if (target === 0 && realization > 0) return 100;
    if (target === 0) return 0;
    return (realization / target) * 100;
  };

  const plantTotals = useMemo(() => {
    const map = new Map<string, { target: number; realization: number }>();
    PLANTS.forEach((p) => map.set(p.name, { target: 0, realization: 0 }));

    rows.forEach((row) => {
      const key = row.packing_plant;
      const target = getTarget(row);
      const realization = getRealization(row);
      const current = map.get(key) || { target: 0, realization: 0 };
      current.target += target;
      current.realization += realization;
      map.set(key, current);
    });
    return map;
  }, [rows, realizations]);

  const normalizeUploadRow = (row: Record<string, unknown>) => {
    const normalizedRow = Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
        value,
      ])
    ) as Record<string, unknown>;

    const getString = (key: string) => normalizedRow[key] == null ? "" : String(normalizedRow[key]).trim();
    const getNumber = (key: string) => {
      const text = getString(key).replace(/\s/g, "");
      const raw = text.includes(",") ? text.replace(/\./g, "").replace(/,/g, ".") : text;
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    };
    return {
      pelabuhan_asal: getString("pelabuhan_asal"),
      packing_plant: getString("packing_plant"),
      bulan: getNumber("bulan"),
      tahun: getNumber("tahun"),
      target_pcc: getNumber("target_pcc"),
      target_opc: getNumber("target_opc"),
      target_spk: getNumber("target_spk"),
      plant: getString("plant") || null,
    };
  };

  const createDuplicateKey = (row: Partial<RkapShipment> | Record<string, string | number | null>) =>
    uploadHeaders
      .map((key) => `${key}:${String(row[key as keyof typeof row] ?? "").trim().toLowerCase()}`)
      .join("|");

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([Object.fromEntries(uploadHeaders.map((h) => [h, ""]))], { header: uploadHeaders });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template RKAP Shipment Laut");
    XLSX.writeFile(wb, "template-rkap-shipment-laut.xlsx");
  };

  const handleUploadClick = () => {
    setUploadStatus("idle");
    setUploadMessage("");
    fileInputRef.current?.click();
  };

  const processUploadedFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadStatus("uploading");
    setUploadMessage("Memproses file...");

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const uploadedRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (uploadedRows.length === 0) throw new Error("File tidak memiliki data.");

      let successCount = 0;
      let skippedCount = 0;
      const existingKeys = new Set(rows.map((row) => createDuplicateKey(row)));

      for (const uploadedRow of uploadedRows) {
        const payload = normalizeUploadRow(uploadedRow);
        if (!payload.pelabuhan_asal || !payload.packing_plant || !payload.bulan || !payload.tahun) continue;

        const duplicateKey = createDuplicateKey(payload);
        if (existingKeys.has(duplicateKey)) {
          skippedCount += 1;
          continue;
        }

        const res = await fetch("/api/rkap-shipments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok === false) {
          console.error("Upload row failed", { uploadedRow, payload, response: data });
          throw new Error(data.message || data.error || "Gagal upload salah satu baris data.");
        }
        existingKeys.add(duplicateKey);
        successCount += 1;
      }

      await fetchRows();
      setUploadStatus("success");
      setUploadMessage(`Upload selesai. ${successCount} data berhasil disimpan, ${skippedCount} data duplikat di-skip.`);
      event.target.value = "";
    } catch (error) {
      console.error(error);
      setUploadStatus("error");
      setUploadMessage(error instanceof Error ? error.message : "Upload gagal.");
    }
  };

  const columns = useMemo(() => [
    { key: "bulan", header: "Bulan", render: (s: RkapShipment) => <span>{getMonthLabel(s.bulan)}</span> },
    {
      key: "target",
      header: "Target",
      className: "text-right",
      render: (s: RkapShipment) => <span className="font-bold">{formatNumber(getTarget(s))}</span>,
    },
    {
      key: "realisasi",
      header: "Realisasi",
      className: "text-right",
      render: (s: RkapShipment) => <span className="font-bold">{formatNumber(getRealization(s))}</span>,
    },
    {
      key: "capaian",
      header: "% Capaian",
      className: "text-right",
      render: (s: RkapShipment) => {
        const target = getTarget(s);
        const realization = getRealization(s);
        return <span>{getAchievement(target, realization).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>;
      },
    },
    {
      key: "sisa",
      header: "Sisa",
      className: "text-right",
      render: (s: RkapShipment) => <span>{formatNumber(getTarget(s) - getRealization(s))}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (s: RkapShipment) => {
        const target = getTarget(s);
        const realization = getRealization(s);
        const tercapai = realization >= target || (target === 0 && realization > 0);
        return (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tercapai ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
            {tercapai ? "Tercapai" : "On Progress"}
          </span>
        );
      },
    },
    {
      key: "_aksi",
      header: "Aksi",
      render: (s: RkapShipment) => (
        <div className="flex items-center gap-1.5">
          {canEdit && (
            <button
              onClick={() => handleEdit(s)}
              className="inline-flex items-center justify-center w-7 h-7 rounded text-xs transition-colors bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white border border-amber-100"
              title="Edit"
            >
              <Edit3 size={13} />
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
  ], [canDelete, canEdit, realizations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-full mx-auto">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {Array.from(plantTotals.entries()).map(([plant, stats]) => {
          const achievement = stats.target === 0 ? (stats.realization > 0 ? 100 : 0) : (stats.realization / stats.target) * 100;
          const isAchieved = stats.realization >= stats.target || (stats.target === 0 && stats.realization > 0);
          return (
            <div key={plant} className="p-4 sm:p-5 lg:p-6 bg-white rounded-xl shadow-soft border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-50 text-blue-600">
                  <FileText size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium truncate text-gray-500">{plant}</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-0.5 tracking-tight leading-none text-gray-900">
                    {formatNumber(stats.realization)}/{formatNumber(stats.target)}
                  </p>

                  <p className={isAchieved ? "text-[11px] sm:text-xs mt-1 flex items-center gap-1 text-green-500" : "text-[11px] sm:text-xs mt-1 flex items-center gap-1 text-amber-500"}>
                    <span>{isAchieved ? "Tercapai" : "On Progress"}</span>
                    <span>({achievement.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)</span>
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">RKAP Shipment Laut</h1>
      </div>

      {canEdit && showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 p-4 md:p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">{isEditing ? "Edit RKAP Shipment" : "Tambah RKAP Shipment"}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600" title="Tutup">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pelabuhan Asal</label>
                  <select name="pelabuhan_asal" value={formData.pelabuhan_asal || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                    <option value="">Pilih Pelabuhan</option>
                    {PORTS.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Packing Plant</label>
                  <select name="packing_plant" value={formData.packing_plant || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                    <option value="">Pilih Packing Plant</option>
                    {PLANTS.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bulan</label>
                  <select name="bulan" value={formData.bulan || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                    {BULAN_OPTIONS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
                  <input type="number" name="tahun" value={formData.tahun ?? ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target PCC</label>
                  <input type="number" step="0.01" name="target_pcc" value={formData.target_pcc ?? ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target OPC</label>
                  <input type="number" step="0.01" name="target_opc" value={formData.target_opc ?? ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target SPK</label>
                  <input type="number" step="0.01" name="target_spk" value={formData.target_spk ?? ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plant</label>
                  <input type="text" name="plant" value={formData.plant || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
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
        title="RKAP Shipment Laut"
        columns={columns}
        data={rows}
        searchable
        searchPlaceholder="Cari pelabuhan, packing plant, plant..."
        actions={
          canEdit && (
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={() => setShowUploadModal(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap">
                <Download size={16} /> Upload File
              </button>
              <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-glow flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap">
                <Plus size={16} /> Tambah Data
              </button>
            </div>
          )
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

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Apakah anda sudah punya templatenya?</h3>
                <p className="mt-1 text-sm text-gray-600">Gunakan template Excel agar format kolom sesuai dengan sistem.</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            {uploadMessage && (
              <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${uploadStatus === "error" ? "border-red-200 bg-red-50 text-red-700" : uploadStatus === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}>
                {uploadMessage}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={processUploadedFile} />

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={() => setShowUploadModal(false)} disabled={uploadStatus === "uploading"} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-60">Batal</button>
              <button onClick={handleUploadClick} disabled={uploadStatus === "uploading"} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{uploadStatus === "uploading" ? "Mengupload..." : "Upload"}</button>
              <button onClick={downloadTemplate} disabled={uploadStatus === "uploading"} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">Download Template</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

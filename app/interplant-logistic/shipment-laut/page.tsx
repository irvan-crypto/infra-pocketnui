"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { PORTS, PLANTS } from "@/lib/coordinates";
import { SHIP_STATUS_ORDER, SHIP_STATUS_LABELS } from "@/lib/app-config";
import { formatDateIndonesian } from "@/lib/utils";
import { FileText, Plus, Edit3, Trash2, Loader2, Send, Download, X } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import * as XLSX from "xlsx";

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
  keterangan: string | null;
  type_tarif: string | null;
  tarif: number | null;
  total_biaya: number | null;
  created_at: string;
  updated_at: string;
}

type ShipmentFormData = Partial<Omit<Shipment, "muatan_ton" | "tarif" | "total_biaya">> & {
  muatan_ton?: number | "";
  tarif?: number | "";
  total_biaya?: number | "";
};

type HistoryFieldName = "nama_kapal" | "nama_vendor" | "type_muatan" | "keterangan";

export default function InterplantLogisticShipmentLautPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ShipmentFormData>({
    nama_kapal: "",
    nama_vendor: "",
    type_muatan: "",
    muatan_ton: "",
    tujuan_pp: "",
    pelabuhan_asal: "",
    ta_tiba: "",
    sandar: "",
    muat: "",
    selesai_muat: "",
    td_pelabuhan: "",
    ta_pp: "",
    keterangan: "",
    type_tarif: "",
    tarif: "",
    total_biaya: 0,
  });

  // Popup confirmation states
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingEditShipment, setPendingEditShipment] = useState<Shipment | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [activeHistoryField, setActiveHistoryField] = useState<HistoryFieldName | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }
    fetchShipments();
  }, [user, router]);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shipments");
      const data = await res.json();
      if (data.ok) setShipments(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getHistoryOptions = (field: HistoryFieldName, currentValue = "") => {
    const search = currentValue.trim().toLowerCase();
    const uniqueValues = Array.from(
      new Set(
        shipments
          .map((shipment) => shipment[field])
          .filter((value): value is string => Boolean(value && value.trim()))
      )
    );

    return uniqueValues
      .filter((value) => !search || value.toLowerCase().includes(search))
      .slice(0, 8);
  };

  const selectHistoryValue = (field: HistoryFieldName, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setActiveHistoryField(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "number") {
      setFormData((prev) => ({ ...prev, [name]: value === "" ? "" : Number(value) }));
    } else if (type === "datetime-local") {
      if (value === "") {
        setFormData(prev => ({ ...prev, [name]: null }));
      } else {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      muatan_ton: formData.muatan_ton === "" ? 0 : Number(formData.muatan_ton ?? 0),
      tarif: formData.tarif === "" ? 0 : Number(formData.tarif ?? 0),
      total_biaya: formData.total_biaya === "" ? 0 : Number(formData.total_biaya ?? 0),
    };
    try {
      const res = await fetch("/api/shipments", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditing ? { id: editingId, ...payload } : payload),
      });
      const data = await res.json();
      if (data.ok) {
        resetForm();
        setShowForm(false);
        fetchShipments();
      } else {
        alert(data.message || "Gagal menyimpan data");
      }
    } catch {
      alert("Terjadi kesalahan");
    }
  };

  const handleEdit = (shipment: Shipment) => {
    setIsEditing(true);
    setEditingId(shipment.id);
    setFormData({
      nama_kapal: shipment.nama_kapal || "",
      nama_vendor: shipment.nama_vendor || "",
      type_muatan: shipment.type_muatan || "",
      muatan_ton: shipment.muatan_ton ?? "",
      tujuan_pp: shipment.tujuan_pp || "",
      pelabuhan_asal: shipment.pelabuhan_asal || "",
      ta_tiba: shipment.ta_tiba ? new Date(shipment.ta_tiba).toISOString().slice(0, 16) : null,
      sandar: shipment.sandar ? new Date(shipment.sandar).toISOString().slice(0, 16) : null,
      muat: shipment.muat ? new Date(shipment.muat).toISOString().slice(0, 16) : null,
      selesai_muat: shipment.selesai_muat ? new Date(shipment.selesai_muat).toISOString().slice(0, 16) : null,
      td_pelabuhan: shipment.td_pelabuhan ? new Date(shipment.td_pelabuhan).toISOString().slice(0, 16) : null,
      ta_pp: shipment.ta_pp ? new Date(shipment.ta_pp).toISOString().slice(0, 16) : null,
      keterangan: shipment.keterangan || "",
      type_tarif: shipment.type_tarif || "",
      tarif: shipment.tarif ?? "",
      total_biaya: shipment.total_biaya ?? 0,
    });
  };

  // Open add popup
  const triggerAdd = () => {
    setShowAddConfirm(true);
  };

  // Confirm add → open form popup
  const confirmAdd = () => {
    setShowAddConfirm(false);
    resetForm();
    setShowForm(true);
  };

  // Open edit popup
  const triggerEdit = (shipment: Shipment) => {
    setPendingEditShipment(shipment);
    setShowEditConfirm(true);
  };

  // Confirm edit → open form popup
  const confirmEdit = () => {
    if (pendingEditShipment) {
      setShowEditConfirm(false);
      handleEdit(pendingEditShipment);
      setPendingEditShipment(null);
      setShowForm(true);
    }
  };

  // Open delete popup
  const triggerDelete = (id: string) => {
    setPendingDeleteId(id);
    setShowDeleteConfirm(true);
  };

  // Confirm delete → call handleDelete
  const confirmDelete = async () => {
    if (pendingDeleteId) {
      try {
        const res = await fetch("/api/shipments", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: pendingDeleteId }),
        });
        const data = await res.json();
        if (data.ok) {
          fetchShipments();
          setShowDeleteConfirm(false);
          setPendingDeleteId(null);
        } else {
          alert(data.message || "Gagal hapus data");
        }
      } catch {
        alert("Terjadi kesalahan");
      }
    }
  };


  const shipmentUploadHeaders = [
    "nama_kapal",
    "nama_vendor",
    "type_muatan",
    "muatan_ton",
    "tujuan_pp",
    "pelabuhan_asal",
    "ta_tiba",
    "sandar",
    "muat",
    "selesai_muat",
    "td_pelabuhan",
    "ta_pp",
    "keterangan",
    "type_tarif",
    "tarif",
    "total_biaya",
  ];

  const normalizeUploadRow = (row: Record<string, unknown>) => {
    const timestampFields = ["ta_tiba", "sandar", "muat", "selesai_muat", "td_pelabuhan", "ta_pp"];
    const getString = (key: string) => row[key] == null ? "" : String(row[key]).trim();
    const getNumber = (key: string) => {
      const raw = getString(key).replace(/,/g, ".");
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    };
    const toTwoDigits = (value: number) => String(value).padStart(2, "0");
    const normalizeDateTime = (key: string) => {
      const raw = row[key];
      const text = getString(key);
      if (!text) return null;

      // Excel date serial number, e.g. 45567.5
      if (typeof raw === "number" && Number.isFinite(raw)) {
        const parsed = XLSX.SSF.parse_date_code(raw);
        if (parsed) {
          return `${parsed.y}-${toTwoDigits(parsed.m)}-${toTwoDigits(parsed.d)} ${toTwoDigits(parsed.H)}:${toTwoDigits(parsed.M)}:${toTwoDigits(parsed.S)}`;
        }
      }

      // Input umum dari template: 2026-09-12 14:30 atau 2026-09-12T14:30
      if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(text)) {
        return text.replace("T", " ").length === 16 ? `${text.replace("T", " ")}:00` : text.replace("T", " ");
      }

      // Format tanggal saja: 2026-09-12
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text} 00:00:00`;

      // Format Indonesia sederhana: 12/09/2026 14:30 atau 12-09-2026 14:30
      const match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
      if (match) {
        const [, d, m, y, hh = "00", mm = "00", ss = "00"] = match;
        return `${y}-${toTwoDigits(Number(m))}-${toTwoDigits(Number(d))} ${toTwoDigits(Number(hh))}:${mm}:${ss}`;
      }

      return text;
    };
    const payload: Record<string, string | number | null> = {
      nama_kapal: getString("nama_kapal"),
      nama_vendor: getString("nama_vendor"),
      type_muatan: getString("type_muatan"),
      muatan_ton: getNumber("muatan_ton"),
      tujuan_pp: getString("tujuan_pp"),
      pelabuhan_asal: getString("pelabuhan_asal"),
      keterangan: getString("keterangan") || null,
      type_tarif: getString("type_tarif") || "FREIGHT BASIC",
      tarif: getNumber("tarif"),
      total_biaya: getString("total_biaya") ? getNumber("total_biaya") : getNumber("muatan_ton") * getNumber("tarif"),
    };
    timestampFields.forEach((key) => {
      payload[key] = normalizeDateTime(key);
    });
    return payload;
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([Object.fromEntries(shipmentUploadHeaders.map((h) => [h, ""]))], { header: shipmentUploadHeaders });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Shipment Laut");
    XLSX.writeFile(wb, "template-shipment-laut.xlsx");
  };

  const handleUploadClick = () => {
    setUploadStatus("idle");
    setUploadMessage("");
    fileInputRef.current?.click();
  };

  const createShipmentDuplicateKey = (shipment: Partial<Shipment> | Record<string, string | number | null>) => {
    const timestampFields = new Set(["ta_tiba", "sandar", "muat", "selesai_muat", "td_pelabuhan", "ta_pp"]);
    const numberFields = new Set(["muatan_ton", "tarif", "total_biaya"]);
    const normalizeValue = (key: string, value: unknown) => {
      if (value == null || value === "") return "";

      if (numberFields.has(key)) {
        const numberValue = Number(String(value).replace(/,/g, "."));
        return Number.isFinite(numberValue) ? String(numberValue) : "0";
      }

      if (timestampFields.has(key)) {
        const text = String(value).trim().replace("T", " ");
        const date = new Date(text);
        if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 19);
        return text.replace(/\.\d+Z?$/, "").replace(/Z$/, "");
      }

      return String(value).trim().toLowerCase();
    };

    return shipmentUploadHeaders
      .map((key) => `${key}:${normalizeValue(key, shipment[key as keyof typeof shipment])}`)
      .join("|");
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
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

      if (rows.length === 0) throw new Error("File tidak memiliki data.");

      let successCount = 0;
      let skippedCount = 0;
      const existingKeys = new Set(shipments.map((shipment) => createShipmentDuplicateKey(shipment)));

      for (const row of rows) {
        const payload = normalizeUploadRow(row);
        if (!payload.nama_kapal) continue;

        const duplicateKey = createShipmentDuplicateKey(payload);
        if (existingKeys.has(duplicateKey)) {
          skippedCount += 1;
          continue;
        }

        const res = await fetch("/api/shipments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok === false) {
          console.error("Upload row failed", { row, payload, response: data });
          throw new Error(data.message || data.error || "Gagal upload salah satu baris data.");
        }
        existingKeys.add(duplicateKey);
        successCount += 1;
      }

      await fetchShipments();
      setUploadStatus("success");
      setUploadMessage(`Upload selesai. ${successCount} data berhasil disimpan, ${skippedCount} data duplikat di-skip.`);
      event.target.value = "";
    } catch (error) {
      console.error(error);
      setUploadStatus("error");
      setUploadMessage(error instanceof Error ? error.message : "Upload gagal.");
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      nama_kapal: "",
      nama_vendor: "",
      type_muatan: "",
      muatan_ton: "",
      tujuan_pp: "",
      pelabuhan_asal: "",
      ta_tiba: null,
      sandar: null,
      muat: null,
      selesai_muat: null,
      td_pelabuhan: null,
      ta_pp: null,
      keterangan: "",
      type_tarif: "FREIGHT BASIC",
      tarif: "",
      total_biaya: 0,
    });
  };

  const renderHistorySuggestions = (field: HistoryFieldName) => {
    if (activeHistoryField !== field) return null;
    const options = getHistoryOptions(field, String(formData[field] || ""));
    if (options.length === 0) return null;

    return (
      <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              selectHistoryValue(field, option);
            }}
            className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
          >
            {option}
          </button>
        ))}
      </div>
    );
  };

  const canEdit = user?.role === "admin" || user?.role === "operator";
  const canDelete = user?.role === "admin";

  // Per-plant supply totals (card stat)
  const plantTotals = useMemo(() => {
    const map = new Map<string, number>();
    PLANTS.forEach((p) => map.set(p.name, 0));
    shipments.forEach((s) => {
      const cur = map.get(s.tujuan_pp) ?? 0;
      map.set(s.tujuan_pp, cur + s.muatan_ton);
    });
    return map;
  }, [shipments]);

  // Compute total_biaya if not set (muatan_ton * tarif)
  const enrichedShipments = useMemo(() => {
    return shipments.map((s) => ({
      ...s,
      total_biaya: s.total_biaya == null ? s.muatan_ton * (s.tarif || 0) : s.total_biaya,
    }));
  }, [shipments]);

  // Auto-calculate total_biaya when muatan_ton or tarif changes
  useEffect(() => {
    const muatan_ton = formData.muatan_ton === "" ? 0 : Number(formData.muatan_ton ?? 0);
    const tarif = formData.tarif === "" ? 0 : Number(formData.tarif ?? 0);
    setFormData(prev => ({ ...prev, total_biaya: muatan_ton * tarif }));
  }, [formData.muatan_ton, formData.tarif]);

  // Kolom tabel (16 kolom)
  const columns = useMemo(() => [
    { key: "nama_kapal", header: "Nama Kapal", render: (s: Shipment) => <span className="font-bold">{s.nama_kapal}</span> },
    { key: "nama_vendor", header: "Vendor", render: (s: Shipment) => <span>{s.nama_vendor || "-"}</span> },
    { key: "type_muatan", header: "Jenis Muatan", render: (s: Shipment) => <span>{s.type_muatan || "-"}</span> },
    {
      key: "muatan_ton",
      header: "Muatan (Ton)",
      className: "text-right",
      render: (s: Shipment) => (
        <span className="font-bold">
          {s.muatan_ton.toLocaleString("id-ID", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    { key: "tujuan_pp", header: "Tujuan PP", render: (s: Shipment) => <span>{s.tujuan_pp}</span> },
    { key: "pelabuhan_asal", header: "Pelabuhan Asal", render: (s: Shipment) => <span>{s.pelabuhan_asal}</span> },
    { key: "ta_tiba", header: "TA Tiba", render: (s: Shipment) => <span className="text-xs">{s.ta_tiba ? formatDateIndonesian(s.ta_tiba) : "-"}</span> },
    { key: "sandar", header: "Sandar", render: (s: Shipment) => <span className="text-xs">{s.sandar ? formatDateIndonesian(s.sandar) : "-"}</span> },
    { key: "muat", header: "Muat", render: (s: Shipment) => <span className="text-xs">{s.muat ? formatDateIndonesian(s.muat) : "-"}</span> },
    { key: "selesai_muat", header: "Selesai Muat", render: (s: Shipment) => <span className="text-xs">{s.selesai_muat ? formatDateIndonesian(s.selesai_muat) : "-"}</span> },
    { key: "td_pelabuhan", header: "TD Pelabuhan", render: (s: Shipment) => <span className="text-xs">{s.td_pelabuhan ? formatDateIndonesian(s.td_pelabuhan) : "-"}</span> },
    { key: "ta_pp", header: "TA PP", render: (s: Shipment) => <span className="text-xs">{s.ta_pp ? formatDateIndonesian(s.ta_pp) : "-"}</span> },
    { key: "keterangan", header: "Keterangan", render: (s: Shipment) => <span className="max-w-xs truncate">{s.keterangan || "-"}</span> },
    { key: "type_tarif", header: "Tipe Tarif", render: (s: Shipment) => <span>{s.type_tarif || "-"}</span> },
    {
      key: "tarif",
      header: "Tarif",
      className: "text-right",
      render: (s: Shipment) => <span>{(s.tarif || 0).toLocaleString("id-ID")}</span>,
    },
    {
      key: "total_biaya",
      header: "Total Biaya",
      className: "text-right",
      render: (s: Shipment) => (
        <span className="font-bold text-blue-600">{(s.total_biaya || 0).toLocaleString("id-ID")}</span>
      ),
    },
    { 
      key: "_aksi", 
      header: "Aksi", 
      render: (s: Shipment) => {
        return (
          <div className="flex items-center gap-1.5">
            {canEdit && (
              <button
                onClick={() => triggerEdit(s)}
                className="inline-flex items-center justify-center w-7 h-7 rounded text-xs transition-colors bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white border border-amber-100"
                title="Edit"
              >
                <Edit3 size={13} />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => triggerDelete(s.id)}
                className="inline-flex items-center justify-center w-7 h-7 rounded text-xs transition-colors bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-100"
                title="Hapus"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        );
      }
    },
  ], []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  const getRowClass = (s: Shipment) => {
    const latestStatus = SHIP_STATUS_ORDER
      .map((k) => ({ key: k, value: s[k as keyof Shipment] as string | null }))
      .reduce((latest, f) => {
        if (f.value && (!latest || new Date(f.value) > new Date(latest.value))) return f;
        return latest;
      }, null as { key: string; value: string | null } | null);
    if (latestStatus?.key === "muat") return "hover:bg-orange-50";
    if (latestStatus?.key === "selesai_muat") return "hover:bg-amber-50";
    if (latestStatus?.key === "ta_pp") return "hover:bg-green-50";
    return "";
  };

  return (
    <div className="p-4 md:p-6 max-w-full mx-auto">
      {/* Card Grid — one per Packing Plant */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {PLANTS.map((plant) => (
          <div key={plant.name} className="p-4 sm:p-5 lg:p-6 bg-white rounded-xl shadow-soft border border-gray-100">
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2 sm:gap-3 lg:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-50 text-blue-600">
                <FileText className="lucide lucide-file-text sm:w-[22px] sm:h-[22px]" />
              </div>
              <div className="min-w-0 sm:flex-1">
                <p className="text-xs sm:text-sm font-medium sm:truncate text-gray-500">{plant.name}</p>
                <p className="text-2xl sm:text-3xl font-bold mt-0.5 tracking-tight leading-none text-gray-900">
                  {(plantTotals.get(plant.name) ?? 0).toLocaleString("id-ID")}
                </p>
                <p className="text-[11px] sm:text-xs mt-1 flex items-center justify-center sm:justify-start gap-1 sm:truncate text-gray-400">
                  Ton
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Kapal Laut</h1>
      </div>

      {/* Form Popup */}
      {canEdit && showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 p-4 md:p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">
                {isEditing ? "Edit Kapal" : "Tambah Kapal Baru"}
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Tutup"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kapal</label>
                  <input
                    type="text"
                    name="nama_kapal"
                    value={formData.nama_kapal || ""}
                    onChange={handleChange}
                    onFocus={() => setActiveHistoryField("nama_kapal")}
                    onBlur={() => setTimeout(() => setActiveHistoryField(null), 150)}
                    autoComplete="off"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  {renderHistorySuggestions("nama_kapal")}
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                  <input
                    type="text"
                    name="nama_vendor"
                    value={formData.nama_vendor || ""}
                    onChange={handleChange}
                    onFocus={() => setActiveHistoryField("nama_vendor")}
                    onBlur={() => setTimeout(() => setActiveHistoryField(null), 150)}
                    autoComplete="off"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {renderHistorySuggestions("nama_vendor")}
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Muatan</label>
                  <input
                    type="text"
                    name="type_muatan"
                    value={formData.type_muatan || ""}
                    onChange={handleChange}
                    onFocus={() => setActiveHistoryField("type_muatan")}
                    onBlur={() => setTimeout(() => setActiveHistoryField(null), 150)}
                    autoComplete="off"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {renderHistorySuggestions("type_muatan")}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Muatan (ton)</label>
                  <input
                    type="number"
                    name="muatan_ton"
                    step="0.01"
                    value={formData.muatan_ton ?? ""}
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
                {/* Status Fields */}
                {SHIP_STATUS_ORDER.map((sk) => (
                  <div key={sk}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{SHIP_STATUS_LABELS[sk]}</label>
                    <input
                      type="datetime-local"
                      name={sk}
                      value={formData[sk] || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ))}
                {/* New fields */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                  <textarea
                    name="keterangan"
                    value={formData.keterangan || ""}
                    onChange={handleChange}
                    onFocus={() => setActiveHistoryField("keterangan")}
                    onBlur={() => setTimeout(() => setActiveHistoryField(null), 150)}
                    rows={2}
                    autoComplete="off"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {renderHistorySuggestions("keterangan")}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Tarif</label>
                  <input
                    type="text"
                    name="type_tarif"
                    value={formData.type_tarif || "FREIGHT BASIC"}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tarif</label>
                  <input
                    type="number"
                    name="tarif"
                    step="0.01"
                    value={formData.tarif ?? ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Biaya (otomatis)</label>
                  <input
                    type="number"
                    name="total_biaya"
                    step="0.01"
                    value={formData.total_biaya || 0}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    readOnly
                  />
                </div>
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
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
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

      {/* Table using DataTable component */}
      <DataTable
        title="Manajemen Kapal Laut"
        columns={columns}
        data={enrichedShipments}
        searchable
        searchPlaceholder="Cari kapal, vendor, pelabuhan, PP..."
        getRowClass={getRowClass}
        actions={
          canEdit && (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                <Download size={16} /> Upload File
              </button>
              <button
                onClick={triggerAdd}
                className="btn-glow flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                <Plus size={16} /> Tambah Data
              </button>
            </div>
          )
        }
      />

      {/* Popup Konfirmasi Tambah */}
      {showAddConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Konfirmasi</h3>
            <p className="text-sm text-gray-600 mb-5">Apakah anda ingin menambahkan data?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Tidak
              </button>
              <button
                onClick={confirmAdd}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                Ya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Konfirmasi Edit */}
      {showEditConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Konfirmasi</h3>
            <p className="text-sm text-gray-600 mb-5">Apakah anda ingin mengedit data ini?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowEditConfirm(false);
                  setPendingEditShipment(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Tidak
              </button>
              <button
                onClick={confirmEdit}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition"
              >
                Ya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Konfirmasi Delete */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Konfirmasi</h3>
            <p className="text-sm text-gray-600 mb-5">Apakah anda ingin menghapus data ini?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setPendingDeleteId(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Tidak
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition"
              >
                Ya
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Upload file modal */}
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

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={processUploadedFile}
            />

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={uploadStatus === "uploading"}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-60"
              >
                Batal
              </button>
              <button
                onClick={handleUploadClick}
                disabled={uploadStatus === "uploading"}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {uploadStatus === "uploading" ? "Mengupload..." : "Upload"}
              </button>
              <button
                onClick={downloadTemplate}
                disabled={uploadStatus === "uploading"}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                Download Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp modal placeholder if needed */}
    </div>
  );
}
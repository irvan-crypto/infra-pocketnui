"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { PORTS, PLANTS } from "@/lib/coordinates";
import { SHIP_STATUS_ORDER, SHIP_STATUS_LABELS } from "@/lib/app-config";
import { formatDateIndonesian } from "@/lib/utils";
import { FileText, Plus, Edit3, Trash2, Loader2, Send, Download, X, Factory, Search } from "lucide-react";
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
  sandar_pp: string | null;
  bongkar_pp: string | null;
  selesai_pp: string | null;
  td_pp: string | null;
  draft_surveypp: number | null;
  keterangan: string | null;
  type_tarif: string | null;
  tarif: number | null;
  total_biaya: number | null;
  created_at: string;
  updated_at: string;
}

type ShipmentFormData = Partial<Omit<Shipment, "muatan_ton" | "tarif" | "total_biaya" | "draft_surveypp">> & {
  muatan_ton?: number | "";
  tarif?: number | "";
  total_biaya?: number | "";
  draft_surveypp?: number | "";
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
    sandar_pp: "",
    bongkar_pp: "",
    selesai_pp: "",
    td_pp: "",
    draft_surveypp: "",
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

  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [tableSearch, setTableSearch] = useState("");

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
      draft_surveypp: formData.draft_surveypp === "" ? null : Number(formData.draft_surveypp ?? null),
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
      sandar_pp: shipment.sandar_pp ? new Date(shipment.sandar_pp).toISOString().slice(0, 16) : null,
      bongkar_pp: shipment.bongkar_pp ? new Date(shipment.bongkar_pp).toISOString().slice(0, 16) : null,
      selesai_pp: shipment.selesai_pp ? new Date(shipment.selesai_pp).toISOString().slice(0, 16) : null,
      td_pp: shipment.td_pp ? new Date(shipment.td_pp).toISOString().slice(0, 16) : null,
      draft_surveypp: shipment.draft_surveypp ?? "",
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
    "sandar_pp",
    "bongkar_pp",
    "selesai_pp",
    "td_pp",
    "draft_surveypp",
    "keterangan",
    "type_tarif",
    "tarif",
    "total_biaya",
  ];

  const normalizeUploadRow = (row: Record<string, unknown>) => {
    const timestampFields = ["ta_tiba", "sandar", "muat", "selesai_muat", "td_pelabuhan", "ta_pp", "sandar_pp", "bongkar_pp", "selesai_pp", "td_pp"];
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
      draft_surveypp: getString("draft_surveypp") ? getNumber("draft_surveypp") : null,
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
    const timestampFields = new Set(["ta_tiba", "sandar", "muat", "selesai_muat", "td_pelabuhan", "ta_pp", "sandar_pp", "bongkar_pp", "selesai_pp", "td_pp"]);
    const numberFields = new Set(["muatan_ton", "tarif", "total_biaya", "draft_surveypp"]);
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
      sandar_pp: null,
      bongkar_pp: null,
      selesai_pp: null,
      td_pp: null,
      draft_surveypp: "",
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

  // Normalisasi nama plant agar pencocokan toleran terhadap spasi/kapital
  const normalizePlantName = (name: string | null | undefined) =>
    (name || "").trim().replace(/\s+/g, " ").toLowerCase();

  // Tahun yang ada di data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    shipments.forEach((s) => {
      const dateFields = [s.ta_tiba, s.sandar, s.muat, s.selesai_muat, s.td_pelabuhan, s.ta_pp, s.sandar_pp, s.bongkar_pp, s.selesai_pp, s.td_pp];
      dateFields.forEach((d) => {
        if (!d) return;
        const date = new Date(d);
        if (!Number.isNaN(date.getTime())) years.add(date.getFullYear());
      });
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [shipments]);

  // Filter by selected plant dan tahun (toleran terhadap beda spasi/kapital)
  const filteredShipments = useMemo(() => {
    let result = shipments;

    // Filter tahun: pakai tanggal aktivitas terbaru tiap shipment
    const latestActivityYear = (s: Shipment): number | null => {
      const dateFields = [s.ta_tiba, s.sandar, s.muat, s.selesai_muat, s.td_pelabuhan, s.ta_pp, s.sandar_pp, s.bongkar_pp, s.selesai_pp, s.td_pp];
      let latest: Date | null = null;
      dateFields.forEach((d) => {
        if (!d) return;
        const date = new Date(d);
        if (!Number.isNaN(date.getTime()) && (!latest || date > latest)) latest = date;
      });
      return latest ? latest.getFullYear() : null;
    };

    result = result.filter((s) => {
      const y = latestActivityYear(s);
      // Jika shipment tidak punya tanggal sama sekali, tetap tampil pada tahun berjalan
      if (y === null) return selectedYear === new Date().getFullYear();
      return y === selectedYear;
    });

    if (selectedPlant) {
      const selected = normalizePlantName(selectedPlant);
      result = result.filter((s) => normalizePlantName(s.tujuan_pp) === selected);
    }

    return result;
  }, [shipments, selectedPlant, selectedYear]);

  // Per-plant supply totals (mengikuti filter)
  const plantTotals = useMemo(() => {
    const map = new Map<string, { ton: number; count: number }>();
    const plantsToShow = selectedPlant
      ? PLANTS.filter((p) => normalizePlantName(p.name) === normalizePlantName(selectedPlant))
      : PLANTS;
    plantsToShow.forEach((p) => map.set(p.name, { ton: 0, count: 0 }));

    filteredShipments.forEach((s) => {
      const key = PLANTS.find((p) => normalizePlantName(p.name) === normalizePlantName(s.tujuan_pp))?.name || s.tujuan_pp;
      const cur = map.get(key) || { ton: 0, count: 0 };
      cur.ton += s.muatan_ton || 0;
      cur.count += 1;
      map.set(key, cur);
    });
    return map;
  }, [filteredShipments, selectedPlant]);

  // Statistik ringkasan (mengikuti filter)
  const summaryStats = useMemo(() => {
    const totalTon = filteredShipments.reduce((sum, s) => sum + (s.muatan_ton || 0), 0);
    const totalBiaya = filteredShipments.reduce((sum, s) => sum + (s.total_biaya == null ? (s.muatan_ton || 0) * (s.tarif || 0) : s.total_biaya), 0);
    const uniqueKapal = new Set(filteredShipments.map((s) => s.nama_kapal)).size;
    return { totalTon, totalBiaya, uniqueKapal, count: filteredShipments.length };
  }, [filteredShipments]);

  // Compute total_biaya if not set (muatan_ton * tarif)
  const enrichedShipments = useMemo(() => {
    return filteredShipments.map((s) => ({
      ...s,
      total_biaya: s.total_biaya == null ? s.muatan_ton * (s.tarif || 0) : s.total_biaya,
    }));
  }, [filteredShipments]);

  // Auto-calculate total_biaya when muatan_ton or tarif changes
  useEffect(() => {
    const muatan_ton = formData.muatan_ton === "" ? 0 : Number(formData.muatan_ton ?? 0);
    const tarif = formData.tarif === "" ? 0 : Number(formData.tarif ?? 0);
    setFormData(prev => ({ ...prev, total_biaya: muatan_ton * tarif }));
  }, [formData.muatan_ton, formData.tarif]);

  const formatNumber = (value: number | null | undefined) =>
    Number(value || 0).toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

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
    { key: "sandar_pp", header: "Sandar PP", render: (s: Shipment) => <span className="text-xs">{s.sandar_pp ? formatDateIndonesian(s.sandar_pp) : "-"}</span> },
    { key: "bongkar_pp", header: "Bongkar PP", render: (s: Shipment) => <span className="text-xs">{s.bongkar_pp ? formatDateIndonesian(s.bongkar_pp) : "-"}</span> },
    { key: "selesai_pp", header: "Selesai PP", render: (s: Shipment) => <span className="text-xs">{s.selesai_pp ? formatDateIndonesian(s.selesai_pp) : "-"}</span> },
    { key: "td_pp", header: "TD PP", render: (s: Shipment) => <span className="text-xs">{s.td_pp ? formatDateIndonesian(s.td_pp) : "-"}</span> },
    { key: "draft_surveypp", header: "Draft Survey PP", className: "text-right", render: (s: Shipment) => <span className="text-xs">{s.draft_surveypp != null ? Number(s.draft_surveypp).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}</span> },
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
  ], [canEdit, canDelete]);

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
    if (latestStatus?.key === "ta_pp" || latestStatus?.key === "sandar_pp" || latestStatus?.key === "bongkar_pp" || latestStatus?.key === "selesai_pp" || latestStatus?.key === "td_pp") return "hover:bg-green-50";
    return "";
  };

  return (
    <div className="p-4 md:p-6 max-w-full mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipment Laut</h1>
          <p className="text-sm text-gray-500 mt-1">Manajemen kapal & shipment laut antar packing plant</p>
        </div>
        {canEdit && (
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Filter Tahun */}
            <div className="flex items-center gap-2">
              <label htmlFor="year-filter-il" className="sr-only">Tahun</label>
              <select
                id="year-filter-il"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="h-10 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
                {availableYears.length === 0 && <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>}
              </select>
            </div>
            <button onClick={() => setShowUploadModal(true)} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap">
              <Download size={16} /> Upload File
            </button>
            <button onClick={triggerAdd} className="btn-glow flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap">
              <Plus size={16} /> Tambah Data
            </button>
          </div>
        )}
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4 flex items-center gap-3 border-l-4 border-l-blue-500 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 text-blue-600">
            <FileText size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium truncate">Total Muatan</p>
            <p className="text-lg font-bold text-gray-900 truncate tabular-nums">{formatNumber(summaryStats.totalTon)} <span className="text-xs font-medium text-gray-400">ton</span></p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3 border-l-4 border-l-emerald-500 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
            <FileText size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium truncate">Total Biaya</p>
            <p className="text-lg font-bold text-gray-900 truncate tabular-nums">Rp {summaryStats.totalBiaya.toLocaleString("id-ID")}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3 border-l-4 border-l-amber-500 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 text-amber-600">
            <FileText size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium truncate">Jumlah Kapal & Pengiriman</p>
            <p className="text-lg font-bold text-gray-900 truncate tabular-nums">{summaryStats.uniqueKapal} <span className="text-xs font-medium text-gray-400">kapal</span> · {summaryStats.count} <span className="text-xs font-medium text-gray-400">trip</span></p>
          </div>
        </div>
      </div>

      {/* ── Filter Plant (Button Group) ── */}
      <div className={`grid md:flex rounded-xl overflow-hidden border border-gray-200 divide-x divide-y md:divide-y-0 divide-gray-200 [&>*:nth-child(n+4)]:border-t [&>*:nth-child(n+4)]:border-gray-200 md:[&>*:nth-child(n+4)]:border-t-0 ${
        PLANTS.length === 1 ? "grid-cols-1" : PLANTS.length === 2 ? "grid-cols-2" : "grid-cols-3"
      }`}>
        <button
          type="button"
          onClick={() => setSelectedPlant(null)}
          className={`flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 px-2 md:px-3.5 py-2 text-[11px] md:text-xs font-medium transition-all duration-200 ${
            selectedPlant === null
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <FileText className="w-3.5 h-3.5 shrink-0 opacity-60" strokeWidth={1.5} />
          <span className="truncate">Semua</span>
        </button>
        {PLANTS.map((plant) => (
          <button
            key={plant.id}
            type="button"
            onClick={() => setSelectedPlant(plant.name)}
            className={`flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 px-2 md:px-3.5 py-2 text-[11px] md:text-xs font-medium transition-all duration-200 ${
              selectedPlant === plant.name
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Factory className="w-3.5 h-3.5 shrink-0 opacity-60" strokeWidth={1.5} />
            <span className="truncate">{plant.name}</span>
          </button>
        ))}
      </div>

      {/* ── Rekapitulasi per Packing Plant ── */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-base font-semibold text-gray-900">Rekapitulasi per Packing Plant</h3>
          <p className="text-xs text-gray-500">
            Total muatan &amp; pengiriman
            {selectedPlant ? (
              <span className="ml-1 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                {selectedPlant}
              </span>
            ) : (
              " — semua plant"
            )}
            {" · "}
            <span className="font-medium">{selectedYear}</span>
          </p>
        </div>
        <div className="card-body p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Packing Plant</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total Muatan (ton)</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Jumlah Trip</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(plantTotals.entries()).map(([plant, stats]) => (
                <tr
                  key={plant}
                  className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Factory className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{plant}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">{formatNumber(stats.ton)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{stats.count}</td>
                </tr>
              ))}
              {plantTotals.size === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">Belum ada data.</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td className="px-4 py-3 font-bold text-gray-800">Total</td>
                <td className="px-4 py-3 text-right font-bold text-gray-800 tabular-nums">{formatNumber(summaryStats.totalTon)}</td>
                <td className="px-4 py-3 text-right font-bold text-gray-800 tabular-nums">{summaryStats.count}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Tabel Detail Shipment ── */}
      <div className="card">
        <div className="card-header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900">Detail Shipment</h3>
            <p className="text-xs text-gray-500">Data lengkap setiap pengiriman kapal</p>
          </div>
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Cari kapal, vendor, pelabuhan, PP..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-9 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {tableSearch && (
              <button
                type="button"
                onClick={() => setTableSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                title="Hapus pencarian"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="card-body p-0">
          <DataTable
            columns={columns}
            data={enrichedShipments}
            searchValue={tableSearch}
            hideHeader
            getRowClass={getRowClass}
          />
        </div>
      </div>

      {/* ── Form Popup ── */}
      {canEdit && showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 p-4 md:p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">{isEditing ? "Edit Kapal" : "Tambah Kapal Baru"}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 transition-colors" title="Tutup"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kapal</label>
                  <input type="text" name="nama_kapal" value={formData.nama_kapal || ""} onChange={handleChange} onFocus={() => setActiveHistoryField("nama_kapal")} onBlur={() => setTimeout(() => setActiveHistoryField(null), 150)} autoComplete="off" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                  {renderHistorySuggestions("nama_kapal")}
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                  <input type="text" name="nama_vendor" value={formData.nama_vendor || ""} onChange={handleChange} onFocus={() => setActiveHistoryField("nama_vendor")} onBlur={() => setTimeout(() => setActiveHistoryField(null), 150)} autoComplete="off" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  {renderHistorySuggestions("nama_vendor")}
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Muatan</label>
                  <input type="text" name="type_muatan" value={formData.type_muatan || ""} onChange={handleChange} onFocus={() => setActiveHistoryField("type_muatan")} onBlur={() => setTimeout(() => setActiveHistoryField(null), 150)} autoComplete="off" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  {renderHistorySuggestions("type_muatan")}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Muatan (ton)</label>
                  <input type="number" name="muatan_ton" step="0.01" value={formData.muatan_ton ?? ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pelabuhan Asal</label>
                  <select name="pelabuhan_asal" value={formData.pelabuhan_asal || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                    <option value="">Pilih Pelabuhan</option>
                    {PORTS.map((p) => (<option key={p.name} value={p.name}>{p.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tujuan PP</label>
                  <select name="tujuan_pp" value={formData.tujuan_pp || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                    <option value="">Pilih Packing Plant</option>
                    {PLANTS.map((p) => (<option key={p.name} value={p.name}>{p.name}</option>))}
                  </select>
                </div>
                {SHIP_STATUS_ORDER.map((sk) => (
                  <div key={sk}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{SHIP_STATUS_LABELS[sk]}</label>
                    <input type="datetime-local" name={sk} value={formData[sk] || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Draft Survey PP (ton)</label>
                  <input type="number" name="draft_surveypp" step="0.01" value={formData.draft_surveypp ?? ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                  <textarea name="keterangan" value={formData.keterangan || ""} onChange={handleChange} onFocus={() => setActiveHistoryField("keterangan")} onBlur={() => setTimeout(() => setActiveHistoryField(null), 150)} rows={2} autoComplete="off" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  {renderHistorySuggestions("keterangan")}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Tarif</label>
                  <input type="text" name="type_tarif" value={formData.type_tarif || "FREIGHT BASIC"} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tarif</label>
                  <input type="number" name="tarif" step="0.01" value={formData.tarif ?? ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Biaya (otomatis)</label>
                  <input type="number" name="total_biaya" step="0.01" value={formData.total_biaya || 0} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" readOnly />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">{isEditing ? "Update" : "Simpan"}</button>
                <button type="button" onClick={() => { resetForm(); setShowForm(false); }} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add confirmation ── */}
      {showAddConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Konfirmasi</h3>
            <p className="text-sm text-gray-600 mb-5">Apakah anda ingin menambahkan data?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddConfirm(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Tidak</button>
              <button onClick={confirmAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">Ya</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit confirmation ── */}
      {showEditConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Konfirmasi</h3>
            <p className="text-sm text-gray-600 mb-5">Apakah anda ingin mengedit data ini?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowEditConfirm(false); setPendingEditShipment(null); }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Tidak</button>
              <button onClick={confirmEdit} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition">Ya</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
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

      {/* ── Upload file modal ── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Apakah anda sudah punya templatenya?</h3>
                <p className="mt-1 text-sm text-gray-600">Gunakan template Excel agar format kolom sesuai dengan sistem.</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"><X size={20} /></button>
            </div>
            {uploadMessage && (
              <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${uploadStatus === "error" ? "border-red-200 bg-red-50 text-red-700" : uploadStatus === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}>{uploadMessage}</div>
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

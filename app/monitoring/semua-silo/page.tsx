"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Plus,
  Upload,
  Download,
  X,
  AlertCircle,
  Pencil,
  Trash2,
  Cylinder,
  Gauge,
  Layers,
  Package,
} from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import SemuaSiloTankCard from "@/components/monitoring/SemuaSiloTankCard";
import { SAMPLE_COLUMN, SAMPLE_VALUE, isSampleRow } from "@/lib/excel-sample";
import {
  SEMUA_SILO_GROUPS,
  groupKeyOf,
  groupLabelOf,
  siloNumberOf,
  type SemuaSiloGroupKey,
} from "@/lib/semua-silo";

// ============================================================
// /monitoring/semua-silo — kapasitas & deadstok semua silo/PP
// Sumber data: tabel packing_plant. Hanya role admin.
// ============================================================

interface PackRow {
  id: number | string;
  nama_pp: string;
  kapasitas_pp: number | null;
  deadstok_pp: number | null;
}

interface ParsedRow {
  nama_pp: string;
  kapasitas_pp: number;
  deadstok_pp: number;
}

const num = (value: unknown): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (value: number, digits = 2): string =>
  Number(value).toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });

/** Warna tombol filter (non-aktif) */
const TAB_COLORS = [
  { bg: "bg-blue-50", hoverBg: "hover:bg-blue-100" },
  { bg: "bg-teal-50", hoverBg: "hover:bg-teal-100" },
  { bg: "bg-orange-50", hoverBg: "hover:bg-orange-100" },
  { bg: "bg-purple-50", hoverBg: "hover:bg-purple-100" },
];

export default function SemuaSiloPage() {
  const [rows, setRows] = useState<PackRow[]>([]);
  const [stokByName, setStokByName] = useState<Record<string, number>>({});
  const [tanggalByName, setTanggalByName] = useState<Record<string, string | null>>({});
  const [group, setGroup] = useState<SemuaSiloGroupKey>("cp-tonasa");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Modal
  const [showChoice, setShowChoice] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PackRow | null>(null);

  // Form
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [formData, setFormData] = useState({ nama_pp: "", kapasitas_pp: "", deadstok_pp: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Upload
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [parsing, setParsing] = useState(false);
  const [savingUpload, setSavingUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [samplesSkipped, setSamplesSkipped] = useState(0);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const fetchRows = useCallback(async () => {
    try {
      const res = await fetch("/api/semua-silo", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw new Error(json.message || "Gagal memuat data");
      setRows(json.rows || []);
      setStokByName(json.stok || {});
      setTanggalByName(json.tanggal || {});
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  // Auto-tutup popup upload 3 detik setelah berhasil
  useEffect(() => {
    if (!uploadSuccess) return;
    const timer = setTimeout(() => {
      setShowUpload(false);
      setUploadSuccess("");
      setParsedRows([]);
    }, 3000);
    return () => clearTimeout(timer);
  }, [uploadSuccess]);

  /** Urutan: kelompok (sesuai urutan filter) lalu nomor silo, terakhir nama */
  const sortedRows = useMemo(() => {
    const rankOf = (nama: string) => {
      const key = groupKeyOf(nama);
      const index = SEMUA_SILO_GROUPS.findIndex((g) => g.key === key);
      return index === -1 ? SEMUA_SILO_GROUPS.length : index;
    };

    return [...rows].sort((a, b) => {
      const ra = rankOf(a.nama_pp);
      const rb = rankOf(b.nama_pp);
      if (ra !== rb) return ra - rb;
      const na = siloNumberOf(a.nama_pp);
      const nb = siloNumberOf(b.nama_pp);
      if (na !== null && nb !== null && na !== nb) return na - nb;
      return String(a.nama_pp).localeCompare(String(b.nama_pp), "id");
    });
  }, [rows]);

  /** Baris sesuai filter kelompok yang dipilih */
  const filteredRows = useMemo(
    () => sortedRows.filter((row) => groupKeyOf(row.nama_pp) === group),
    [sortedRows, group]
  );

  /** Subtotal baris terfilter: kapasitas, deadstok, sisa, % deadstok */
  const subtotal = useMemo(() => {
    let kapasitas = 0;
    let deadstok = 0;
    for (const row of filteredRows) {
      kapasitas += num(row.kapasitas_pp);
      deadstok += num(row.deadstok_pp);
    }
    return {
      count: filteredRows.length,
      kapasitas,
      deadstok,
      sisa: kapasitas - deadstok,
      pct: kapasitas > 0 ? (deadstok / kapasitas) * 100 : 0,
    };
  }, [filteredRows]);

  /** Data tabung grafik untuk kelompok terpilih */
  const chartItems = useMemo(
    () =>
      filteredRows.map((row, index) => ({
        key: `${row.nama_pp}-${row.id}`,
        nomor: siloNumberOf(row.nama_pp) ?? index + 1,
        nama: row.nama_pp,
        stok: num(stokByName[row.nama_pp]),
        kapasitas: num(row.kapasitas_pp),
        deadstok: num(row.deadstok_pp),
      })),
    [filteredRows, stokByName]
  );

  /** Tanggal stok terbaru pada kelompok terpilih */
  const latestTanggal = useMemo(() => {
    const dates = filteredRows
      .map((row) => tanggalByName[row.nama_pp])
      .filter((value): value is string => Boolean(value))
      .sort();
    return dates.length > 0 ? dates[dates.length - 1] : null;
  }, [filteredRows, tanggalByName]);

  const totals = useMemo(() => {
    let kapasitas = 0;
    let deadstok = 0;
    let stok = 0;
    for (const row of rows) {
      kapasitas += num(row.kapasitas_pp);
      deadstok += num(row.deadstok_pp);
      stok += num(stokByName[row.nama_pp]);
    }
    return {
      count: rows.length,
      kapasitas,
      deadstok,
      sisa: kapasitas - deadstok,
      stok,
      deadstokPct: kapasitas > 0 ? (deadstok / kapasitas) * 100 : 0,
      stokPct: kapasitas > 0 ? (stok / kapasitas) * 100 : 0,
    };
  }, [rows, stokByName]);

  const openAdd = () => {
    setEditingId(null);
    setFormData({ nama_pp: "", kapasitas_pp: "", deadstok_pp: "" });
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (row: PackRow) => {
    setEditingId(row.id);
    setFormData({
      nama_pp: row.nama_pp ?? "",
      kapasitas_pp: row.kapasitas_pp === null ? "" : String(row.kapasitas_pp),
      deadstok_pp: row.deadstok_pp === null ? "" : String(row.deadstok_pp),
    });
    setFormError("");
    setShowForm(true);
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");

    const nama = formData.nama_pp.trim();
    if (!nama) {
      setFormError("Nama silo / PP wajib diisi.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...(editingId !== null ? { id: editingId } : {}),
        nama_pp: nama,
        kapasitas_pp: num(formData.kapasitas_pp),
        deadstok_pp: num(formData.deadstok_pp),
      };
      const res = await fetch("/api/packing-plant", {
        method: editingId !== null ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw new Error(json.message || "Gagal menyimpan data");
      setShowForm(false);
      setEditingId(null);
      await fetchRows();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/packing-plant", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pendingDelete.id }),
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw new Error(json.message || "Gagal menghapus data");
      setPendingDelete(null);
      await fetchRows();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Terjadi kesalahan");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  // ── Template Excel ──────────────────────────────────────────
  const downloadTemplate = () => {
    const header = ["Nama Silo / PP", "Kapasitas (ton)", "Deadstok (ton)", SAMPLE_COLUMN];
    const sample = ["Silo 21", 5400, 500, SAMPLE_VALUE];
    const sheet = XLSX.utils.aoa_to_sheet([header, sample]);
    sheet["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 10 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Semua Silo");
    XLSX.writeFile(book, "template-semua-silo.xlsx");
  };

  // ── Parse Excel ─────────────────────────────────────────────
  const parseFile = async (file: File) => {
    setParsing(true);
    setUploadError("");
    setUploadSuccess("");
    setParsedRows([]);
    setSamplesSkipped(0);

    try {
      const buffer = await file.arrayBuffer();
      const book = XLSX.read(new Uint8Array(buffer), { type: "array" });
      const sheet = book.Sheets[book.SheetNames[0]];
      if (!sheet) throw new Error("File Excel tidak memiliki sheet.");

      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (raw.length === 0) throw new Error("File Excel masih kosong.");

      const pickKey = (row: Record<string, unknown>, needle: string) =>
        Object.keys(row).find((key) => String(key).toLowerCase().includes(needle));

      const parsed: ParsedRow[] = [];
      const errors: string[] = [];
      let skipped = 0;

      raw.forEach((row, index) => {
        if (isSampleRow(row)) {
          skipped += 1;
          return;
        }

        const nameKey = pickKey(row, "nama");
        const capKey = pickKey(row, "kapasitas");
        const deadKey = pickKey(row, "deadstok") || pickKey(row, "dead_stok");

        const nama = String(nameKey ? row[nameKey] : "").trim();
        if (!nama) return; // baris kosong

        const kapasitas = num(capKey ? String(row[capKey]).replace(",", ".") : 0);
        const deadstok = num(deadKey ? String(row[deadKey]).replace(",", ".") : 0);

        if (!Number.isFinite(kapasitas) || !Number.isFinite(deadstok)) {
          errors.push(`Baris ${index + 2}: kapasitas/deadstok harus angka`);
          return;
        }

        parsed.push({ nama_pp: nama, kapasitas_pp: kapasitas, deadstok_pp: deadstok });
      });

      if (parsed.length === 0) {
        throw new Error(
          errors[0] || "Tidak ada baris valid. Pastikan ada kolom Nama, Kapasitas, dan Deadstok."
        );
      }

      setParsedRows(parsed);
      setSamplesSkipped(skipped);
      if (errors.length > 0) setUploadError(errors.slice(0, 3).join(" • "));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Gagal membaca file Excel");
    } finally {
      setParsing(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await parseFile(file);
  };

  const handleDrop = async (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) await parseFile(file);
  };

  // ── Simpan hasil upload ─────────────────────────────────────
  const saveUpload = async () => {
    if (parsedRows.length === 0) return;
    setSavingUpload(true);
    setUploadError("");

    let added = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    try {
      const existingMap = new Map<string, number | string>();
      rows.forEach((row) => {
        existingMap.set(String(row.nama_pp ?? "").trim().toLowerCase(), row.id);
      });

      for (const item of parsedRows) {
        const key = item.nama_pp.trim().toLowerCase();
        const existingId = existingMap.get(key);
        try {
          const res = await fetch("/api/packing-plant", {
            method: existingId !== undefined ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              existingId !== undefined ? { id: existingId, ...item } : item
            ),
          });
          const json = await res.json();
          if (!res.ok || json.ok === false) throw new Error(json.message || "Gagal menyimpan");
          if (existingId !== undefined) updated += 1;
          else {
            added += 1;
            if (json.data?.id !== undefined) existingMap.set(key, json.data.id);
          }
        } catch (error) {
          skipped += 1;
          errors.push(`${item.nama_pp}: ${error instanceof Error ? error.message : "gagal"}`);
        }
      }

      await fetchRows();
      setParsedRows([]);
      setUploadSuccess(
        `Data berhasil ditambahkan (${added} ditambahkan, ${updated} diupdate, ${skipped} skip${
          samplesSkipped > 0 ? `, ${samplesSkipped} baris contoh di-skip` : ""
        })`
      );
      if (errors.length > 0) setUploadError(errors.slice(0, 3).join(" • "));
    } finally {
      setSavingUpload(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "kelompok",
        header: "Kelompok",
        className: "whitespace-nowrap",
        render: (row: PackRow) => {
          const key = groupKeyOf(row.nama_pp);
          return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">
              {key ? groupLabelOf(key) : "-"}
            </span>
          );
        },
      },
      {
        key: "nama_pp",
        header: "Nama Silo / PP",
        className: "whitespace-nowrap font-medium text-gray-800",
        render: (row: PackRow) => row.nama_pp || "-",
      },
      {
        key: "stok",
        header: "Stok (ton)",
        className: "whitespace-nowrap text-right tabular-nums text-green-700 font-semibold",
        render: (row: PackRow) => fmt(num(stokByName[row.nama_pp])),
      },
      {
        key: "kapasitas_pp",
        header: "Kapasitas (ton)",
        className: "whitespace-nowrap text-right tabular-nums",
        render: (row: PackRow) => fmt(num(row.kapasitas_pp)),
      },
      {
        key: "deadstok_pp",
        header: "Deadstok (ton)",
        className: "whitespace-nowrap text-right tabular-nums",
        render: (row: PackRow) => fmt(num(row.deadstok_pp)),
      },
      {
        key: "deadstok_pct",
        header: "Deadstok %",
        className: "whitespace-nowrap text-right tabular-nums",
        render: (row: PackRow) => {
          const kapasitas = num(row.kapasitas_pp);
          const deadstok = num(row.deadstok_pp);
          return kapasitas > 0 ? `${fmt((deadstok / kapasitas) * 100, 1)}%` : "-";
        },
      },
      {
        key: "sisa",
        header: "Sisa (ton)",
        className: "whitespace-nowrap text-right tabular-nums font-semibold",
        render: (row: PackRow) => {
          const sisa = num(row.kapasitas_pp) - num(row.deadstok_pp);
          return <span className={sisa < 0 ? "text-red-600" : "text-gray-800"}>{fmt(sisa)}</span>;
        },
      },
      {
        key: "aksi",
        header: "Aksi",
        className: "whitespace-nowrap",
        render: (row: PackRow) => (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => openEdit(row)}
              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
              title="Edit"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={() => setPendingDelete(row)}
              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              title="Hapus"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ),
      },
    ],
    [stokByName]
  );

  const cards = [
    {
      label: "Semua Silo",
      value: `${fmt(totals.count)} Silo`,
      percent: null as string | null,
      icon: Cylinder,
      color: "text-blue-600",
      border: "border-l-blue-500",
    },
    {
      label: "Total Kapasitas",
      value: `${fmt(totals.kapasitas)} ton`,
      percent: null,
      icon: Gauge,
      color: "text-indigo-600",
      border: "border-l-emerald-500",
    },
    {
      label: "Total Deadstok",
      value: `${fmt(totals.deadstok)} ton`,
      percent: `${fmt(totals.deadstokPct, 1)} %`,
      icon: Layers,
      color: "text-amber-600",
      border: "border-l-blue-500",
    },
    {
      label: "Total Stok",
      value: `${fmt(totals.stok)} ton`,
      percent: `${fmt(totals.stokPct, 1)} %`,
      icon: Package,
      color: "text-emerald-600",
      border: "border-l-emerald-500",
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-lg md:text-xl font-bold text-gray-800 tracking-tight">
          SEMUA SILO
        </h1>
        <p className="text-xs md:text-sm text-gray-500 mt-1">
          Kapasitas & deadstok seluruh silo dan packing plant (ton)
        </p>
      </div>

      {loadError && (
        <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={16} />
          <span>{loadError}</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`relative overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${card.border} p-4`}
            >
              <Icon size={18} className={card.color} />
              <p className="mt-2 text-xs text-gray-500">{card.label}</p>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p className="text-xl font-bold text-gray-800 whitespace-nowrap">{card.value}</p>
                {card.percent && (
                  <span className="text-xs font-semibold text-gray-500 tabular-nums whitespace-nowrap">
                    {card.percent}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grafik tabung silo kelompok terpilih */}
      <SemuaSiloTankCard
        title={groupLabelOf(group)}
        items={chartItems}
        tanggal={latestTanggal}
      />

      {/* Button group filter kelompok (antara grafik & tabel) */}
      <div className="w-full mb-4 shadow-md shadow-gray-400/50 rounded-xl overflow-hidden">
        <div className="flex flex-wrap">
          {SEMUA_SILO_GROUPS.map((item, i, arr) => {
            const color = TAB_COLORS[i % TAB_COLORS.length];
            const active = group === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setGroup(item.key)}
                className={`flex-1 basis-auto min-w-fit px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-none transition-all text-center leading-tight whitespace-nowrap border ${
                  active
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : `${color.bg} text-gray-700 ${color.hoverBg} border-transparent`
                } ${i === 0 ? "rounded-l-xl" : ""} ${i === arr.length - 1 ? "rounded-r-xl" : ""} ${
                  i !== 0 ? "-ml-px" : ""
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <DataTable
        title="Data Kapasitas Silo"
        columns={columns as any}
        data={filteredRows}
        searchable
        searchPlaceholder="Cari nama silo / PP..."
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs sm:text-sm font-semibold text-gray-700">
              Subtotal {groupLabelOf(group)} &middot; {subtotal.count} data
            </span>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm tabular-nums">
              <span className="text-gray-600">
                Kapasitas:{" "}
                <span className="font-semibold text-gray-800">{fmt(subtotal.kapasitas)} ton</span>
              </span>
              <span className="text-gray-600">
                Deadstok:{" "}
                <span className="font-semibold text-gray-800">{fmt(subtotal.deadstok)} ton</span>{" "}
                <span className="font-semibold text-amber-600">({fmt(subtotal.pct, 1)}%)</span>
              </span>
            </div>
          </div>
        }
        actions={
          <button
            type="button"
            onClick={() => {
              setShowChoice(true);
              setUploadError("");
              setUploadSuccess("");
              setParsedRows([]);
            }}
            className="btn-glow flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
          >
            <Plus size={16} /> Tambah Data
          </button>
        }
      />

      {loading && (
        <p className="text-xs text-gray-400 text-center">Memuat data...</p>
      )}

      {/* Modal pilihan */}
      {showChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-base font-semibold text-gray-800">
                Apakah anda ingin tambah data atau upload data?
              </h2>
              <button
                type="button"
                onClick={() => setShowChoice(false)}
                className="text-gray-400 hover:text-gray-600"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 mt-5">
              <button
                type="button"
                onClick={() => {
                  setShowChoice(false);
                  setShowUpload(true);
                }}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
              >
                <Upload size={16} />
                Upload Data
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowChoice(false);
                  openAdd();
                }}
                className="w-full py-2.5 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal form tambah/edit */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 p-4 md:p-6 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">
                {editingId !== null ? "Edit Data Silo" : "Tambah Data Silo"}
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitForm} className="p-4 md:p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Silo / PP <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nama_pp}
                  onChange={(e) => setFormData({ ...formData, nama_pp: e.target.value })}
                  placeholder="Contoh: Silo 21 atau PP. Palu"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kapasitas (ton)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.kapasitas_pp}
                    onChange={(e) => setFormData({ ...formData, kapasitas_pp: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deadstok (ton)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.deadstok_pp}
                    onChange={(e) => setFormData({ ...formData, deadstok_pp: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Sisa:{" "}
                <span className="font-semibold text-gray-700">
                  {fmt(num(formData.kapasitas_pp) - num(formData.deadstok_pp))} ton
                </span>
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal upload Excel */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 p-4 md:p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Upload Data — Semua Silo</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  File .xlsx (Nama Silo / PP, Kapasitas, Deadstok)
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUpload(false);
                  setParsedRows([]);
                  setUploadError("");
                  setUploadSuccess("");
                }}
                className="text-gray-400 hover:text-gray-600"
                title="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 md:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`sm:col-span-2 flex flex-col items-center justify-center gap-1.5 px-4 py-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                    dragOver
                      ? "border-green-600 bg-green-100"
                      : "border-green-400 bg-green-50/40 hover:border-green-500 hover:bg-green-50"
                  }`}
                >
                  <Upload size={22} className="text-green-600" />
                  <span className="text-sm font-semibold text-gray-800">
                    {parsing ? "Membaca file..." : "Upload data Excel"}
                  </span>
                  <span className="text-xs text-gray-500 text-center">
                    drag & drop file .xlsx ke sini atau klik untuk memilih
                  </span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={parsing || savingUpload}
                  />
                </label>

                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="flex flex-col items-center justify-center gap-1.5 px-4 py-6 border-2 border-red-300 text-red-600 rounded-xl hover:bg-red-50 hover:border-red-400 transition-all"
                >
                  <Download size={20} />
                  <span className="text-sm font-semibold">Template</span>
                  <span className="text-xs text-red-400">download Excel</span>
                </button>
              </div>

              <p className="text-xs text-gray-500 mb-4">
                Baris contoh bertanda &quot;Contoh = YA&quot; otomatis di-skip.
              </p>

              {uploadError && (
                <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
                  <AlertCircle size={16} />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm font-semibold mb-4">
                  {uploadSuccess}
                </div>
              )}

              {parsedRows.length > 0 && (
                <div className="overflow-x-auto border border-gray-100 rounded-xl mb-4">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Nama</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-600">Kapasitas</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-600">Deadstok</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-600">Sisa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsedRows.slice(0, 10).map((row) => (
                        <tr key={row.nama_pp}>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700">{row.nama_pp}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-right tabular-nums">
                            {fmt(row.kapasitas_pp)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right tabular-nums">
                            {fmt(row.deadstok_pp)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right tabular-nums font-semibold">
                            {fmt(row.kapasitas_pp - row.deadstok_pp)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedRows.length > 10 && (
                    <p className="text-xs text-gray-400 px-3 py-2">
                      +{parsedRows.length - 10} baris lainnya
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpload(false);
                    setParsedRows([]);
                    setUploadError("");
                    setUploadSuccess("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={saveUpload}
                  disabled={parsedRows.length === 0 || savingUpload || !!uploadSuccess}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {savingUpload ? "Menyimpan..." : `Simpan ${parsedRows.length} Baris`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Konfirmasi hapus */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-gray-800">Hapus data ini?</h2>
            <p className="text-sm text-gray-500 mt-2">
              <span className="font-semibold text-gray-700">{pendingDelete.nama_pp}</span> akan
              dihapus permanen.
            </p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-60"
              >
                {deleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Edit2, X, AlertCircle, Download, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getPermissions, canEditMonitoringPage } from "@/lib/access";
import DataTable from "@/components/ui/DataTable";
import SiloTankChart from "@/components/monitoring/SiloTankChart";
import ExpediturSummaryCards from "@/components/monitoring/ExpediturSummaryCards";
import GroupedSummaryCards from "@/components/monitoring/GroupedSummaryCards";
import LineChart from "@/components/monitoring/LineChart";
import {
  formatMonitoringNumber,
  formatTanggalPanjang,
  isTotalField,
  monitoringFieldValue,
  type MonitoringField,
  type MonitoringTableConfig,
} from "@/lib/monitoring-config";
import {
  downloadTemplate,
  parseTemplateFile,
  todayISO,
  type ParsedRow,
} from "@/lib/monitoring-excel";

type Row = Record<string, any>;
type FormData = Record<string, string>;

const WRITE_ROLES = ["admin", "asisten_admin", "supervisor", "operator"];
const BULAN_SINGKAT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export default function MonitoringPage({ config }: { config: MonitoringTableConfig }) {
  const { user } = useAuth();
  // Role read-only (GM/SM/Manager/Guest) tidak mendapat aksi apa pun.
  // Supervisor & Operator hanya untuk tabel unitnya.
  const perms = getPermissions(user);
  const canEdit = canEditMonitoringPage(perms, config.slug);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Alur Tambah / Upload
  const [showChoice, setShowChoice] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadParsing, setUploadParsing] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ rows: ParsedRow[]; errors: string[]; samplesSkipped?: number } | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState("");

  /** Data grafik garis (tren harian) — dihitung dari config.lineCharts */
  const lineChartData = useMemo(() => {
    const charts = config.lineCharts ?? [];
    if (charts.length === 0) return [];

    const fieldByKey = new Map(config.fields.map((f) => [f.key, f]));
    const asc = [...rows]
      .filter((r) => r.tanggal)
      .sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)));
    const labels = asc.map((r) => {
      const [, m, d] = String(r.tanggal).split("-");
      return d ? `${Number(d)} ${BULAN_SINGKAT[Number(m) - 1] ?? m}` : String(r.tanggal);
    });

    return charts.map((c) => ({
      title: c.title,
      labels,
      series: c.series.map((sr) => ({
        label: sr.label,
        color: sr.color,
        values: asc.map((r) =>
          sr.fieldKeys.reduce((sum, key) => {
            const f = fieldByKey.get(key);
            return sum + (f ? monitoringFieldValue(r, f) : Number(r[key] ?? 0));
          }, 0)
        ),
      })),
    }));
  }, [config, rows]);

  /** Grafik yang seluruh nilainya 0 disembunyikan (tanpa menyisakan ruang kosong) */
  const visibleLineCharts = useMemo(() => {
    return lineChartData
      .map((c) => ({ ...c, series: c.series.filter((s) => s.values.some((v) => v !== 0)) }))
      .filter((c) => c.series.length > 0);
  }, [lineChartData]);
  const [uploadError, setUploadError] = useState("");
  const [savingUpload, setSavingUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Kolom isian: bukan generated database, bukan kolom virtual (dihitung UI)
  const editableFields = useMemo(
    () => config.fields.filter((f) => !f.generated && !f.virtual),
    [config]
  );
  const formGroups = useMemo(() => {
    const groups: Record<string, MonitoringField[]> = {};
    for (const f of editableFields) {
      const g = f.group || "Data Harian";
      (groups[g] = groups[g] || []).push(f);
    }
    return Object.entries(groups);
  }, [editableFields]);

  const emptyForm = (): FormData => {
    const base: FormData = { tanggal: todayISO() };
    for (const f of editableFields) base[f.key] = "";
    return base;
  };
  const [formData, setFormData] = useState<FormData>(emptyForm());

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.table]);

  const api = (table: string) => `/api/monitoring/${table}`;

  async function fetchRows() {
    setLoading(true);
    try {
      const res = await fetch(api(config.table));
      const data = await res.json();
      if (data.ok) setRows(data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormError("");
    setFormData(emptyForm());
  };

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const openAdd = () => {
    resetForm();
    setShowForm(true);
  };

  // ── Alur Tambah / Upload ──

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset agar file sama bisa dipilih ulang
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    setUploadError("");
    setUploadResult(null);
    setUploadParsing(true);
    try {
      if (!file.name.toLowerCase().endsWith(".xlsx")) {
        throw new Error("File harus format .xlsx (gunakan template yang diunduh).");
      }
      const result = await parseTemplateFile(file, config);

      // Cek duplikat terhadap database:
      // - uniquePerDate: tanggal sama = duplikat
      // - uniqueBy: tanggal + field sama = duplikat (mis. expeditur)
      const isDup = (r: ParsedRow) => {
        const dbRow = rows.find((db) => (db.tanggal || "").slice(0, 10) === r.tanggal);
        if (!dbRow) return false;
        if (config.uniquePerDate) return true;
        if (!config.uniqueBy) return false;
        return (
          String(dbRow[config.uniqueBy] || "").trim().toLowerCase() ===
          String(r.values[config.uniqueBy] || "").trim().toLowerCase()
        );
      };
      const dupErrors = result.rows
        .filter(isDup)
        .map((r) => {
          const extra = config.uniquePerDate
            ? ""
            : ` untuk "${r.values[config.uniqueBy!]}"`;
          return `Tanggal ${formatTanggalPanjang(r.tanggal)}${extra} sudah ada di database — hapus baris tersebut atau gunakan Edit.`;
        });

      setUploadResult({ rows: result.rows, errors: [...result.errors, ...dupErrors], samplesSkipped: result.samplesSkipped });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Gagal membaca file");
    } finally {
      setUploadParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (uploadParsing || savingUpload) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const saveUpload = async () => {
    if (!uploadResult || uploadResult.errors.length > 0 || uploadResult.rows.length === 0) return;
    setSavingUpload(true);
    setUploadError("");
    try {
      for (const row of uploadResult.rows) {
        const res = await fetch(api(config.table), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tanggal: row.tanggal, ...row.values }),
        });
        const data = await res.json();
        if (!res.ok || data.ok === false) {
          throw new Error(data.message || `Gagal menyimpan data tanggal ${row.tanggal}`);
        }
      }
      const sampleInfo = uploadResult.samplesSkipped
        ? `, ${uploadResult.samplesSkipped} baris contoh di-skip`
        : "";
      setUploadSuccess(
        `Data berhasil ditambahkan (${uploadResult.rows.length} ditambahkan${sampleInfo})`
      );
      setUploadResult(null);
      setUploadError("");
      await fetchRows();
      window.setTimeout(() => {
        setShowUpload(false);
        setUploadSuccess("");
      }, 3000);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan");
    } finally {
      setSavingUpload(false);
    }
  };

  const openEdit = (row: Row) => {
    const next: FormData = { tanggal: (row.tanggal || "").slice(0, 10) };
    for (const f of editableFields) {
      const v = row[f.key];
      next[f.key] = v === null || v === undefined ? "" : f.type === "number" ? String(v) : String(v);
    }
    setIsEditing(true);
    setEditingId(row.id);
    setFormError("");
    setFormData(next);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formData.tanggal) {
      setFormError("Tanggal wajib diisi");
      return;
    }
    for (const f of editableFields) {
      if (f.required && !String(formData[f.key] || "").trim()) {
        setFormError(`${f.label} wajib diisi`);
        return;
      }
    }

    // Guard duplikat (juga divalidasi di API):
    // - uniquePerDate: 1 baris per tanggal
    // - uniqueBy: kombinasi tanggal + field (mis. expeditur)
    if (config.uniquePerDate || config.uniqueBy) {
      const dup = rows.some((r) => {
        if (isEditing && r.id === editingId) return false; // baris yang diedit dikecualikan
        if ((r.tanggal || "").slice(0, 10) !== formData.tanggal) return false;
        if (config.uniquePerDate) return true;
        return (
          String(r[config.uniqueBy!] || "").trim().toLowerCase() ===
          String(formData[config.uniqueBy!] || "").trim().toLowerCase()
        );
      });
      if (dup) {
        const extra = config.uniquePerDate
          ? ""
          : ` untuk "${formData[config.uniqueBy!]}"`;
        setFormError(
          `Data tanggal ${formatTanggalPanjang(formData.tanggal)}${extra} sudah ada. Gunakan Edit untuk mengubah.`
        );
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch(api(config.table), {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditing ? { id: editingId, ...formData } : formData),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.message || "Gagal menyimpan data");
      }
      resetForm();
      setShowForm(false);
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
      const res = await fetch(api(config.table), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pendingDelete.id }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.message || "Gagal hapus data");
      setPendingDelete(null);
      await fetchRows();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setDeleting(false);
    }
  };

  const fieldGroups = useMemo(() => {
    const prefix = config.chart?.columnPrefix || "stok_silo";
    const map: Record<string, string> = {};
    config.tableGroups?.forEach((g) => {
      g.columns.forEach((n) => {
        map[`${prefix}${n}`] = g.label;
      });
    });
    return map;
  }, [config]);

  // Tabel dengan sub-grup header memakai field.group sebagai grup baris atas
  const useFieldGroups = useMemo(
    () => config.fields.some((f) => !!f.subGroup),
    [config]
  );

  const columns = useMemo(
    () => [
      {
        key: "tanggal",
        header: "Tanggal",
        render: (r: Row) => <span className="font-semibold text-gray-800">{formatTanggalPanjang(r.tanggal)}</span>,
      },
      ...config.fields.map((f) => ({
        key: f.key,
        header: f.shortLabel || f.label,
        group: fieldGroups[f.key] ?? (useFieldGroups ? f.group : undefined),
        subGroup: useFieldGroups ? f.subGroup : undefined,
        className: f.type === "number" ? "text-right" : "text-left",
        render: (r: Row) =>
          f.type === "number" ? (
            <span
              className={
                isTotalField(f)
                  ? "font-bold text-gray-900 tabular-nums"
                  : f.generated || f.virtual
                    ? "text-gray-500 italic tabular-nums"
                    : "tabular-nums"
              }
            >
              {formatMonitoringNumber(
                f.virtual ? monitoringFieldValue(r, f) : r[f.key],
                f.integer
              )}
            </span>
          ) : (
            <span className="font-medium text-gray-900">{r[f.key] || "-"}</span>
          ),
      })),
      ...(canEdit
        ? [
            {
              key: "_aksi",
              header: "Aksi",
              className: "text-right",
              render: (r: Row) => (
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => openEdit(r)}
                    className="inline-flex items-center justify-center w-7 h-7 rounded text-xs transition-colors bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white border border-amber-100"
                    title="Edit"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => setPendingDelete(r)}
                    className="inline-flex items-center justify-center w-7 h-7 rounded text-xs transition-colors bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-100"
                    title="Hapus"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ),
            },
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, canEdit, rows, fieldGroups]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-500">Memuat data {config.title}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {config.heading ?? config.title}
          </h1>
          {(config.pageSubtitle ?? config.subtitle) && (
            <p className="text-sm text-gray-500 mt-0.5">
              {config.pageSubtitle ?? config.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Form modal (tambah/edit) */}
      {canEdit && showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 p-4 md:p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  {isEditing ? "Edit Data" : "Tambah Data"} — {config.title}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{config.subtitle}</p>
              </div>
              <button type="button" onClick={() => { resetForm(); setShowForm(false); }} className="text-gray-400 hover:text-gray-600" title="Tutup">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 md:p-6">
              {formError && (
                <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm mb-5">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Tanggal */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tanggal</label>
                  <input
                    type="date"
                    value={formData.tanggal || ""}
                    onChange={(e) => handleChange("tanggal", e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {/* Kolom dikelompokkan */}
              {formGroups.map(([group, fields]) => (
                <div key={group} className="mb-5">
                  {fields[0].group && (
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">{group}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {fields.map((f) => (
                      <div key={f.key}>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          {f.label}
                          {f.generated && <span className="ml-1 text-[10px] font-medium text-blue-500">(otomatis)</span>}
                        </label>
                        <input
                          type={f.type === "number" ? "number" : "text"}
                          step={f.type === "number" ? (f.integer ? "1" : "0.01") : undefined}
                          value={formData[f.key] || ""}
                          onChange={(e) => handleChange(f.key, e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                          required={f.required}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex gap-3 mt-5">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : isEditing ? "Update" : "Simpan"}
                </button>
                <button
                  type="button"
                  onClick={() => { resetForm(); setShowForm(false); }}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grafik tabung silo (khusus silo_semen): baris tanggal terbaru */}
      {config.chart && rows.length > 0 && (
        <SiloTankChart
          latest={rows[0]}
          groups={config.chart.groups}
          groupNames={config.chart.groupNames}
          columnPrefix={config.chart.columnPrefix}
          scaleHeight={config.chart.scaleHeight}
        />
      )}

      {/* Ringkasan per expeditur (khusus angkutan darat) */}
      {config.table === "angkutan_darat" && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
              Ringkasan Expeditur — MTD & Harian
            </h2>
          </div>
          <ExpediturSummaryCards />
        </div>
      )}

      {/* Ringkasan grid card dari data tabel (mis. CP Tonasa: OPC & PCC) */}
      {config.groupedSummary && rows.length > 0 && (
        <GroupedSummaryCards config={config} rows={rows} />
      )}

      {/* Grafik garis tren harian (mis. PP: OPC, PCC, Rilis OPC, Rilis PCC) */}
      {visibleLineCharts.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
              Grafik Tren Harian
            </h2>
            <span className="text-[11px] font-medium text-gray-500">
              {visibleLineCharts[0].labels.length} hari data
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {visibleLineCharts.map((c) => (
              <LineChart key={c.title} title={c.title} labels={c.labels} series={c.series} />
            ))}
          </div>
        </div>
      )}

      {/* Tabel data */}
      <DataTable
        title={`Data ${config.title}`}
        columns={columns as any}
        data={rows}
        searchable
        searchPlaceholder="Cari tanggal / data..."
        actions={
          canEdit ? (
            <button
              onClick={() => setShowChoice(true)}
              className="btn-glow flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
            >
              <Plus size={16} /> Tambah Data
            </button>
          ) : undefined
        }
      />

      {/* Modal pilihan: Tambah manual atau Upload */}
      {canEdit && showChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-base font-semibold text-gray-800">
                Apakah anda ingin tambah data atau upload data?
              </h2>
              <button type="button" onClick={() => setShowChoice(false)} className="text-gray-400 hover:text-gray-600" title="Tutup">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 mt-5">
              <button
                onClick={() => { setShowChoice(false); setUploadResult(null); setUploadError(""); setUploadSuccess(""); setShowUpload(true); }}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
              >
                <Upload size={16} />
                Upload Data
              </button>
              <button
                onClick={() => { setShowChoice(false); openAdd(); }}
                className="w-full py-2.5 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal upload Excel */}
      {canEdit && showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 p-4 md:p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Upload Data — {config.title}</h2>
                <p className="text-xs text-gray-400 mt-0.5">File .xlsx sesuai template (1 baris, 1 tanggal)</p>
              </div>
              <button type="button" onClick={() => { setShowUpload(false); setUploadResult(null); setUploadError(""); }} className="text-gray-400 hover:text-gray-600" title="Tutup">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 md:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {/* Dropzone upload (hijau): drag & drop atau klik */}
                <label
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
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
                    {uploadParsing ? "Membaca file..." : "Upload data Excel"}
                  </span>
                  <span className="text-xs text-gray-500 text-center">
                    drag & drop file .xlsx ke sini atau klik untuk memilih
                  </span>
                  <input type="file" accept=".xlsx" onChange={handleFile} className="hidden" disabled={uploadParsing || savingUpload} />
                </label>

                {/* Tombol template (merah) */}
                <button
                  onClick={() => downloadTemplate(config)}
                  className="flex flex-col items-center justify-center gap-1.5 px-4 py-6 border-2 border-red-300 text-red-600 rounded-xl hover:bg-red-50 hover:border-red-400 transition-all"
                >
                  <Download size={20} />
                  <span className="text-sm font-semibold">Template</span>
                  <span className="text-xs text-red-400">download Excel</span>
                </button>
              </div>

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

              {uploadResult && (
                <div>
                  {uploadResult.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
                      <p className="font-semibold mb-1">File tidak bisa disimpan — perbaiki:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-xs">
                        {uploadResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </div>
                  )}

                  {uploadResult.samplesSkipped ? (
                    <p className="text-xs text-amber-600 mb-3">
                      {uploadResult.samplesSkipped} baris contoh dari template otomatis di-skip.
                    </p>
                  ) : null}

                  {uploadResult.rows.length > 0 && (
                    <>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Preview — {uploadResult.rows.length} baris siap disimpan
                      </p>
                      <div className="overflow-x-auto border border-gray-100 rounded-lg mb-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-200 border-b-2 border-gray-400">
                              <th className="px-3 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wider whitespace-nowrap">Tanggal</th>
                              {editableFields.map((f) => (
                                <th key={f.key} className={`px-3 py-2 text-xs font-bold text-gray-800 uppercase tracking-wider whitespace-nowrap ${f.type === "number" ? "text-right" : "text-left"}`}>
                                  {f.shortLabel || f.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {uploadResult.rows.map((r, i) => (
                              <tr key={i} className="border-t border-gray-100">
                                <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">{formatTanggalPanjang(r.tanggal)}</td>
                                {editableFields.map((f) => (
                                  <td key={f.key} className={`px-3 py-2 whitespace-nowrap ${f.type === "number" ? "text-right tabular-nums text-gray-700" : "text-gray-900"}`}>
                                    {f.type === "number" ? formatMonitoringNumber(r.values[f.key] as number, f.integer) : (r.values[f.key] as string) || "-"}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={saveUpload}
                      disabled={uploadResult.errors.length > 0 || uploadResult.rows.length === 0 || savingUpload}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingUpload ? "Menyimpan..." : `Simpan ${uploadResult.rows.length} Baris`}
                    </button>
                    <button
                      onClick={() => { setShowUpload(false); setUploadResult(null); setUploadError(""); }}
                      className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Konfirmasi hapus */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 flex-shrink-0">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Hapus data?</h3>
                <p className="text-xs text-gray-500">
                  Data tanggal {formatTanggalPanjang(pendingDelete.tanggal)} akan dihapus permanen.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 transition-colors disabled:opacity-60"
              >
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
              <button
                onClick={() => setPendingDelete(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

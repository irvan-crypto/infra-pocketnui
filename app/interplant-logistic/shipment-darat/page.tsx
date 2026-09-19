"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Plus, X, Download } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import { formatDateIndonesian } from "@/lib/utils";
import * as XLSX from "xlsx";

interface ShipmentDarat {
 id: string;
 tanggal: string;
 nama_material: string;
 muatan: number;
 retase: string | null;
 armada: string;
 tarif: number;
 biaya: number;
 created_date: string;
 update_date: string;
}

export default function ShipmentDaratPage() {
 const { user } = useAuth();
 const router = useRouter();
 const [shipments, setShipments] = useState<ShipmentDarat[]>([]);
 const [loading, setLoading] = useState(true);
 const [showForm, setShowForm] = useState(false);
 const [isEditing, setIsEditing] = useState(false);
 const [materialFilter, setMaterialFilter] = useState<string | null>(null);
 const [showUploadModal, setShowUploadModal] = useState(false);
 const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
 const [uploadMessage, setUploadMessage] = useState("");
 const fileInputRef = useRef<HTMLInputElement>(null);
 const [formData, setFormData] = useState({ tanggal: "", nama_material: "", muatan: "", retase: "", armada: "", tarif: "", biaya: "" });

 useEffect(() => {
 if (!user) { router.push("/"); return; }
 fetchShipments();
 }, [user, router]);

 const fetchShipments = async () => {
 setLoading(true);
 try { const res = await fetch("/api/shipments_darat"); const data = await res.json(); if (data.ok) setShipments(data.data); }
 catch (e) { console.error(e); }
 finally { setLoading(false); }
 };

 const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
 const { name, value } = e.target;
 setFormData(prev => ({ ...prev, [name]: value }));
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 try {
 const res = await fetch("/api/shipments_darat", {
 method: isEditing ? "PUT" : "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ ...formData, muatan: Number(formData.muatan || 0), tarif: Number(formData.tarif || 0), biaya: Number(formData.biaya || 0) }),
 });
 const data = await res.json();
 if (data.ok) { fetchShipments(); setShowForm(false); }
 else { alert(data.message || "Gagal menyimpan data"); }
 } catch { alert("Terjadi kesalahan"); }
 };

 const canEdit = user?.role === "admin" || user?.role === "operator";
 const shipmentDaratUploadHeaders = ["tanggal", "nama_material", "muatan", "retase", "armada", "tarif", "biaya"];

 const normalizeUploadRow = (row: Record<string, unknown>) => {
 const getString = (key: string) => row[key] == null ? "" : String(row[key]).trim();
 const getNumber = (key: string) => { const raw = getString(key).replace(/,/g, "."); const n = Number(raw); return Number.isFinite(n) ? n : 0; };
 const toTwoDigits = (value: number) => String(value).padStart(2, "0");
 const normalizeDate = (key: string) => {
 const raw = row[key]; const text = getString(key);
 if (!text) return "";
 if (typeof raw === "number" && Number.isFinite(raw)) { const parsed = XLSX.SSF.parse_date_code(raw); if (parsed) return parsed.y + "-" + toTwoDigits(parsed.m) + "-" + toTwoDigits(parsed.d); }
 if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
 const match = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
 if (match) { const [, d, m, y] = match; return y + "-" + toTwoDigits(Number(m)) + "-" + toTwoDigits(Number(d)); }
 return text;
 };
 return { tanggal: normalizeDate("tanggal"), nama_material: getString("nama_material"), muatan: getNumber("muatan"), retase: getString("retase") || null, armada: getString("armada"), tarif: getNumber("tarif"), biaya: getNumber("biaya") };
 };

 const downloadTemplate = () => {
 const ws = XLSX.utils.json_to_sheet([Object.fromEntries(shipmentDaratUploadHeaders.map((h) => [h, ""]))], { header: shipmentDaratUploadHeaders });
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, "Template Shipment Darat");
 XLSX.writeFile(wb, "template-shipment-darat.xlsx");
 };

 const handleUploadClick = () => { setUploadStatus("idle"); setUploadMessage(""); fileInputRef.current?.click(); };

 const createShipmentDaratDuplicateKey = (shipment: Partial<ShipmentDarat> | Record<string, string | number | null>) => {
 const normalizeValue = (key: string, value: unknown) => {
 if (value == null || value === "") return "";
 if (key === "muatan" || key === "tarif" || key === "biaya") { const nv = Number(String(value).replace(/,/g, ".")); return Number.isFinite(nv) ? String(nv) : "0"; }
 return String(value).trim().toLowerCase();
 };
 return shipmentDaratUploadHeaders.map((key) => `${key}:${normalizeValue(key, shipment[key as keyof typeof shipment])}`).join("|");
 };

 const processUploadedFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file) return;
 setUploadStatus("uploading"); setUploadMessage("Memproses file...");
 try {
 const buffer = await file.arrayBuffer();
 const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
 const sheet = workbook.Sheets[workbook.SheetNames[0]];
 const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
 if (rows.length === 0) throw new Error("File tidak memiliki data.");
 let successCount = 0, skippedCount = 0;
 const existingKeys = new Set(shipments.map((s) => createShipmentDaratDuplicateKey(s)));
 for (const row of rows) {
 const payload = normalizeUploadRow(row);
 if (!payload.nama_material) continue;
 const duplicateKey = createShipmentDaratDuplicateKey(payload);
 if (existingKeys.has(duplicateKey)) { skippedCount += 1; continue; }
 const res = await fetch("/api/shipments_darat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
 const data = await res.json().catch();
 if (!res.ok || (data.ok === false)) { throw new Error(data.message || data.error || "Gagal upload salah satu baris data."); }
 existingKeys.add(duplicateKey); successCount += 1;
 }
 await fetchShipments(); setUploadStatus("success"); setUploadMessage(`Upload selesai. ${successCount} data berhasil disimpan, ${skippedCount} data duplikat di-skip.`);
 event.target.value = "";
 } catch (error) { console.error(error); setUploadStatus("error"); setUploadMessage(error instanceof Error ? error.message : "Upload gagal."); }
 };

 const uniqueMaterials = useMemo(() => Array.from(new Set(shipments.map(s => s.nama_material))).sort(), [shipments]);
 const materialCounts = useMemo(() => { const c: Record<string, number> = {}; uniqueMaterials.forEach(m => c[m] = 0); shipments.forEach(s => { if (c[s.nama_material] !== undefined) c[s.nama_material]++; }); return c; }, [shipments, uniqueMaterials]);
 const materialTotals = useMemo(() => {
 const map = new Map<string, { muatan: number; count: number }>();
 uniqueMaterials.forEach(m => map.set(m, { muatan: 0, count: 0 }));
 shipments.forEach(s => {
 const cur = map.get(s.nama_material) || { muatan: 0, count: 0 };
 cur.muatan += s.muatan || 0;
 cur.count += 1;
 map.set(s.nama_material, cur);
 });
 return map;
 }, [shipments, uniqueMaterials]);

 const stats = useMemo(() => ({ count: shipments.length, totalMuatan: shipments.reduce((s, o) => s + (o.muatan || 0), 0), totalBiaya: shipments.reduce((s, o) => s + (o.biaya || 0), 0), uniqueMaterials: uniqueMaterials.length, materialCounts }), [shipments, materialCounts]);
 const displayShipments = useMemo(() => materialFilter ? shipments.filter(s => s.nama_material === materialFilter) : shipments, [shipments, materialFilter]);

 const columns = [
 { key: "tanggal", header: "Tanggal", className: "text-left", render: (s: ShipmentDarat) => formatDateIndonesian(s.tanggal) },
 { key: "nama_material", header: "Nama Material", render: (s: ShipmentDarat) => <span className="font-medium">{s.nama_material}</span> },
 { key: "muatan", header: "Muatan", className: "text-right", render: (s: ShipmentDarat) => s.muatan.toLocaleString("id-ID") + " ton" },
 { key: "retase", header: "Retase", render: (s: ShipmentDarat) => <span className={s.retase ? "text-green-600" : "text-gray-400"}>{s.retase || "-"}</span> },
 { key: "armada", header: "Armada", render: (s: ShipmentDarat) => <span className="font-medium text-blue-600">{s.armada}</span> },
 { key: "tarif", header: "Tarif", className: "text-right", render: (s: ShipmentDarat) => "Rp " + s.tarif.toLocaleString("id-ID") },
 { key: "biaya", header: "Biaya", className: "text-right", render: (s: ShipmentDarat) => <span className="font-bold text-green-600">Rp {s.biaya.toLocaleString("id-ID")}</span> },
 ];

 if (loading) { return <div className="flex items-center justify-center h-96"><div className="flex flex-col items-center gap-3"><div className="w-8 h-8 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /><p className="text-sm text-gray-500">Memuat data shipment darat...</p></div></div>; }

 return (
 <div className="w-full flex flex-col gap-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div><h1 className="text-2xl font-bold text-gray-900">Shipment Darat</h1><p className="text-xs text-gray-500 mt-1">Data shipment darat antar pelabuhan dan packing plant</p></div>
 <div className="flex items-center gap-2">{canEdit && (<>
 <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl"><Download size={16} />Upload File</button>
 <button onClick={() => { setIsEditing(false); setShowForm(true); }} className="btn-glow flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl"><Plus size={16} />Tambah Data</button>
 </>)}</div>
 </div>

 {/* Stat Cards */}
 <div className="grid gap-4 sm:grid-cols-4">
 <div className="card p-4 flex items-center gap-3 border-l-4 border-l-blue-500"><div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 text-blue-600"><FileText size={20} /></div><div><p className="text-xs text-gray-500 font-medium">Total Shipment</p><p className="text-lg font-bold text-gray-900">{stats.count}</p></div></div>
 <div className="card p-4 flex items-center gap-3 border-l-4 border-l-emerald-500"><div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-600"><FileText size={20} /></div><div><p className="text-xs text-gray-500 font-medium">Total Muatan</p><p className="text-lg font-bold text-gray-900">{stats.totalMuatan.toLocaleString("id-ID")} ton</p></div></div>
 <div className="card p-4 flex items-center gap-3 border-l-4 border-l-amber-500"><div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 text-amber-600"><FileText size={20} /></div><div><p className="text-xs text-gray-500 font-medium">Material Unique</p><p className="text-lg font-bold text-gray-900">{stats.uniqueMaterials}</p></div></div>
 <div className="card p-4 flex items-center gap-3 border-l-4 border-l-purple-500"><div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 text-purple-600"><FileText size={20} /></div><div><p className="text-xs text-gray-500 font-medium">Total Biaya</p><p className="text-lg font-bold text-gray-900">Rp {stats.totalBiaya.toLocaleString("id-ID")}</p></div></div>
 </div>

 {/* Material Filter Button Group */}
 {uniqueMaterials.length > 0 && (
 <div className="grid md:flex rounded-xl overflow-hidden border border-gray-200 divide-x divide-y md:divide-y-0 divide-gray-200 [&>*:nth-child(n+4)]:border-t [&>*:nth-child(n+4)]:border-gray-200 md:[&>*:nth-child(n+4)]:border-t-0 grid-cols-3">
 <button type="button" onClick={() => setMaterialFilter(null)} className={materialFilter === null ? "flex-1 inline-flex items-center justify-center gap-1.5 px-2 md:px-3.5 py-2 text-[11px] md:text-xs font-medium bg-blue-600 text-white" : "flex-1 inline-flex items-center justify-center gap-1.5 px-2 md:px-3.5 py-2 text-[11px] md:text-xs font-medium bg-white text-gray-600 hover:bg-gray-50"}>
 <FileText className="w-3.5 h-3.5 shrink-0 opacity-60" strokeWidth={1.5} /><span className="truncate">Semua</span>
 </button>
 {uniqueMaterials.map((material) => { const count = stats.materialCounts[material] || 0; if (count === 0) return null;
 return <button key={material} type="button" onClick={() => setMaterialFilter(material)} className={materialFilter === material ? "flex-1 inline-flex items-center justify-center gap-1.5 px-2 md:px-3.5 py-2 text-[11px] md:text-xs font-medium bg-blue-600 text-white" : "flex-1 inline-flex items-center justify-center gap-1.5 px-2 md:px-3.5 py-2 text-[11px] md:text-xs font-medium bg-white text-gray-600 hover:bg-gray-50"}>
 <FileText className="w-3.5 h-3.5 shrink-0 opacity-60" strokeWidth={1.5} /><span className="truncate">{material}</span>
 </button>;
 })}
 </div>
 )}

 {/* Data Table */}
 <DataTable title="Data Shipment Darat" columns={columns} data={displayShipments} searchable searchPlaceholder="Cari material, armada..." getRowClass={(s: ShipmentDarat) => "hover:bg-gray-50 transition-colors"} />

 {/* Rekapitulasi per Material - Similar to shipment-laut */}
 <div className="card">
 <div className="card-header">
 <h3 className="text-base font-semibold text-gray-900">Rekapitulasi per Material</h3>
 <p className="text-xs text-gray-500">Total muatan & jumlah shipment per material</p>
 </div>
 <div className="card-body p-0 overflow-x-auto">
 <table className="w-full text-sm">
 <thead><tr className="bg-gray-50 border-b border-gray-200">
 <th className="text-left px-4 py-3 font-medium text-gray-600">Material</th>
 <th className="text-right px-4 py-3 font-medium text-gray-600">Total Muatan (ton)</th>
 <th className="text-right px-4 py-3 font-medium text-gray-600">Jumlah Shipment</th>
 </tr></thead>
 <tbody>
 {Array.from(materialTotals.entries()).map(([material, total]) => (
 <tr key={material} className="border-b border-gray-100 last:border-b-0">
 <td className="px-4 py-3 font-medium text-gray-900">{material}</td>
 <td className="px-4 py-3 text-right text-gray-700">{total.muatan.toLocaleString("id-ID")}</td>
 <td className="px-4 py-3 text-right text-gray-700">{total.count}</td>
 </tr>
 ))}
 </tbody>
 <tfoot><tr className="bg-gray-50 border-t border-gray-200 font-semibold">
 <td className="px-4 py-3 text-gray-900">Total</td>
 <td className="px-4 py-3 text-right text-gray-900">{Array.from(materialTotals.values()).reduce((sum, t) => sum + t.muatan, 0).toLocaleString("id-ID")}</td>
 <td className="px-4 py-3 text-right text-gray-900">{Array.from(materialTotals.values()).reduce((sum, t) => sum + t.count, 0)}</td>
 </tr></tfoot>
 </table>
 </div>
 </div>

 {/* Form Modal */}
 {showForm && (
 <div className="fixed inset-0 z-50 flex items-center justify-center">
 <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
 <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
 <form onSubmit={handleSubmit} className="p-6 space-y-4">
 <h3 className="text-lg font-semibold text-gray-900">{isEditing ? "Edit Shipment Darat" : "Tambah Shipment Darat"}</h3>
 <div className="grid gap-4">
 <div><label className="text-xs font-medium text-gray-500">Tanggal</label><input type="date" name="tanggal" value={formData.tanggal} onChange={handleChange} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></div>
 <div><label className="text-xs font-medium text-gray-500">Nama Material</label><input type="text" name="nama_material" value={formData.nama_material} onChange={handleChange} required className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></div>
 <div><label className="text-xs font-medium text-gray-500">Muatan (ton)</label><input type="number" name="muatan" value={formData.muatan} onChange={handleChange} step="0.01" required className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></div>
 <div><label className="text-xs font-medium text-gray-500">Retase (optional)</label><input type="text" name="retase" value={formData.retase || ""} onChange={handleChange} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></div>
 <div><label className="text-xs font-medium text-gray-500">Armada</label><input type="text" name="armada" value={formData.armada} onChange={handleChange} required className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></div>
 <div><label className="text-xs font-medium text-gray-500">Tarif (Rp)</label><input type="number" name="tarif" value={formData.tarif} onChange={handleChange} step="0.01" required className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></div>
 <div><label className="text-xs font-medium text-gray-500">Biaya (Rp)</label><input type="number" name="biaya" value={formData.biaya} onChange={handleChange} step="0.01" required className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></div>
 </div>
 <div className="flex items-center justify-end gap-3 pt-2">
 <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 hover:bg-gray-200">Batal</button>
 <button type="submit" className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">{isEditing ? "Simpan" : "Tambah"}</button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* Upload Modal */}
 {showUploadModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center">
 <div className="absolute inset-0 bg-black/40" onClick={() => setShowUploadModal(false)} />
 <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Data Shipment Darat</h3>
 <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv" onChange={processUploadedFile} className="hidden" />
 <div className="space-y-4">
 <button onClick={downloadTemplate} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
 <Download size={16} />Download Template Excel</button>
 <button onClick={handleUploadClick} className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-emerald-600 text-emerald-600 rounded-xl hover:bg-emerald-50">
 Pilih File Excel</button>
 </div>
 {uploadStatus !== "idle" && (
 <div className={`p-3 rounded-xl text-sm ${uploadStatus === "success" ? "bg-emerald-50 text-emerald-700" : uploadStatus === "error" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>{uploadMessage}</div>
 )}
 <div className="flex justify-end">
 <button type="button" onClick={() => setShowUploadModal(false)} className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 hover:bg-gray-200">Tutup</button>
 </div>
 </div>
 </div>
 )}

 {/* Delete Dialog */}
 {showForm && isEditing && (
 <div className="fixed inset-0 z-50 flex items-center justify-center">
 <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
 <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-2">Yakin hapus data ini?</h3>
 <p className="text-sm text-gray-500 mb-4">Data yang sudah dihapus tidak dapat dikembalikan.</p>
 <div className="flex justify-end gap-2">
 <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 hover:bg-gray-200">Batal</button>
 <button type="button" className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700">Hapus</button>
 </div>
 </div>
 </div>
 )}

 </div>
 );
}

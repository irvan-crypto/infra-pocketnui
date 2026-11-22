"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Ship,
  Anchor,
  Upload,
  Download,
  AlertCircle,
  Navigation,
  Factory,
} from "lucide-react";
import { PORTS, PLANTS } from "@/lib/coordinates";
import { SHIP_STATUS_LABELS, SHIP_STATUS_ORDER } from "@/lib/app-config";
import { useAuth } from "@/contexts/AuthContext";
import { getPermissions, canEditShipmentRow } from "@/lib/access";
import {
  SAMPLE_COLUMN,
  SAMPLE_VALUE,
  isSampleRow,
  sampleDateISO,
  sampleDateTime,
} from "@/lib/excel-sample";

type Shipment = Record<string, any> & {
  id: string;
  nama_kapal: string;
  nama_vendor?: string;
  type_muatan?: string;
  muatan_ton?: number;
  tujuan_pp: string;
  pelabuhan_asal: string;
};

const empty = {
  nama_kapal: "",
  nama_vendor: "",
  type_muatan: "",
  muatan_ton: 0,
  tujuan_pp: "",
  pelabuhan_asal: "",
  ...Object.fromEntries(SHIP_STATUS_ORDER.map((k) => [k, ""])),
};

const numberFmt = (value: unknown) =>
  Number(value || 0).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDateTime = (value: unknown) =>
  value
    ? new Date(String(value))
        .toLocaleString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
        .replace(",", ", ")
        .replace(/:/g, ".")
    : "";

/** Format timestamp yang diterima PostgreSQL: YYYY-MM-DD HH:mm:ss */
const toTimestamp = (value: unknown) => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:00`;
};

const STATUS_HEADERS = [
  "TA Tiba",
  "Sandar",
  "Muat",
  "Selesai Muat",
  "TD Pelabuhan",
  "TA PP",
  "Sandar PP",
  "Bongkar PP",
  "Selesai PP",
  "TD PP",
];

const TAB_COLORS = [
  { bg: "bg-orange-50", hoverBg: "hover:bg-orange-100" },
  { bg: "bg-green-50", hoverBg: "hover:bg-green-100" },
  { bg: "bg-blue-50", hoverBg: "hover:bg-blue-100" },
  { bg: "bg-purple-50", hoverBg: "hover:bg-purple-100" },
  { bg: "bg-amber-50", hoverBg: "hover:bg-amber-100" },
  { bg: "bg-teal-50", hoverBg: "hover:bg-teal-100" },
];

const PORT_ORDER = PORTS.map((p) => p.name);

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Status terakhir kapal: kolom status terakhir yang terisi */
const lastStatusOf = (row: Record<string, any>): string | null => {
  for (let i = SHIP_STATUS_ORDER.length - 1; i >= 0; i--) {
    const key = SHIP_STATUS_ORDER[i];
    if (row[key]) return key;
  }
  return null;
};

/** Kunci nama kapal untuk hitung unik: trim + case-insensitive */
const vesselKey = (row: Record<string, any>) =>
  String(row.nama_kapal ?? "").trim().toLowerCase() || "-";

/** Pelabuhan asal yang ditampilkan pada rincian kartu */
const portOf = (row: Record<string, any>): "bks" | "tuban" | null => {
  const p = String(row.pelabuhan_asal ?? "").toLowerCase();
  if (p.includes("biringkassi")) return "bks";
  if (p.includes("tuban")) return "tuban";
  return null;
};

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
};

const ROWS_OPTIONS = [10, 20, 30, 50, 100];

/** Hapus awalan "PP" pada label tombol filter */
const ppLabel = (name: string) => name.replace(/^PP\.?\s*/i, "").trim() || name;

const getPageNumbers = (totalPages: number, current: number): (number | "...")[] => {
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }
  pages.push(1);
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < totalPages - 2) pages.push("...");
  pages.push(totalPages);
  return pages;
};

export default function AngkutanLautPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activePp, setActivePp] = useState("Semua");
  const [pageByPort, setPageByPort] = useState<Record<string, number>>({});
  const [rowsPerPageByPort, setRowsPerPageByPort] = useState<Record<string, number>>({});

  const [modal, setModal] = useState<"choice" | "upload" | "add" | "edit" | "delete" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadRows, setUploadRows] = useState<any[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploadSummary, setUploadSummary] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [samplesSkipped, setSamplesSkipped] = useState(0);

  const [editing, setEditing] = useState<Shipment | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const r = await fetch("/api/shipments", { cache: "no-store" });
    const d = await r.json();
    if (d.ok) setRows(d.data);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const perms = getPermissions(user);

  /** Opsi button group: hanya Tujuan PP yang ada datanya */
  const ppOptions = useMemo(() => {
    const available = new Set(rows.map((r) => String(r.tujuan_pp || "").trim()).filter(Boolean));
    const ordered = PLANTS.map((p) => p.name).filter((name) => available.has(name));
    const extras = Array.from(available)
      .filter((name) => !PLANTS.some((p) => p.name === name))
      .sort();
    return ["Semua", ...ordered, ...extras];
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const matchPp = activePp === "Semua" || String(r.tujuan_pp || "").trim() === activePp;
        const matchSearch = Object.values(r)
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());
        return matchPp && matchSearch;
      }),
    [rows, search, activePp]
  );

  /** Tabel dikelompokkan per Pelabuhan Asal (urutan mengikuti PORTS) */
  const groups = useMemo(() => {
    const map = new Map<string, Shipment[]>();
    for (const row of filtered) {
      const key = String(row.pelabuhan_asal || "").trim() || "Tanpa Pelabuhan Asal";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const ia = PORT_ORDER.indexOf(a[0]);
      const ib = PORT_ORDER.indexOf(b[0]);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  }, [filtered]);

  /** MTD & Harian — total muatan dari kolom TD Pelabuhan (selalu total keseluruhan) */
  const tdSummary = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    let mtd = 0;
    let latestDate: Date | null = null;
    const mtdKapal = new Set<string>();

    for (const row of rows) {
      const d = toDate(row.td_pelabuhan);
      if (!d) continue;
      if (d.getFullYear() === y && d.getMonth() === m) {
        mtd += Number(row.muatan_ton || 0);
        mtdKapal.add(vesselKey(row));
      }
      if (!latestDate || d.getTime() > latestDate.getTime()) latestDate = d;
    }

    let harian = 0;
    const harianKapal = new Set<string>();
    if (latestDate) {
      const key = `${latestDate.getFullYear()}-${pad2(latestDate.getMonth() + 1)}-${pad2(latestDate.getDate())}`;
      for (const row of rows) {
        const d = toDate(row.td_pelabuhan);
        if (!d) continue;
        if (`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` === key) {
          harian += Number(row.muatan_ton || 0);
          harianKapal.add(vesselKey(row));
        }
      }
    }

    const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const harianLabel = latestDate
      ? `Ringkasan Harian ${latestDate.getDate()} ${bulan[latestDate.getMonth()]}`
      : "Ringkasan Harian";

    return {
      mtd,
      harian,
      mtdKapal: mtdKapal.size,
      harianKapal: harianKapal.size,
      harianLabel,
      harianLabelShort: harianLabel.replace(/^Ringkasan\s+/i, ""),
    };
  }, [rows]);

  /** Total muatan & jumlah kapal unik per status terakhir kapal (selalu total keseluruhan) */
  const statusTotals = useMemo(() => {
    const bucket = () => ({
      ton: 0,
      kapal: new Set<string>(),
      bks: 0,
      tuban: 0,
      bksKapal: new Set<string>(),
      tubanKapal: new Set<string>(),
    });
    const out = {
      berlabuh: bucket(),
      belumBerangkat: bucket(),
      perjalanan: bucket(),
      tibaPp: bucket(),
    };
    const BELUM = ["sandar", "muat", "selesai_muat"];
    for (const row of rows) {
      const status = lastStatusOf(row);
      if (!status) continue;
      const ton = Number(row.muatan_ton || 0);
      let key: "berlabuh" | "belumBerangkat" | "perjalanan" | "tibaPp";
      if (status === "ta_tiba") key = "berlabuh";
      else if (BELUM.includes(status)) key = "belumBerangkat";
      else if (status === "td_pelabuhan") key = "perjalanan";
      else key = "tibaPp"; // ta_pp, sandar_pp, bongkar_pp, selesai_pp, td_pp

      out[key].ton += ton;
      out[key].kapal.add(vesselKey(row));

      const port = portOf(row);
      if (port === "bks") {
        out[key].bks += ton;
        out[key].bksKapal.add(vesselKey(row));
      } else if (port === "tuban") {
        out[key].tuban += ton;
        out[key].tubanKapal.add(vesselKey(row));
      }
    }
    return out;
  }, [rows]);

  const openAdd = () => {
    setForm(empty);
    setEditing(null);
    setModal("add");
  };

  const parseFile = async (file: File) => {
    setUploading(true);
    setUploadMessage("");
    setUploadErrors([]);
    setUploadRows([]);
    setSamplesSkipped(0);
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        workbook.Sheets[workbook.SheetNames[0]],
        { defval: "" }
      );
      const keys = [
        "nama_kapal",
        "nama_vendor",
        "type_muatan",
        "muatan_ton",
        "tujuan_pp",
        "pelabuhan_asal",
        ...SHIP_STATUS_ORDER,
      ];
      const normalize = (v: unknown, key: string) => {
        if (v === "" || v == null) return undefined;
        if (SHIP_STATUS_ORDER.includes(key as any)) {
          if (typeof v === "number") return toTimestamp(new Date(Date.UTC(1899, 11, 30) + v * 86400000));
          return toTimestamp(v);
        }
        if (key === "muatan_ton") return Number(String(v).replace(",", ".")) || 0;
        return String(v).trim();
      };
      const errors: string[] = [];
      let skippedSamples = 0;
      const parsed: any[] = [];
      raw.forEach((row, i) => {
        if (isSampleRow(row)) {
          skippedSamples += 1;
          return;
        }
        const payload: any = {};
        for (const key of keys) {
          const source = Object.keys(row).find(
            (k) =>
              k.toLowerCase().replace(/[ _]+/g, " ").trim() === key.replaceAll("_", " ")
          );
          if (source) payload[key] = normalize(row[source], key);
        }
        if (!payload.nama_kapal || !payload.tujuan_pp || !payload.pelabuhan_asal)
          errors.push(`Baris ${i + 2}: Nama Kapal, Tujuan PP, dan Pelabuhan Asal wajib diisi.`);
        parsed.push(payload);
      });
      setSamplesSkipped(skippedSamples);
      setUploadRows(parsed);
      setUploadErrors(errors);
      setUploadMessage(parsed.length ? `${parsed.length} baris siap disimpan` : "File tidak memiliki data.");
    } catch {
      setUploadErrors(["File Excel tidak dapat dibaca."]);
    } finally {
      setUploading(false);
    }
  };

  const uploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await parseFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setUploadRows([]);
      setUploadMessage("");
      setUploadErrors(["Format file harus .xlsx atau .xls"]);
      return;
    }
    await parseFile(file);
  };

  const saveUpload = async () => {
    setUploading(true);
    let added = 0,
      updated = 0,
      skipped = 0;
    const errors: string[] = [];
    const rowKey = (r: any) =>
      [String(r.nama_kapal || "").trim(), String(r.tujuan_pp || "").trim(), String(r.pelabuhan_asal || "").trim()]
        .join("|")
        .toLowerCase();
    const existing = new Map<string, Shipment>();
    for (const r of rows) {
      const k = rowKey(r);
      if (!existing.has(k)) existing.set(k, r);
    }
    for (const [i, row] of uploadRows.entries()) {
      const found = existing.get(rowKey(row));
      try {
        const res = await fetch("/api/shipments", {
          method: found ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(found ? { id: found.id, ...row } : row),
        });
        const d = await res.json();
        if (d.ok) {
          if (found) {
            updated++;
            existing.set(rowKey(row), { ...found, ...row });
          } else {
            added++;
            if (d.data) existing.set(rowKey(row), d.data as Shipment);
          }
        } else {
          skipped++;
          errors.push(`Baris ${i + 2}: ${d.message || "Gagal disimpan"}`);
        }
      } catch {
        skipped++;
        errors.push(`Baris ${i + 2}: Gagal terhubung ke server`);
      }
    }
    setUploading(false);
    setUploadErrors(errors);
    setUploadSummary(
      `Data berhasil ditambahkan (${added} ditambahkan, ${updated} diupdate, ${skipped} skip${
        samplesSkipped ? `, ${samplesSkipped} baris contoh di-skip` : ""
      })`
    );
    setUploadRows([]);
    setUploadMessage("");
    await load();
    window.setTimeout(() => {
      setModal(null);
      setUploadSummary("");
      setUploadErrors([]);
    }, 3000);
  };

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const headers = [
      "nama_kapal",
      "nama_vendor",
      "type_muatan",
      "muatan_ton",
      "tujuan_pp",
      "pelabuhan_asal",
      ...SHIP_STATUS_ORDER,
      SAMPLE_COLUMN,
    ];
    const sampleRow = [
      "CONTOH KAPAL",
      "CONTOH VENDOR",
      "Semen Bag",
      1250.5,
      "PP. Palu",
      "Pelabuhan Biringkassi",
      ...SHIP_STATUS_ORDER.map(() => sampleDateTime()),
      SAMPLE_VALUE,
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    ws["!cols"] = headers.map((h) => ({ wch: Math.max(14, h.length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Shipment Laut");
    XLSX.writeFile(wb, `template-shipment-laut-${sampleDateISO()}.xlsx`);
  };

  const openEdit = (r: Shipment) => {
    setForm({ ...empty, ...r });
    setEditing(r);
    setModal("edit");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const timestampForm = { ...form };
    for (const key of SHIP_STATUS_ORDER) {
      timestampForm[key] = toTimestamp(form[key]);
    }
    const r = await fetch("/api/shipments", {
      method: modal === "edit" ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        modal === "edit" ? { id: editing?.id, ...timestampForm } : timestampForm
      ),
    });
    const d = await r.json();
    setSaving(false);
    if (!d.ok) {
      alert(d.message || "Gagal menyimpan");
      return;
    }
    setModal(null);
    load();
  };

  const remove = async () => {
    if (!editing) return;
    setSaving(true);
    const r = await fetch("/api/shipments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing.id }),
    });
    const d = await r.json();
    setSaving(false);
    if (!d.ok) {
      alert(d.message || "Gagal menghapus");
      return;
    }
    setModal(null);
    load();
  };

  if (loading)
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  const input = (name: string, label: string, type = "text", required = false) => (
    <label key={name} className="block text-xs font-semibold text-gray-600">
      {label}
      <input
        required={required}
        type={type}
        value={form[name] ?? ""}
        onChange={(e) =>
          setForm({ ...form, [name]: type === "number" ? Number(e.target.value) : e.target.value })
        }
        className="mt-1 w-full px-3.5 py-2.5 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white outline-none"
      />
    </label>
  );

  /** Kartu gaya /monitoring/pp: pita diagonal + garis tepi MTD (biru) / Harian (hijau) */
  const TonCard = ({
    period,
    periodShort,
    borderClass,
    ribbon,
    value,
    kapal,
  }: {
    period: string;
    periodShort: string;
    borderClass: string;
    ribbon: string;
    value: number;
    kapal: number;
  }) => (
    <div
      className={`relative overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${borderClass} p-3 sm:p-4`}
    >
      <div
        style={{
          position: "absolute",
          top: "7px",
          right: "-20px",
          transform: "rotate(45deg)",
          backgroundColor: ribbon,
          color: "white",
          fontSize: "8px",
          fontWeight: 800,
          letterSpacing: "0.05em",
          padding: "3px 22px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          zIndex: 10,
          pointerEvents: "none",
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        TD
      </div>

      {/* Judul (kiri) · jumlah kapal unik (kanan) */}
      <div className="flex items-start justify-between gap-2 pr-6">
        <p className="text-[10px] sm:text-[11px] font-medium text-gray-400 whitespace-nowrap">
          <span className="sm:hidden">{periodShort}</span>
          <span className="hidden sm:inline">{period}</span>
        </p>
        <span className="text-[11px] sm:text-xs font-semibold text-gray-700 whitespace-nowrap">
          {kapal.toLocaleString("id-ID")} kapal
        </span>
      </div>

      {/* Total muatan (kiri) */}
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-xl sm:text-2xl font-bold tabular-nums leading-none text-gray-900">
          {Math.round(value).toLocaleString("id-ID")}
        </p>
        <span className="text-[10px] font-medium text-gray-400">ton</span>
      </div>
    </div>
  );

  type StatusCardItem = [string, number, number, number, number, number, number, React.ReactNode];

  const statusCards: StatusCardItem[] = [
    [
      "Kapal Berlabuh",
      statusTotals.berlabuh.ton,
      statusTotals.berlabuh.kapal.size,
      statusTotals.berlabuh.bks,
      statusTotals.berlabuh.bksKapal.size,
      statusTotals.berlabuh.tuban,
      statusTotals.berlabuh.tubanKapal.size,
      <Ship key="sb" size={18} className="text-blue-600" />,
    ],
    [
      "Kapal Belum Berangkat",
      statusTotals.belumBerangkat.ton,
      statusTotals.belumBerangkat.kapal.size,
      statusTotals.belumBerangkat.bks,
      statusTotals.belumBerangkat.bksKapal.size,
      statusTotals.belumBerangkat.tuban,
      statusTotals.belumBerangkat.tubanKapal.size,
      <Anchor key="ab" size={18} className="text-amber-600" />,
    ],
    [
      "Kapal Di Perjalanan",
      statusTotals.perjalanan.ton,
      statusTotals.perjalanan.kapal.size,
      statusTotals.perjalanan.bks,
      statusTotals.perjalanan.bksKapal.size,
      statusTotals.perjalanan.tuban,
      statusTotals.perjalanan.tubanKapal.size,
      <Navigation key="np" size={18} className="text-indigo-600" />,
    ],
    [
      "Kapal Tiba Packing Plant",
      statusTotals.tibaPp.ton,
      statusTotals.tibaPp.kapal.size,
      statusTotals.tibaPp.bks,
      statusTotals.tibaPp.bksKapal.size,
      statusTotals.tibaPp.tuban,
      statusTotals.tibaPp.tubanKapal.size,
      <Factory key="fp" size={18} className="text-emerald-600" />,
    ],
  ];

  const renderTableHead = () => (
    <thead className="bg-gray-200">
      <tr>
        <th rowSpan={2} className="px-4 py-3 text-center text-xs font-bold text-gray-800 border border-gray-300">
          Kapal
        </th>
        <th rowSpan={2} className="px-4 py-3 text-center text-xs font-bold text-gray-800 border border-gray-300">
          Vendor
        </th>
        <th rowSpan={2} className="px-4 py-3 text-center text-xs font-bold text-gray-800 border border-gray-300">
          Jenis Muatan
        </th>
        <th rowSpan={2} className="px-4 py-3 text-center text-xs font-bold text-gray-800 border border-gray-300">
          Muatan (ton)
        </th>
        <th rowSpan={2} className="px-4 py-3 text-center text-xs font-bold text-gray-800 border border-gray-300">
          Tujuan PP
        </th>
        <th colSpan={5} className="px-4 py-3 text-center text-xs font-bold text-gray-800 border border-gray-300">
          Pelabuhan Asal
        </th>
        <th colSpan={5} className="px-4 py-3 text-center text-xs font-bold text-gray-800 border border-gray-300">
          Packing Plant
        </th>
        <th rowSpan={2} className="px-4 py-3 text-center text-xs font-bold text-gray-800 border border-gray-300">
          Aksi
        </th>
      </tr>
      <tr>
        {STATUS_HEADERS.map((h) => (
          <th
            key={h}
            className="px-4 py-2 text-center text-xs font-bold text-gray-800 whitespace-nowrap border border-gray-300"
          >
            {h}
          </th>
        ))}
      </tr>
    </thead>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Monitoring Angkutan Laut</h1>
        <p className="text-sm text-gray-500 mt-1">Monitoring perjalanan kapal dan pengiriman semen.</p>
      </div>

      {/* Kartu MTD & Harian — total muatan dari kolom TD Pelabuhan (total keseluruhan) */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        <TonCard
          period="Ringkasan MTD"
          periodShort="Ringkasan MTD"
          borderClass="border-l-blue-500"
          ribbon="#3b82f6"
          value={tdSummary.mtd}
          kapal={tdSummary.mtdKapal}
        />
        <TonCard
          period={tdSummary.harianLabel}
          periodShort={tdSummary.harianLabelShort}
          borderClass="border-l-emerald-500"
          ribbon="#10b981"
          value={tdSummary.harian}
          kapal={tdSummary.harianKapal}
        />
      </div>

      {/* 4 kartu total muatan per status terakhir kapal (total keseluruhan) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statusCards.map(([label, value, kapal, bks, bksKapal, tuban, tubanKapal, icon]) => (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4" key={label}>
            {icon}
            <div className="mt-2 flex items-start justify-between gap-2">
              <p className="text-xs text-gray-500">{label}</p>
              <div className="text-right">
                <p className="text-[11px] sm:text-xs font-semibold text-gray-700 whitespace-nowrap">
                  {kapal.toLocaleString("id-ID")} kapal
                </p>
                {bks > 0 && (
                  <p className="text-[10px] text-gray-500 whitespace-nowrap">
                    BKS - {Math.round(bks).toLocaleString("id-ID")} ({bksKapal.toLocaleString("id-ID")})
                  </p>
                )}
                {tuban > 0 && (
                  <p className="text-[10px] text-gray-500 whitespace-nowrap">
                    Tuban - {Math.round(tuban).toLocaleString("id-ID")} ({tubanKapal.toLocaleString("id-ID")})
                  </p>
                )}
              </div>
            </div>
            <p className="text-xl font-bold text-gray-800">
              {Math.round(value).toLocaleString("id-ID")}{" "}
              <span className="text-xs font-medium text-gray-400">ton</span>
            </p>
          </div>
        ))}
      </div>

      {/* Button group filter Tujuan PP */}
      <div className="w-full shadow-md shadow-gray-400/50 rounded-xl overflow-hidden">
        <div className="flex flex-wrap">
          {ppOptions.map((pp, i, arr) => {
            const color = TAB_COLORS[i % TAB_COLORS.length];
            return (
              <button
                key={pp}
                onClick={() => {
                  setActivePp(pp);
                  setPageByPort({});
                }}
                className={`flex-1 basis-auto min-w-fit px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-none transition-all text-center leading-tight whitespace-nowrap border ${
                  activePp === pp
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : `${color.bg} text-gray-700 ${color.hoverBg} border-transparent`
                } ${i === 0 ? "rounded-l-xl" : ""} ${i === arr.length - 1 ? "rounded-r-xl" : ""} ${
                  i !== 0 ? "-ml-px" : ""
                }`}
              >
                {ppLabel(pp)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Satu tabel per Pelabuhan Asal */}
      {groups.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
          Tidak ada data
        </div>
      )}

      {groups.map(([portName, portRows], groupIndex) => {
        const rowsPerPage = rowsPerPageByPort[portName] ?? 10;
        const totalPages = Math.max(1, Math.ceil(portRows.length / rowsPerPage));
        const safePage = Math.min(pageByPort[portName] ?? 1, totalPages);
        const startIndex = (safePage - 1) * rowsPerPage;
        const endIndex = Math.min(startIndex + rowsPerPage, portRows.length);
        const visibleRows = portRows.slice(startIndex, endIndex);
        const portTotal = portRows.reduce((a, r) => a + Number(r.muatan_ton || 0), 0);
        const setPage = (p: number) =>
          setPageByPort((prev) => ({ ...prev, [portName]: Math.max(1, Math.min(p, totalPages)) }));

        return (
        <div
          key={portName}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <Anchor size={16} className="text-blue-600" />
                <h2 className="text-sm font-bold text-gray-800">{portName}</h2>
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {portRows.length} kapal
                </span>
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                Total : <span className="font-bold text-gray-800">{numberFmt(portTotal)} ton</span>
              </span>
            </div>

            {/* Pencarian & Tambah Data hanya pada tabel pertama, berlaku global */}
            {groupIndex === 0 && (
              <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:items-center sm:gap-3 sm:w-auto">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari data kapal..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPageByPort({});
                    }}
                    className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-blue-600 outline-none transition-all w-full sm:min-w-[180px]"
                  />
                </div>
                {perms.canCreate && (
                  <button
                    onClick={() => setModal("choice")}
                    className="btn-glow flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold whitespace-nowrap w-full sm:w-auto"
                  >
                    <Plus size={15} /> Tambah Data
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {renderTableHead()}
              <tbody>
                {visibleRows.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{r.nama_kapal}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.nama_vendor || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.type_muatan || "—"}</td>
                    <td className="px-4 py-3 text-right font-bold whitespace-nowrap">{numberFmt(r.muatan_ton)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.tujuan_pp}</td>
                    {SHIP_STATUS_ORDER.map((k) => (
                      <td key={k} className="px-4 py-3 text-right whitespace-nowrap">
                        {formatDateTime(r[k])}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex gap-3 whitespace-nowrap">
                        {canEditShipmentRow(perms, r) && (
                          <button onClick={() => openEdit(r)} className="text-blue-600">
                            <Edit2 size={15} />
                          </button>
                        )}
                        {(perms.canDelete || canEditShipmentRow(perms, r)) && (
                          <button
                            onClick={() => {
                              setEditing(r);
                              setModal("delete");
                            }}
                            className="text-red-600"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 bg-gray-50">
                  <td
                    colSpan={3}
                    className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-600"
                  >
                    Subtotal muatan
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-900">
                    {numberFmt(portTotal)}
                  </td>
                  <td colSpan={12} className="px-4 py-3" />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pagination — gaya sama dengan halaman angkutan-darat */}
          {portRows.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-gray-100">
              <span className="text-xs sm:text-sm text-gray-500">
                Menampilkan {startIndex + 1}–{endIndex} dari {portRows.length} data
              </span>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500">
                  <span className="hidden sm:inline">Baris per halaman</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setRowsPerPageByPort((prev) => ({ ...prev, [portName]: val }));
                      setPageByPort((prev) => ({ ...prev, [portName]: 1 }));
                    }}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs sm:text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {ROWS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(safePage - 1)}
                    disabled={safePage <= 1}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                  </button>

                  {getPageNumbers(totalPages, safePage).map((p, i) =>
                    p === "..." ? (
                      <span key={`dots-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-400">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${
                          p === safePage ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => setPage(safePage + 1)}
                    disabled={safePage >= totalPages}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        );
      })}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className={`bg-white rounded-2xl shadow-xl w-full ${
              modal === "choice" || modal === "upload" ? "max-w-md" : "max-w-2xl"
            } max-h-[90vh] overflow-y-auto p-6`}
          >
            <div className="flex justify-between mb-5">
              <h2 className="text-lg font-semibold">
                {modal === "choice"
                  ? "Input Data Angkutan Laut"
                  : modal === "upload"
                  ? "Upload Data Excel"
                  : modal === "delete"
                  ? "Hapus Data"
                  : "Tambah/Edit Data Kapal"}
              </h2>
              <button onClick={() => setModal(null)}>
                <X size={20} />
              </button>
            </div>

            {modal === "choice" ? (
              <div className="space-y-3">
                <button
                  onClick={() => setModal("upload")}
                  className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold flex items-center justify-center gap-2"
                >
                  <Upload size={17} /> Upload Data Excel
                </button>
                <button
                  onClick={openAdd}
                  className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2"
                >
                  <Plus size={17} /> Tambah Data Manual
                </button>
              </div>
            ) : modal === "upload" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "copy";
                      setDragOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                    }}
                    onDrop={handleDrop}
                    className={`sm:col-span-2 flex flex-col items-center justify-center gap-1.5 px-4 py-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                      dragOver
                        ? "border-green-600 bg-green-100"
                        : "border-green-400 bg-green-50/40 hover:bg-green-50"
                    }`}
                  >
                    <Upload size={22} className="text-green-600" />
                    <span className="text-sm font-semibold">
                      {uploading ? "Membaca file..." : "Upload data Excel"}
                    </span>
                    <span className="text-xs text-gray-500">
                      drag & drop file .xlsx ke sini atau klik untuk memilih
                    </span>
                    <input
                      type="file"
                      accept=".xlsx"
                      onChange={uploadExcel}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={downloadTemplate}
                    className="flex flex-col items-center justify-center gap-1.5 px-4 py-6 border-2 border-red-300 text-red-600 rounded-xl hover:bg-red-50"
                  >
                    <Download size={20} />
                    <span className="text-sm font-semibold">Template</span>
                    <span className="text-xs">download Excel</span>
                  </button>
                </div>

                {uploadSummary && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm font-semibold">
                    {uploadSummary}
                  </div>
                )}

                {uploadErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm">
                    <AlertCircle size={16} className="inline mr-2" />
                    File tidak bisa disimpan — perbaiki:
                    <ul className="list-disc list-inside text-xs mt-1">
                      {uploadErrors.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {samplesSkipped > 0 && uploadRows.length > 0 && (
                  <p className="text-xs text-amber-600">
                    {samplesSkipped} baris contoh dari template otomatis di-skip.
                  </p>
                )}

                {uploadMessage && uploadRows.length > 0 && (
                  <p className="text-xs font-bold text-gray-500 uppercase">
                    Preview — {uploadRows.length} baris siap disimpan
                  </p>
                )}

                {uploadRows.length > 0 && (
                  <div className="overflow-x-auto border rounded-lg max-h-60">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-200">
                        <tr>
                          {["Kapal", "Vendor", "Jenis Muatan", "Muatan", "Tujuan PP", "Pelabuhan Asal"].map(
                            (h) => (
                              <th key={h} className="px-3 py-2 text-left border">
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {uploadRows.map((r, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-2">{r.nama_kapal}</td>
                            <td className="px-3 py-2">{r.nama_vendor}</td>
                            <td className="px-3 py-2">{r.type_muatan}</td>
                            <td className="px-3 py-2">{r.muatan_ton}</td>
                            <td className="px-3 py-2">{r.tujuan_pp}</td>
                            <td className="px-3 py-2">{r.pelabuhan_asal}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={saveUpload}
                    disabled={!uploadRows.length || uploadErrors.length > 0 || uploading}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    {uploading ? "Menyimpan..." : `Simpan ${uploadRows.length} Baris`}
                  </button>
                  <button
                    onClick={() => {
                      setModal(null);
                      setUploadRows([]);
                      setUploadErrors([]);
                      setUploadSummary("");
                    }}
                    className="px-5 py-2.5 bg-gray-100 rounded-lg text-sm"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : modal === "delete" ? (
              <>
                <p className="text-sm text-gray-600">
                  Yakin ingin menghapus data kapal <b>{editing?.nama_kapal}</b>?
                </p>
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setModal(null)} className="px-4 py-2 border rounded-xl text-sm">
                    Batal
                  </button>
                  <button onClick={remove} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm">
                    Hapus
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={submit}>
                <div className="grid sm:grid-cols-2 gap-4">
                  {input("nama_kapal", "Nama Kapal", "text", true)}
                  {input("nama_vendor", "Vendor")}
                  {input("type_muatan", "Jenis Muatan")}
                  {input("muatan_ton", "Muatan (ton)", "number")}
                  {
                    <label className="text-xs font-semibold text-gray-600">
                      Pelabuhan Asal
                      <select
                        required
                        value={form.pelabuhan_asal}
                        onChange={(e) => setForm({ ...form, pelabuhan_asal: e.target.value })}
                        className="mt-1 w-full p-2.5 border-2 border-gray-100 rounded-xl"
                      >
                        <option value="">Pilih</option>
                        {PORTS.map((p) => (
                          <option key={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </label>
                  }
                  {
                    <label className="text-xs font-semibold text-gray-600">
                      Tujuan PP
                      <select
                        required
                        value={form.tujuan_pp}
                        onChange={(e) => setForm({ ...form, tujuan_pp: e.target.value })}
                        className="mt-1 w-full p-2.5 border-2 border-gray-100 rounded-xl"
                      >
                        <option value="">Pilih</option>
                        {PLANTS.map((p) => (
                          <option key={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </label>
                  }
                  {SHIP_STATUS_ORDER.map((k) => input(k, SHIP_STATUS_LABELS[k], "datetime-local"))}
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded-xl text-sm">
                    Batal
                  </button>
                  <button disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm">
                    {saving ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

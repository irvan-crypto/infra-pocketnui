import * as XLSX from "xlsx";
import type { MonitoringTableConfig } from "./monitoring-config";

// ============================================================
// Template & parser Excel untuk halaman monitoring.
// - Template: 1 baris, 1 tanggal (hari ini), header = label Indonesia
// - Upload: file .xlsx hasil isi template -> diparse & divalidasi
// ============================================================

const HEADER_TANGGAL = "Tanggal";

export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Tanggal kemarin (1 hari sebelum hari ini) — default tanggal di template */
export function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function normHeader(s: unknown): string {
  return String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Peta header template -> key kolom database */
function labelToKeyMap(config: MonitoringTableConfig): Map<string, string> {
  const map = new Map<string, string>();
  map.set(normHeader(HEADER_TANGGAL), "tanggal");
  for (const f of config.fields) {
    if (f.generated) continue; // generated column tidak diisi manual
    map.set(normHeader(f.label), f.key);
    if (f.shortLabel) map.set(normHeader(f.shortLabel), f.key);
    map.set(normHeader(f.key), f.key); // nama kolom DB juga diterima
  }
  return map;
}

/** Generate & download template .xlsx (1 baris, tanggal kemarin) */
export function downloadTemplate(config: MonitoringTableConfig): void {
  const fields = config.fields.filter((f) => !f.generated);
  const headers = [HEADER_TANGGAL, ...fields.map((f) => f.label)];
  const tgl = yesterdayISO();

  const ws = XLSX.utils.aoa_to_sheet([headers, [tgl, ...fields.map(() => "")]]);
  ws["!cols"] = [{ wch: 14 }, ...fields.map((f) => ({ wch: Math.max(12, f.label.length + 2) }))];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, config.title.slice(0, 31));
  XLSX.writeFile(wb, `template-${config.slug}-${tgl}.xlsx`);
}

export interface ParsedRow {
  tanggal: string; // YYYY-MM-DD
  values: Record<string, number | string>;
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: string[];
}

/** Normalisasi tanggal: Date | serial Excel | "YYYY-MM-DD" | "DD/MM/YYYY" */
function normalizeTanggal(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime())) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  }
  if (typeof v === "number" && isFinite(v)) {
    // serial date Excel (basis 1970-01-01 = 25569)
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mo = m[2].padStart(2, "0");
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${mo}-${d}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return null;
}

/** Parse angka: terima number, "4900", "4.900", "5350,5", "5.350,50" */
function parseNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  let s = String(v).trim();
  if (!s) return null;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    // format Indonesia: titik = ribuan, koma = desimal
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return isFinite(n) ? n : null;
}

/** Baca file .xlsx template dan validasi isinya */
export async function parseTemplateFile(
  file: File,
  config: MonitoringTableConfig
): Promise<ParseResult> {
  const errors: string[] = [];
  const rows: ParsedRow[] = [];

  const buf = await file.arrayBuffer();
  let json: Record<string, unknown>[];
  try {
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) {
      return { rows, errors: ["File Excel tidak memiliki sheet yang bisa dibaca."] };
    }
    json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
  } catch {
    return { rows, errors: ["File tidak bisa dibaca. Pastikan format .xlsx sesuai template."] };
  }

  if (json.length === 0) {
    errors.push("File kosong — tidak ada baris data.");
    return { rows, errors };
  }

  const map = labelToKeyMap(config);

  json.forEach((raw, idx) => {
    const rowNo = idx + 2; // +1 baris header, +1 basis hitung manusia

    // Petakan header -> key database
    const mapped: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      const key = map.get(normHeader(k));
      if (key) mapped[key] = v;
    }

    // Validasi tanggal
    const t = normalizeTanggal(mapped.tanggal);
    if (!t) {
      errors.push(`Baris ${rowNo}: tanggal kosong atau tidak valid`);
      return;
    }

    // Validasi kolom
    const values: Record<string, number | string> = {};
    let rowOk = true;
    for (const f of config.fields) {
      if (f.generated) continue;
      const v = mapped[f.key];
      if (f.type === "number") {
        const n = parseNumber(v);
        if (v !== null && v !== undefined && String(v).trim() !== "" && n === null) {
          errors.push(`Baris ${rowNo}: kolom "${f.label}" bukan angka valid ("${v}")`);
          rowOk = false;
          continue;
        }
        values[f.key] = n ?? 0;
      } else {
        const s = v === null || v === undefined ? "" : String(v).trim();
        if (f.required && !s) {
          errors.push(`Baris ${rowNo}: kolom "${f.label}" wajib diisi`);
          rowOk = false;
          continue;
        }
        values[f.key] = s;
      }
    }
    if (!rowOk) return;

    // Duplikat di dalam file: tanggal saja (uniquePerDate) atau
    // kombinasi tanggal + uniqueBy (mis. expeditur)
    const dupInFile = rows.some((r) => {
      if (r.tanggal !== t) return false;
      if (config.uniquePerDate) return true;
      if (!config.uniqueBy) return false;
      return (
        String(r.values[config.uniqueBy] || "").trim().toLowerCase() ===
        String(values[config.uniqueBy] || "").trim().toLowerCase()
      );
    });
    if (dupInFile) {
      const extra =
        config.uniqueBy && !config.uniquePerDate
          ? ` untuk "${values[config.uniqueBy]}"`
          : "";
      errors.push(`Baris ${rowNo}: tanggal ${t}${extra} duplikat di dalam file`);
      return;
    }

    rows.push({ tanggal: t, values });
  });

  if (rows.length === 0 && errors.length === 0) {
    errors.push("Tidak ada baris valid yang bisa diimport.");
  }

  return { rows, errors };
}

// ============================================================
// Helper filter periode (Tahun + Bulan) yang opsinya
// dibentuk dari data yang benar-benar ada.
//
// Contoh: data hanya berisi Okt & Nov 2026
//   → availableYears()  = [2026]
//   → availableMonths() = [10, 11]
// ============================================================

export const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/** "all" = tanpa batasan (Semua Tahun / Semua Bulan) */
export type PeriodPart = number | "all";

export interface Period {
  year: PeriodPart;
  month: PeriodPart;
}

export const ALL_PERIOD: Period = { year: "all", month: "all" };

export interface YearMonth {
  year: number;
  month: number;
}

/** Ambil tahun & bulan dari nilai tanggal apa pun ("2026-11-23", ISO, Date, dll.) */
export function periodOf(value: unknown): YearMonth | null {
  if (value === null || value === undefined || value === "") return null;
  const str = String(value);
  const iso = str.match(/^(\d{4})-(\d{2})/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    if (month >= 1 && month <= 12) return { year, month };
  }
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return null;
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/** Cara membaca tanggal dari satu baris (beda-beda per halaman) */
export type DateGetter<T> = (row: T) => unknown;

/** Tanggal valid pertama dari beberapa kolom (untuk baris dengan tanggal opsional) */
export function firstDateOf(...values: unknown[]): string | null {
  for (const v of values) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    if (periodOf(v)) return String(v);
  }
  return null;
}

/** Daftar tahun yang ada di data — terbaru lebih dulu */
export function availableYears<T>(rows: T[], getDate: DateGetter<T>): number[] {
  const set = new Set<number>();
  for (const row of rows) {
    const p = periodOf(getDate(row));
    if (p) set.add(p.year);
  }
  return Array.from(set).sort((a, b) => b - a);
}

/**
 * Daftar bulan (1–12) yang ada di data.
 * `year` = "all" → gabungan semua tahun; selain itu hanya bulan pada tahun tsb.
 */
export function availableMonths<T>(
  rows: T[],
  getDate: DateGetter<T>,
  year: PeriodPart
): number[] {
  const set = new Set<number>();
  for (const row of rows) {
    const p = periodOf(getDate(row));
    if (!p) continue;
    if (year !== "all" && p.year !== year) continue;
    set.add(p.month);
  }
  return Array.from(set).sort((a, b) => a - b);
}

/** Periode data terbaru yang tersedia */
export function latestPeriod<T>(
  rows: T[],
  getDate: DateGetter<T>
): YearMonth | null {
  let latest: YearMonth | null = null;
  for (const row of rows) {
    const p = periodOf(getDate(row));
    if (!p) continue;
    if (!latest || p.year > latest.year || (p.year === latest.year && p.month > latest.month)) {
      latest = p;
    }
  }
  return latest;
}

/**
 * Periode awal saat halaman dibuka: bulan berjalan.
 * Jika bulan berjalan belum punya data → pakai periode terbaru yang ada
 * (supaya halaman tidak kosong di awal bulan).
 */
export function defaultPeriod<T>(rows: T[], getDate: DateGetter<T>): Period {
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  const latest = latestPeriod(rows, getDate);
  if (!latest) return { year: curYear, month: curMonth };
  if (latest.year === curYear && latest.month === curMonth) {
    return { year: curYear, month: curMonth };
  }
  return { year: latest.year, month: latest.month };
}

/**
 * Pastikan periode masih valid terhadap data yang ada
 * (mis. bulan terpilih sudah tidak punya data → pindah ke bulan terakhir tahun itu).
 */
export function normalizePeriod<T>(
  rows: T[],
  getDate: DateGetter<T>,
  period: Period
): Period {
  const years = availableYears(rows, getDate);
  if (years.length === 0) return period;
  if (period.year === "all") return { year: "all", month: "all" };

  const year = years.includes(period.year) ? period.year : years[0];
  if (period.month === "all") return { year, month: "all" };

  const months = availableMonths(rows, getDate, year);
  if (months.includes(period.month)) return { year, month: period.month };
  const fallback = months[months.length - 1];
  return { year, month: fallback ?? "all" };
}

/**
 * Saring baris sesuai periode.
 * `keepUndated` = baris tanpa tanggal tetap ditampilkan
 * (dipakai di halaman kapal: baris tanpa td_pelabuhan jangan hilang).
 */
export function filterByPeriod<T>(
  rows: T[],
  getDate: DateGetter<T>,
  period: Period,
  options?: { keepUndated?: boolean }
): T[] {
  if (period.year === "all" && period.month === "all") return rows;
  return rows.filter((row) => {
    const p = periodOf(getDate(row));
    if (!p) return options?.keepUndated ?? false;
    if (period.year !== "all" && p.year !== period.year) return false;
    if (period.month !== "all" && p.month !== period.month) return false;
    return true;
  });
}

/**
 * Baris terakhir di dalam periode (kondisi akhir bulan).
 * `rows` boleh tidak terurut — diurutkan sendiri berdasarkan tanggal.
 */
export function lastRowInPeriod<T>(
  rows: T[],
  getDate: DateGetter<T>,
  period: Period
): T | null {
  let best: T | null = null;
  let bestKey = "";
  for (const row of rows) {
    const p = periodOf(getDate(row));
    if (!p) continue;
    if (period.year !== "all" && p.year !== period.year) continue;
    if (period.month !== "all" && p.month !== period.month) continue;
    const key = String(getDate(row)).slice(0, 19);
    if (!best || key > bestKey) {
      best = row;
      bestKey = key;
    }
  }
  return best;
}

/** Label periode: "November 2026" / "Semua Bulan 2026" / "Semua Bulan" */
export function periodLabel(period: Period): string {
  const monthName = period.month === "all" ? "Semua Bulan" : MONTH_NAMES_ID[period.month - 1];
  if (period.year === "all") return monthName === "Semua Bulan" ? "Semua Periode" : `Setiap ${monthName}`;
  return `${monthName} ${period.year}`;
}

/** Apakah periode sama dengan bulan berjalan? */
export function isCurrentMonth(period: Period): boolean {
  const now = new Date();
  return period.year === now.getFullYear() && period.month === now.getMonth() + 1;
}

/** Query string periode untuk API: "?tahun=2026&bulan=11" (kosong jika Semua) */
export function periodQuery(period: Period): string {
  const params = new URLSearchParams();
  if (period.year !== "all") params.set("tahun", String(period.year));
  if (period.month !== "all") params.set("bulan", String(period.month));
  const q = params.toString();
  return q ? `?${q}` : "";
}

/**
 * Tanggal akhir periode (YYYY-MM-DD) sebagai batas query inklusif.
 * null = tanpa batas (Semua Tahun).
 */
export function periodEndISO(period: Period): string | null {
  if (period.year === "all") return null;
  if (period.month === "all") return `${period.year}-12-31`;
  const lastDay = new Date(period.year, period.month, 0).getDate();
  return `${period.year}-${String(period.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

/**
 * Ubah daftar periode "YYYY-MM" (mis. dari /api/monitoring-periods)
 * menjadi baris semu bertanggal, agar bisa memakai helper di atas.
 */
export function periodAnchorRows(periods: string[]): { tanggal: string }[] {
  return periods.map((p) => ({ tanggal: `${p}-01` }));
}

// ── Khusus data kapal (shipments) ──────────────────────────────
/** Kolom tanggal cadangan bila td_pelabuhan belum diisi */
const SHIP_FALLBACK_DATE_FIELDS = [
  "ta_pp",
  "sandar_pp",
  "bongkar_pp",
  "selesai_pp",
  "td_pp",
  "ta_tiba",
  "sandar",
  "muat",
  "selesai_muat",
];

/**
 * Tanggal acuan periode untuk satu baris kapal:
 * - utama: td_pelabuhan
 * - bila belum diisi: tanggal terakhir yang sudah ada di baris itu,
 *   sehingga baris tetap tampil pada periode yang sesuai
 * - bila semua tanggal kosong: null (baris tetap ditampilkan
 *   menggunakan opsi filterByPeriod({ keepUndated: true }))
 */
export function shipmentPeriodDate<T extends Record<string, any>>(row: T): string | null {
  if (row.td_pelabuhan) return String(row.td_pelabuhan);
  let latest: string | null = null;
  for (const key of SHIP_FALLBACK_DATE_FIELDS) {
    const value = row[key];
    if (!value) continue;
    const iso = String(value);
    if (!latest || iso > latest) latest = iso;
  }
  return latest;
}

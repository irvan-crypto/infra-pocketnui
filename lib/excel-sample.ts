// ============================================================
// Penanda baris contoh pada template Excel.
// - Template berisi 1 baris contoh agar user tahu format yang benar
//   (terutama tanggal / tanggal-waktu dan angka desimal).
// - Baris contoh ditandai pada kolom "Contoh" dengan nilai "YA".
// - Saat upload, baris yang ditandai tidak pernah masuk ke database.
// ============================================================

export const SAMPLE_COLUMN = "Contoh";
export const SAMPLE_VALUE = "YA";

const normHeader = (s: unknown) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

/** True bila baris Excel ditandai sebagai baris contoh */
export function isSampleRow(row: Record<string, unknown>): boolean {
  const key = Object.keys(row).find((k) => normHeader(k) === normHeader(SAMPLE_COLUMN));
  if (!key) return false;
  const value = normHeader(row[key]);
  if (!value) return false;
  return ["ya", "y", "1", "true", "contoh", "hapus", "hapus baris ini"].includes(value);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Tanggal kemarin dalam format YYYY-MM-DD */
export function sampleDateISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Tanggal-waktu kemarin dalam format PostgreSQL: YYYY-MM-DD HH:mm:ss */
export function sampleDateTime(hour = 8, minute = 30): string {
  return `${sampleDateISO()} ${pad(hour)}:${pad(minute)}:00`;
}

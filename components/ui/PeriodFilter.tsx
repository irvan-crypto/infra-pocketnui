"use client";

import { MONTH_NAMES_ID, type Period, type PeriodPart } from "@/lib/period";

// ============================================================
// Filter periode: dua dropdown (Bulan → Tahun).
// Daftar opsi berasal dari data yang ada (lihat lib/period.ts),
// jadi bulan/tahun kosong tidak akan muncul.
// ============================================================

interface Props {
  years: number[];
  months: number[];
  value: Period;
  onChange: (period: Period) => void;
  disabled?: boolean;
  /** Tampilkan opsi "Semua Bulan" / "Semua Tahun" (default: true) */
  allowAll?: boolean;
  className?: string;
}

const selectClass =
  "w-full appearance-none cursor-pointer pl-9 pr-8 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 " +
  "border border-amber-600 text-white text-sm font-semibold " +
  "focus:ring-4 focus:ring-amber-300/60 outline-none transition-colors " +
  "disabled:opacity-70 disabled:cursor-not-allowed";

/** Ikon di dalam dropdown (putih agar kontras di latar amber) */
const iconClass = "pointer-events-none absolute text-white/85";

function Chevron() {
  return (
    <svg
      className={`${iconClass} right-2.5 top-1/2 -translate-y-1/2`}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function PeriodFilter({
  years,
  months,
  value,
  onChange,
  disabled = false,
  allowAll = true,
  className = "",
}: Props) {
  if (years.length === 0) return null;

  const handleMonth = (raw: string) => {
    const month: PeriodPart = raw === "all" ? "all" : Number(raw);
    onChange({ year: value.year, month });
  };

  const handleYear = (raw: string) => {
    const year: PeriodPart = raw === "all" ? "all" : Number(raw);
    // Pilihan bulan tetap; parent menormalkan bila bulan itu tak ada di tahun baru.
    onChange({ year, month: year === "all" && allowAll ? "all" : value.month });
  };

  return (
    <div className={`inline-flex w-full sm:w-auto items-center gap-2 ${className}`}>
      {/* Bulan */}
      <div className="filter-glow relative flex-1 sm:flex-none rounded-xl">
        <span className={`${iconClass} left-3 top-1/2 -translate-y-1/2`}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </span>
        <select
          aria-label="Filter bulan"
          value={value.month === "all" ? "all" : String(value.month)}
          onChange={(e) => handleMonth(e.target.value)}
          disabled={disabled || years.length === 0}
          className={selectClass}
        >
          {allowAll && <option value="all" className="bg-white text-gray-800">Semua Bulan</option>}
          {months.map((m) => (
            <option key={m} value={m} className="bg-white text-gray-800">
              {MONTH_NAMES_ID[m - 1]}
            </option>
          ))}
        </select>
        <Chevron />
      </div>

      {/* Tahun */}
      <div className="filter-glow relative flex-1 sm:flex-none rounded-xl">
        <span className={`${iconClass} left-3 top-1/2 -translate-y-1/2`}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M8 2v4M16 2v4" />
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M3 10h18M12 14v4M10 16h4" />
          </svg>
        </span>
        <select
          aria-label="Filter tahun"
          value={value.year === "all" ? "all" : String(value.year)}
          onChange={(e) => handleYear(e.target.value)}
          disabled={disabled || years.length === 0}
          className={selectClass}
        >
          {allowAll && <option value="all" className="bg-white text-gray-800">Semua Tahun</option>}
          {years.map((y) => (
            <option key={y} value={y} className="bg-white text-gray-800">
              {y}
            </option>
          ))}
        </select>
        <Chevron />
      </div>
    </div>
  );
}

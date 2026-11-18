"use client";

import { ReactNode, useState } from "react";
import SearchInput from "./SearchInput";

interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
  /** Label grup header (mis. "TONASA 2/3"). Kolom bergrup berurutan digabung jadi 1 sel header. */
  group?: string;
}

interface Props<T> {
  title?: string | ReactNode;
  columns: Column<T>[];
  data: T[];
  searchable?: boolean;
  searchPlaceholder?: string;
  actions?: ReactNode;
  onRowClick?: (item: T) => void;
  maxHeight?: string;
  getRowClass?: (item: T) => string;
  onSearchChange?: (value: string) => void;
  /** Controlled search value. Jika diisi, pencarian dikendalikan dari luar (mis. di card-header). */
  searchValue?: string;
  /** Sembunyikan header internal DataTable (title + search + actions). */
  hideHeader?: boolean;
}

const ROWS_OPTIONS = [10, 20, 30, 50, 100];

export default function DataTable<T>({
  title,
  columns,
  data,
  searchable = true,
  searchPlaceholder = "Cari...",
  actions,
  onRowClick,
  maxHeight,
  getRowClass,
  onSearchChange,
  searchValue,
  hideHeader = false,
}: Props<T>) {
  const [internalSearch, setInternalSearch] = useState("");
  const isControlledSearch = searchValue !== undefined;
  const search = isControlledSearch ? searchValue : internalSearch;

  const handleSearch = (val: string) => {
    if (!isControlledSearch) setInternalSearch(val);
    onSearchChange?.(val);
  };
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // ── Grouped header ───────────────────────────────────────────
  const hasGroups = columns.some((col) => !!col.group);
  const groupHeaderCells: {
    key: string;
    label: string;
    colSpan?: number;
    rowSpan?: number;
    hideOnMobile?: boolean;
    className?: string;
  }[] = [];

  for (let i = 0; i < columns.length; i += 1) {
    const col = columns[i];

    if (!col.group) {
      groupHeaderCells.push({
        key: col.key,
        label: String(col.header),
        rowSpan: 2,
        hideOnMobile: col.hideOnMobile,
        className: col.className,
      });
      continue;
    }

    // Kumpulkan kolom berurutan dengan grup yang sama
    let end = i;
    while (end + 1 < columns.length && columns[end + 1].group === col.group) end += 1;
    const run = columns.slice(i, end + 1);

    groupHeaderCells.push({
      key: `group-${col.group}-${i}`,
      label: col.group,
      colSpan: run.length,
      hideOnMobile: run.every((c) => c.hideOnMobile),
    });

    i = end;
  }

  const filtered = search
    ? data.filter((item) =>
        columns.some((col) => {
          const val = (item as Record<string, unknown>)[col.key];
          return String(val).toLowerCase().includes(search.toLowerCase());
        })
      )
    : data;

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filtered.length);
  const paginatedData = filtered.slice(startIndex, endIndex);

  const goToPage = (p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
  };

  const handleRowsPerPageChange = (val: number) => {
    setRowsPerPage(val);
    setPage(1);
  };

  const getPageNumbers = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("...");
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      {!hideHeader && (title || searchable || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
          <div className="flex-1">
            {title && (typeof title === "string" ? (
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{title}</h3>
            ) : (
              title
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {searchable && (
              <SearchInput
                placeholder={searchPlaceholder}
                value={search}
                onChange={handleSearch}
              />
            )}
            {actions}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto" style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}>
        <table className="w-full table-auto">
          <thead>
            {hasGroups ? (
              <>
                {/* Baris 1: grup kolom (colspan) + kolom tanpa grup (rowspan 2) */}
                <tr className="bg-gray-200">
                  {groupHeaderCells.map((cell) => (
                    <th
                      key={cell.key}
                      colSpan={cell.colSpan}
                      rowSpan={cell.rowSpan}
                      className={`px-3 sm:px-4 lg:px-5 py-2 text-xs font-bold text-gray-800 uppercase tracking-wider whitespace-nowrap border-b border-gray-300
                        ${cell.colSpan && cell.colSpan > 1 ? "text-center" : "text-left"}
                        ${cell.hideOnMobile ? "hidden lg:table-cell" : ""}
                        ${cell.className || ""}`}
                    >
                      {cell.label}
                    </th>
                  ))}
                </tr>
                {/* Baris 2: sub-header kolom bergrup */}
                <tr className="bg-gray-200 border-b-2 border-gray-400">
                  {columns.map((col, idx) => {
                    if (!col.group) return null;
                    const runStart = idx === 0 || columns[idx - 1]?.group !== col.group;
                    return (
                      <th
                        key={col.key}
                        className={`px-3 sm:px-4 lg:px-5 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wider whitespace-nowrap
                          ${runStart ? "border-l border-gray-300" : ""}
                          ${col.hideOnMobile ? "hidden lg:table-cell" : ""}
                          ${col.className || ""}`}
                      >
                        {col.header}
                      </th>
                    );
                  })}
                </tr>
              </>
            ) : (
              <tr className="bg-gray-200 border-b-2 border-gray-400">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 sm:px-4 lg:px-5 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider whitespace-nowrap
                      ${col.hideOnMobile ? "hidden lg:table-cell" : ""}
                      ${col.className || ""}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">📭</span>
                    <span className="text-sm">Tidak ada data</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((item, idx) => (
                <tr
                  key={idx}
                  onClick={() => onRowClick?.(item)}
                  className={`border-t border-gray-100 transition-colors hover:bg-gray-50 ${onRowClick ? "cursor-pointer" : ""} ${getRowClass?.(item) || ""}`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 sm:px-4 lg:px-5 py-3 text-sm text-gray-700 whitespace-nowrap
                        ${col.hideOnMobile ? "hidden lg:table-cell" : ""}
                        ${col.className || ""}`}
                    >
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-gray-100">
          {/* Info */}
          <span className="text-xs sm:text-sm text-gray-500">
            Menampilkan {startIndex + 1}–{endIndex} dari {filtered.length} data
          </span>

          {/* Right side: rows selector + navigation */}
          <div className="flex items-center gap-3">
            {/* Rows per page */}
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500">
              <span className="hidden sm:inline">Baris per halaman</span>
              <select
                value={rowsPerPage}
                onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-2 py-1 text-xs sm:text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {ROWS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(safePage - 1)}
                disabled={safePage <= 1}
                className="w-7 h-7 flex items-center justify-center rounded-md text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>

              {getPageNumbers().map((p, i) =>
                p === "..." ? (
                  <span key={`dots-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-400">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${
                      p === safePage
                        ? "bg-blue-600 text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => goToPage(safePage + 1)}
                disabled={safePage >= totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-md text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
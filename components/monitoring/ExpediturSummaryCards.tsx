"use client";

import { useEffect, useState } from "react";
import {
  formatMonitoringNumber,
  formatTanggalPanjang,
} from "@/lib/monitoring-config";
import type { PeriodPart } from "@/lib/period";

// ============================================================
// Grid kartu ringkasan per expeditur (MTD & Harian).
// Data dari /api/angkutan-darat-summary. Dipakai di halaman
// Ringkasan Monitoring dan /monitoring/angkutan-darat.
// ============================================================

export interface ExpediturSummary {
  nama_expeditur: string;
  harian: { tanggal: string; tonase: number; retase: number; armada_operasi: number };
  mtd: { total_tonase: number; total_retase: number; avg_armada: number; days: number };
}

/** Kartu ringkasan satu expeditur: MTD ringkas (tonase mencolok) + Harian */
function ExpediturCard({ e }: { e: ExpediturSummary }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <p className="text-sm font-bold text-gray-800 truncate" title={e.nama_expeditur}>
        {e.nama_expeditur}
      </p>

      {/* MTD: label + tonase besar (kiri), retase + armada (kanan) */}
      <div className="mt-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total MTD</p>
          <p className="text-2xl font-extrabold text-blue-600 tabular-nums leading-tight">
            {formatMonitoringNumber(e.mtd.total_tonase)}
            <span className="text-sm font-medium text-gray-400 ml-1">Ton</span>
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-gray-800 tabular-nums">
            {formatMonitoringNumber(e.mtd.total_retase, true)} Ret
          </p>
          <p className="text-sm font-bold text-gray-800 tabular-nums mt-1">
            {formatMonitoringNumber(Math.round(e.mtd.avg_armada), true)} Armada
          </p>
        </div>
      </div>

      {/* Harian — tanggal terbaru */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
          Harian — {formatTanggalPanjang(e.harian.tanggal)}
        </p>
        <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2 text-center">
          <div className="bg-gray-50 rounded-lg py-2">
            <p className="text-lg font-extrabold text-gray-800 tabular-nums whitespace-nowrap">
              {formatMonitoringNumber(e.harian.tonase)}
              <span className="text-[10px] font-medium text-gray-400 ml-0.5">Ton</span>
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg py-2 flex items-center justify-center">
            <p className="text-base font-bold text-gray-800 tabular-nums whitespace-nowrap">
              {formatMonitoringNumber(e.harian.retase, true)}
              <span className="text-[10px] font-medium text-gray-400 ml-0.5">Ret</span>
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg py-2 flex items-center justify-center">
            <p className="text-base font-bold text-gray-800 tabular-nums whitespace-nowrap">
              {formatMonitoringNumber(e.harian.armada_operasi, true)}
              <span className="text-[10px] font-medium text-gray-400 ml-0.5">Armada</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExpediturSummaryCards({
  year = "all",
  month = "all",
}: {
  year?: PeriodPart;
  month?: PeriodPart;
}) {
  const [rows, setRows] = useState<ExpediturSummary[] | null>(null);

  useEffect(() => {
    setRows(null);
    (async () => {
      try {
        const params = new URLSearchParams();
        if (year !== "all") params.set("tahun", String(year));
        if (month !== "all") params.set("bulan", String(month));
        const query = params.toString();
        const res = await fetch(
          `/api/angkutan-darat-summary${query ? `?${query}` : ""}`
        );
        const data = await res.json();
        setRows(data.ok ? data.data || [] : []);
      } catch (error) {
        console.error(error);
        setRows([]);
      }
    })();
  }, [year, month]);

  if (rows === null) return null; // masih memuat — biarkan senyap

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center text-sm text-gray-500">
        Belum ada data angkutan darat.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {rows.map((e) => (
        <ExpediturCard key={e.nama_expeditur} e={e} />
      ))}
    </div>
  );
}

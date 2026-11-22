"use client";

import { formatMonitoringNumber } from "@/lib/monitoring-config";
import { Tank, type SiloTank } from "./SiloTank";

// ============================================================
// Kartu grafik tabung untuk /monitoring/semua-silo.
// Tabung: kapasitas (penuh), deadstok (gelap), stok aktual (hijau).
// Data stok berasal dari tabel monitoring harian tanggal terbaru.
// ============================================================

interface Props {
  title: string;
  items: SiloTank[];
  /** Tanggal stok terbaru (opsional) */
  tanggal?: string | null;
}

/** "2026-11-18" -> "18/11/2026" */
function formatDate(value: string): string {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value);
}

export default function SemuaSiloTankCard({ title, items, tanggal }: Props) {
  const totalStok = items.reduce((sum, item) => sum + item.stok, 0);
  const totalKapasitas = items.reduce((sum, item) => sum + item.kapasitas, 0);
  const totalDeadstok = items.reduce((sum, item) => sum + item.deadstok, 0);
  const pct = totalKapasitas > 0 ? Math.round((totalStok / totalKapasitas) * 100) : 0;

  const maxKapasitas = items.length ? Math.max(...items.map((i) => i.kapasitas)) : 0;
  const heightOf = (kapasitas: number) =>
    maxKapasitas > 0 ? Math.max(70, Math.round((170 * kapasitas) / maxKapasitas)) : 170;

  return (
    <div className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-end gap-4 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Stok
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gray-900 inline-block" /> Deadstok
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200 inline-block" />{" "}
          Kapasitas
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm font-extrabold text-gray-800 uppercase tracking-wider text-center">
            {title}
          </p>
          <p className="mb-4 text-center leading-tight">
            <span className="text-xs font-bold text-gray-700 tabular-nums">
              Total Stok: {formatMonitoringNumber(totalStok, true)} ton
            </span>
            <span className="block text-[10px] font-semibold text-gray-400 tabular-nums">
              {pct}% dari kapasitas {formatMonitoringNumber(totalKapasitas, true)} ton &middot;
              deadstok {formatMonitoringNumber(totalDeadstok, true)} ton
              {tanggal ? ` \u00b7 stok per ${formatDate(tanggal)}` : ""}
            </span>
          </p>
          <div className="flex flex-wrap items-end justify-around gap-2">
            {items.map((item) => (
              <Tank key={item.key} tank={item} height={heightOf(item.kapasitas)} />
            ))}
            {items.length === 0 && (
              <p className="text-sm text-gray-400 py-8">
                Belum ada data kapasitas pada kelompok ini.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

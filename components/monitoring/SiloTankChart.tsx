"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMonitoringNumber } from "@/lib/monitoring-config";
import { Tank, type SiloTank } from "./SiloTank";

type Row = Record<string, any>;

/** Ambil nomor silo dari nama_pp: "Silo 21" -> 21 */
function parseSiloNumber(nama: unknown): number | null {
  const m = String(nama || "").match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

/** Pengelompokan & nama default (silo_semen); bisa dioverride via props */
const SILO_GROUPS: number[][] = [
  [21, 22, 23, 24],
  [41, 42, 43],
  [51, 52, 53],
];

/** Nama tampilan per grup (kunci = nomor silo pertama grup) */
const SILO_GROUP_NAMES: Record<number, string> = {
  21: "TONASA 2/3",
  41: "TONASA 4",
  51: "TONASA 5",
};

const defaultColumnPrefix = "stok_silo";

interface SiloTankChartProps {
  latest: Row;
  groups?: number[][];
  groupNames?: Record<number, string>;
  columnPrefix?: string;
  scaleHeight?: boolean; // tinggi tabung proporsional kapasitas (min 70px)
}

export default function SiloTankChart({
  latest,
  groups = SILO_GROUPS,
  groupNames = SILO_GROUP_NAMES,
  columnPrefix = defaultColumnPrefix,
  scaleHeight = false,
}: SiloTankChartProps) {
  const [ppRows, setPpRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/packing-plant");
        const data = await res.json();
        if (data.ok) setPpRows(data.data || []);
        else setFailed(true);
      } catch {
        setFailed(true);
      }
    })();
  }, []);

  // Pemetaan: nama_pp ("Silo 21" / "Silo Pantai 3") -> nomor -> kolom stok
  // di baris terbaru. Hanya silo yang terdaftar di groups yang ditampilkan.
  const silos = useMemo<SiloTank[]>(() => {
    if (!ppRows || !latest) return [];
    const wanted = new Set(groups.flat());
    const out: SiloTank[] = [];
    for (const r of ppRows) {
      const n = parseSiloNumber(r.nama_pp);
      if (n === null || !wanted.has(n)) continue;
      if (out.some((s) => s.nomor === n)) continue; // cegah duplikat nomor silo
      const key = `${columnPrefix}${n}`;
      if (!(key in latest)) continue; // bukan silo tabel ini (PP lain diabaikan)
      const kapasitas = Number(r.kapasitas_pp || 0);
      if (kapasitas <= 0) continue; // tidak bisa diskalakan
      out.push({
        key,
        nomor: n,
        nama: String(r.nama_pp).trim(),
        stok: Number(latest[key] || 0),
        kapasitas,
        deadstok: Math.max(0, Math.min(Number(r.deadstok_pp || 0), kapasitas)),
      });
    }
    return out.sort((a, b) => a.nomor - b.nomor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ppRows, latest, groups, columnPrefix]);

  // Tinggi proporsional kapasitas (opsional): tabung terbesar = 170px,
  // lainnya menyesuaikan, minimum 70px agar tetap terbaca.
  const maxKapasitas = useMemo(
    () => (silos.length ? Math.max(...silos.map((s) => s.kapasitas)) : 0),
    [silos]
  );
  const tankHeight = (kapasitas: number) =>
    scaleHeight && maxKapasitas > 0
      ? Math.max(70, Math.round((170 * kapasitas) / maxKapasitas))
      : 170;

  // Grup eksplisit sesuai prop groups
  const groupsMemo = useMemo(() => {
    const byNumber = new Map(silos.map((s) => [s.nomor, s]));
    return groups
      .map((nums) => {
        const items = nums
          .map((n) => byNumber.get(n))
          .filter((s): s is SiloTank => Boolean(s));
        const totalStok = items.reduce((sum, s) => sum + s.stok, 0);
        const totalKapasitas = items.reduce((sum, s) => sum + s.kapasitas, 0);
        return {
          key: nums[0],
          name: groupNames[nums[0]] ?? `Silo ${nums.join(", ")}`,
          items,
          totalStok,
          totalKapasitas,
          pct: totalKapasitas > 0 ? Math.round((totalStok / totalKapasitas) * 100) : 0,
        };
      })
      .filter((g) => g.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [silos, groups, groupNames]);

  // Data kapasitas belum tersedia / gagal dimuat -> petunjuk, bukan error
  if (failed || (ppRows !== null && silos.length === 0)) {
    return (
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
        <p className="text-sm text-gray-500">
          Data kapasitas silo (tabel <span className="font-mono">packing_plant</span>) belum tersedia.
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Isi kolom <span className="font-mono">nama_pp</span>,{" "}
          <span className="font-mono">kapasitas_pp</span>, <span className="font-mono">deadstok_pp</span>{" "}
          untuk Silo 21&ndash;53, lalu muat ulang halaman.
        </p>
      </div>
    );
  }

  if (!ppRows) return null; // masih memuat — biarkan senyap

  return (
    <div className="mb-6">
      {/* Legenda */}
      <div className="mb-3 flex flex-wrap items-center justify-end gap-4 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Stok
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gray-900 inline-block" /> Deadstok
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200 inline-block" /> Kapasitas
        </span>
      </div>

      <div
        className={`grid grid-cols-1 ${
          groupsMemo.length > 1 ? "md:grid-cols-3" : ""
        } gap-4`}
      >
        {groupsMemo.map(({ key, name, items, totalStok, totalKapasitas, pct }) => (
          <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm font-extrabold text-gray-800 uppercase tracking-wider text-center">
              {name}
            </p>
            <p className="mb-4 text-center leading-tight">
              <span className="text-xs font-bold text-gray-700 tabular-nums">
                Total Stok: {formatMonitoringNumber(totalStok, true)} ton
              </span>
              <span className="block text-[10px] font-semibold text-gray-400 tabular-nums">
                {pct}% dari kapasitas {formatMonitoringNumber(totalKapasitas, true)} ton
              </span>
            </p>
            <div className="flex flex-wrap items-end justify-around gap-2">
              {items.map((s) => (
                <Tank key={s.key} tank={s} height={tankHeight(s.kapasitas)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatMonitoringNumber,
  formatTanggalPanjang,
} from "@/lib/monitoring-config";

type Row = Record<string, any>;

interface SiloTank {
  key: string; // kolom stok: stok_silo21
  nomor: number; // 21
  nama: string; // "Silo 21" (dari packing_plant)
  stok: number;
  kapasitas: number;
  deadstok: number;
}

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

/** Satu tabung silinder SVG: hitam = deadstok, hijau = stok, abu = kapasitas kosong */
function Tank({ tank, height = 170 }: { tank: SiloTank; height?: number }) {
  const H = height; // tinggi dinding dalam tabung (px SVG)
  const deadH = (tank.deadstok / tank.kapasitas) * H;
  const sisaKapasitas = tank.kapasitas - tank.deadstok;
  // Stok grafik = stok bersih (stok - deadstok); jika stok < deadstok -> 0
  const netStok = Math.max(0, tank.stok - tank.deadstok);
  const stokH =
    sisaKapasitas > 0
      ? Math.max(0, Math.min(netStok / sisaKapasitas, 1)) * (H - deadH)
      : 0;
  const pct = Math.min(Math.round((tank.stok / tank.kapasitas) * 100), 100);
  const uid = `cyl-${tank.nomor}`;
  const top = 22;

  // Label data di dalam segmen.
  // Hijau = stok bersih (stok - deadstok); hitam = deadstok.
  // Jika stok < deadstok: segmen hijau hilang (net = 0) dan segmen hitam
  // berlabel "Deadstock".
  const stokDiBawahDeadstok = tank.stok < tank.deadstok;
  const deadstokText = stokDiBawahDeadstok
    ? "Deadstock"
    : formatMonitoringNumber(tank.deadstok, true);
  const stokText = stokDiBawahDeadstok ? "" : formatMonitoringNumber(netStok, true);

  const stokSegmentTop = top + H - deadH - stokH;

  /** Teks di tengah segmen; ukuran font menyesuaikan tinggi segmen */
  const label = (
    yCenter: number,
    h: number,
    text: string,
    opts?: { fontSize?: number; fill?: string }
  ) => {
    if (!text || h <= 0) return null;
    const fontSize = opts?.fontSize ?? Math.max(5.5, Math.min(11, h * 0.55));
    return (
      <text
        x="43"
        y={yCenter}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fontWeight="600"
        fill={opts?.fill ?? "#ffffff"}
        style={{ pointerEvents: "none" }}
      >
        {text}
      </text>
    );
  };

  // Label stok: di dalam segmen jika muat; jika tidak muat, dipindah ke
  // ATAS segmen (area kosong, hijau tua, font normal); fallback ke dalam
  // dengan font terkecil jika ruang di atas juga sempit.
  const stokLabel = (() => {
    if (!stokText || stokH <= 0) return null;
    if (stokH >= 13) {
      // Muat di dalam segmen
      return label(stokSegmentTop + stokH / 2, stokH, stokText);
    }
    const ruangAtas = stokSegmentTop - top;
    if (ruangAtas >= 15) {
      // Di atas segmen stok: font 9, hijau kontras (green-600)
      return label(stokSegmentTop - 6, 14, stokText, { fontSize: 9, fill: "#16a34a" });
    }
    // Fallback: di dalam, font terkecil
    return label(stokSegmentTop + stokH / 2, stokH, stokText, { fontSize: 5.5 });
  })();

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="86" height={H + top + 12} viewBox={`0 0 86 ${H + top + 12}`} role="img" aria-label={`${tank.nama}: ${tank.stok} ton dari ${tank.kapasitas} ton`}>
        <defs>
          <clipPath id={uid}>
            <rect x="8" y={top} width="70" height={H} rx="10" />
          </clipPath>
          <linearGradient id={`${uid}-shine`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="rgba(255,255,255,0.28)" />
            <stop offset="0.5" stopColor="rgba(255,255,255,0)" />
            <stop offset="1" stopColor="rgba(0,0,0,0.10)" />
          </linearGradient>
        </defs>

        {/* Track kapasitas (ruang kosong) */}
        <rect x="8" y={top} width="70" height={H} rx="10" fill="#f3f4f6" stroke="#e5e7eb" />

        {/* Isi: deadstok (hitam) di dasar + stok (hijau) menumpuk di atasnya */}
        <g clipPath={`url(#${uid})`}>
          <rect x="8" y={top + H - deadH} width="70" height={deadH} fill="#111827" />
          <rect x="8" y={top + H - deadH - stokH} width="70" height={stokH} fill="#22c55e" />
          {/* Kilau silinder */}
          <rect x="8" y={top} width="70" height={H} fill={`url(#${uid}-shine)`} />
          {/* Label data: deadstok selalu di dalam segmen, stok adaptif */}
          {label(top + H - deadH / 2, deadH, deadstokText)}
          {stokLabel}
        </g>

        {/* Bibir atas tabung */}
        <ellipse cx="43" cy={top} rx="35" ry="8" fill="#f9fafb" stroke="#d1d5db" />
        <ellipse cx="43" cy={top} rx="24" ry="4.5" fill="#e5e7eb" />
      </svg>

      <div className="text-center">
        <p className="text-xs font-bold text-gray-800">{tank.nama}</p>
        <p className="text-xs font-bold text-gray-700 tabular-nums">{formatMonitoringNumber(tank.stok)} ton</p>
        <p className="text-[10px] font-bold text-gray-400 tabular-nums">{pct}% terisi</p>
      </div>
    </div>
  );
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
    return groups.map((nums) => ({
      key: nums[0],
      name: groupNames[nums[0]] ?? `Silo ${nums.join(", ")}`,
      items: nums.map((n) => byNumber.get(n)).filter((s): s is SiloTank => Boolean(s)),
    })).filter((g) => g.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [silos, groups, groupNames]);

  // Data kapasitas belum tersedia / gagal dimuat -> petunjuk, bukan error
  if (failed || (ppRows !== null && silos.length === 0)) {
    return (
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
        <p className="text-sm text-gray-500">Data kapasitas silo (tabel <span className="font-mono">packing_plant</span>) belum tersedia.</p>
        <p className="text-xs text-gray-400 mt-1">
          Isi kolom <span className="font-mono">nama_pp</span>, <span className="font-mono">kapasitas_pp</span>,{" "}
          <span className="font-mono">deadstok_pp</span> untuk Silo 21&ndash;53, lalu muat ulang halaman.
        </p>
      </div>
    );
  }

  if (!ppRows) return null; // masih memuat — biarkan senyap

  return (
    <div className="mb-6">
      <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Kondisi Stok Silo</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Update Data terbaru per {formatTanggalPanjang(latest.tanggal)}
          </p>
        </div>
        {/* Legenda */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
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
      </div>

      <div
        className={`grid grid-cols-1 ${
          groupsMemo.length > 1 ? "md:grid-cols-3" : ""
        } gap-4`}
      >
        {groupsMemo.map(({ key, name, items }) => (
          <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm font-extrabold text-gray-800 uppercase tracking-wider mb-4 text-center">
              {name}
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

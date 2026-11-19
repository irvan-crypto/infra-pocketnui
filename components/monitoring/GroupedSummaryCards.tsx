"use client";

import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import {
  formatMonitoringNumber,
  formatTanggalPanjang,
  type MonitoringField,
  type MonitoringTableConfig,
} from "@/lib/monitoring-config";

type Row = Record<string, any>;

interface SummaryGroup {
  name: string;
  prod?: MonitoringField;
  total?: MonitoringField;
}

interface Accent {
  border: string;
  ribbon: string;
  softText: string;
}

/** Aksen warna per grup (string statis agar tidak di-purge Tailwind) */
const ACCENTS: Accent[] = [
  {
    border: "border-l-blue-500",
    ribbon: "#f43f5e", // rose-500 (OPC)
    softText: "text-blue-700",
  },
  {
    border: "border-l-emerald-500",
    ribbon: "#10b981",
    softText: "text-emerald-700",
  },
  {
    border: "border-l-amber-500",
    ribbon: "#f59e0b",
    softText: "text-amber-700",
  },
  {
    border: "border-l-violet-500",
    ribbon: "#8b5cf6",
    softText: "text-violet-700",
  },
];

/** Kartu capaian: Prod FM → Total Rilis → Capaian */
function CapaianCard({
  group,
  accent,
  prod,
  total,
  hasData,
}: {
  group: SummaryGroup;
  accent: Accent;
  prod: number;
  total: number;
  hasData: boolean;
}) {
  const capaian = prod > 0 ? (total / prod) * 100 : 0;
  const capaianText = hasData
    ? `${capaian.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`
    : "-";

  return (
    <div
      className={`relative overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${accent.border} p-4 sm:p-5`}
    >
      {/* Pita diagonal grup (OPC / PCC) */}
      <div
        style={{
          position: "absolute",
          top: "8px",
          right: "-22px",
          transform: "rotate(45deg)",
          backgroundColor: accent.ribbon,
          color: "white",
          fontSize: "9px",
          fontWeight: 800,
          letterSpacing: "0.05em",
          padding: "4px 36px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          zIndex: 10,
          pointerEvents: "none",
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        {group.name}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            {group.prod?.shortLabel || "Prod FM"}
          </p>
          <p className="mt-0.5 text-base sm:text-lg font-bold text-gray-900 tabular-nums whitespace-nowrap">
            {hasData ? formatMonitoringNumber(prod, group.prod?.integer) : "-"}
            <span className="ml-1 text-[11px] font-medium text-gray-400">ton</span>
          </p>
        </div>

        <ArrowRight size={14} className="shrink-0 text-gray-300" />

        <div className="min-w-0">
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${accent.softText}`}>
            {group.total?.shortLabel || "Total Rilis"}
          </p>
          <p className="mt-0.5 text-base sm:text-lg font-bold text-gray-900 tabular-nums whitespace-nowrap">
            {hasData ? formatMonitoringNumber(total, group.total?.integer) : "-"}
            <span className="ml-1 text-[11px] font-medium text-gray-400">ton</span>
          </p>
        </div>

        <ArrowRight size={14} className="shrink-0 text-gray-300" />

        <div className="min-w-0 text-right">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Capaian</p>
          <p
            className={`mt-0.5 text-base sm:text-lg font-bold tabular-nums whitespace-nowrap ${
              hasData ? (capaian >= 100 ? "text-emerald-600" : "text-rose-600") : "text-gray-900"
            }`}
          >
            {capaianText}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Ringkasan grid card dari data tabel (mis. CP Tonasa: OPC & PCC) */
export default function GroupedSummaryCards({
  config,
  rows,
}: {
  config: MonitoringTableConfig;
  rows: Row[];
}) {
  const latest = rows[0];

  const groups = useMemo<SummaryGroup[]>(() => {
    const out: SummaryGroup[] = [];
    for (const f of config.fields) {
      if (!f.group) continue;
      let g = out.find((x) => x.name === f.group);
      if (!g) {
        g = { name: f.group };
        out.push(g);
      }
      if (f.key.startsWith("prod_")) g.prod = f;
      else if (f.generated) g.total = f;
    }
    return out;
  }, [config]);

  const num = (key?: string) => (latest && key ? Number(latest[key] || 0) : 0);

  /** Akumulasi bulan berjalan (MTD) dari tanggal data terbaru */
  const mtd = useMemo(() => {
    if (!latest?.tanggal) return null;
    const month = String(latest.tanggal).slice(0, 7);
    const inMonth = rows.filter((r) => String(r.tanggal).slice(0, 7) === month);

    const sums: Record<string, { prod: number; total: number }> = {};
    for (const g of groups) {
      const prod = inMonth.reduce((s, r) => s + Number(r[g.prod?.key || ""] || 0), 0);
      const total = inMonth.reduce((s, r) => s + Number(r[g.total?.key || ""] || 0), 0);
      sums[g.name] = { prod, total };
    }

    return { month, days: inMonth.length, sums };
  }, [rows, groups, latest]);

  const monthLabel = useMemo(() => {
    if (!mtd) return "";
    const [y, m] = mtd.month.split("-");
    const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    return `${bulan[Number(m) - 1] ?? m} ${y}`;
  }, [mtd]);

  if (groups.length === 0) return null;

  return (
    <div className="mb-6">
      {/* ── MTD (akumulasi bulan berjalan) ── */}
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
          Ringkasan Produksi &amp; Rilis — MTD
        </h2>
        <span className="text-[11px] font-medium text-gray-500">
          {mtd ? `${monthLabel} · ${mtd.days} hari data` : "Belum ada data"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {groups.map((g, gi) => (
          <CapaianCard
            key={`capaian-mtd-${g.name}`}
            group={g}
            accent={ACCENTS[gi % ACCENTS.length]}
            prod={mtd?.sums[g.name]?.prod ?? 0}
            total={mtd?.sums[g.name]?.total ?? 0}
            hasData={!!mtd && mtd.days > 0}
          />
        ))}
      </div>

      {/* ── Harian (baris terbaru) ── */}
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
          Ringkasan Produksi &amp; Rilis
        </h2>
        <span className="text-[11px] font-medium text-gray-500">
          {latest ? `Per ${formatTanggalPanjang(latest.tanggal)}` : "Belum ada data"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {groups.map((g, gi) => (
          <CapaianCard
            key={`capaian-${g.name}`}
            group={g}
            accent={ACCENTS[gi % ACCENTS.length]}
            prod={num(g.prod?.key)}
            total={num(g.total?.key)}
            hasData={!!latest}
          />
        ))}
      </div>
    </div>
  );
}

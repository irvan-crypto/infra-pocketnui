"use client";

import { useMemo } from "react";
import {
  formatMonitoringNumber,
  monitoringFieldValue,
  type MonitoringField,
  type MonitoringTableConfig,
} from "@/lib/monitoring-config";

type Row = Record<string, any>;

interface SummaryGroup {
  name: string;
  prod?: MonitoringField;
  total?: MonitoringField;
}

/** Warna pita diagonal per grup (OPC / PCC), fallback untuk grup lain */
const RIBBON_COLORS = ["#f43f5e", "#10b981", "#f59e0b", "#8b5cf6"];

/** Warna garis tepi kiri kartu: MTD = biru, Harian = hijau */
const BORDER_MTD = "border-l-blue-500";
const BORDER_HARIAN = "border-l-emerald-500";

/** Kartu capaian: persentase (kiri) + Masuk/Prod FM & Rilis (kanan) */
function CapaianCard({
  group,
  ribbon,
  borderClass,
  prod,
  total,
  hasData,
  period,
  periodShort,
}: {
  group: SummaryGroup;
  ribbon: string;
  borderClass: string;
  prod: number;
  total: number;
  hasData: boolean;
  period: string;
  periodShort: string;
}) {
  const capaian = prod > 0 ? (total / prod) * 100 : 0;
  const capaianText = hasData
    ? `${capaian.toLocaleString("id-ID", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} %`
    : "-";

  return (
    <div
      className={`@container relative overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${borderClass} p-1.5 sm:p-3 2xl:p-4`}
    >
      {/* Pita diagonal grup (OPC / PCC) */}
      <div
        style={{
          position: "absolute",
          top: "7px",
          right: "-20px",
          transform: "rotate(45deg)",
          backgroundColor: ribbon,
          color: "white",
          fontSize: "8px",
          fontWeight: 800,
          letterSpacing: "0.05em",
          padding: "3px 22px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          zIndex: 10,
          pointerEvents: "none",
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        {group.name}
      </div>

      {/* Periode (kiri, di atas persentase) */}
      <p className="mt-2.5 text-[10px] sm:text-[11px] font-medium text-gray-400 whitespace-nowrap">
        <span className="sm:hidden">{periodShort}</span>
        <span className="hidden sm:inline">{period}</span>
      </p>

      {/* Persentase kiri · rincian kanan (semua ukuran layar) */}
      <div className="mt-1 flex items-center justify-between gap-0.5 sm:gap-2">
        <p
          className={`text-[clamp(0.65rem,7.6cqw,1.5rem)] font-bold tabular-nums leading-none whitespace-nowrap ${
            hasData ? (capaian >= 100 ? "text-emerald-600" : "text-rose-600") : "text-gray-900"
          }`}
        >
          {capaianText}
        </p>

        <div className="grid shrink-0 grid-cols-[auto_auto_auto] items-baseline gap-x-0.5 gap-y-0.5 sm:gap-x-1 sm:justify-end">
          <span className="text-[clamp(6.5px,4.4cqw,10px)] font-medium text-gray-400 text-right">
            {group.prod?.shortLabel || "Prod FM"}
          </span>
          <span className="text-[clamp(7.5px,6cqw,14px)] font-normal text-gray-900 tabular-nums text-right whitespace-nowrap">
            {hasData ? formatMonitoringNumber(prod, group.prod?.integer) : "-"}
          </span>
          <span className="text-[clamp(6.5px,4.4cqw,10px)] font-medium text-gray-400">ton</span>

          <span className="text-[clamp(6.5px,4.4cqw,10px)] font-medium text-gray-400 text-right">
            {(group.total?.shortLabel || "Total Rilis").replace(/^Total\s+/i, "")}
          </span>
          <span className="text-[clamp(7.5px,6cqw,14px)] font-normal text-gray-900 tabular-nums text-right whitespace-nowrap">
            {hasData ? formatMonitoringNumber(total, group.total?.integer) : "-"}
          </span>
          <span className="text-[clamp(6.5px,4.4cqw,10px)] font-medium text-gray-400">ton</span>
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
      else if (!g.prod && /masuk/i.test(f.key) && !f.generated) g.prod = f; // PP: masuk = sisi "produksi"
      if (f.virtual) g.total = f; // Total Rilis (virtual) diprioritaskan
      else if (f.generated && !g.total?.virtual) g.total = f;
    }
    return out;
  }, [config]);

  const num = (field?: MonitoringField) =>
    latest && field ? monitoringFieldValue(latest, field) : 0;

  /** Akumulasi bulan berjalan (MTD) dari tanggal data terbaru */
  const mtd = useMemo(() => {
    if (!latest?.tanggal) return null;
    const month = String(latest.tanggal).slice(0, 7);
    const inMonth = rows.filter((r) => String(r.tanggal).slice(0, 7) === month);

    const sums: Record<string, { prod: number; total: number }> = {};
    for (const g of groups) {
      const prod = inMonth.reduce((s, r) => s + (g.prod ? monitoringFieldValue(r, g.prod) : 0), 0);
      const total = inMonth.reduce((s, r) => s + (g.total ? monitoringFieldValue(r, g.total) : 0), 0);
      sums[g.name] = { prod, total };
    }

    return { month, days: inMonth.length, sums };
  }, [rows, groups, latest]);

  /** Label periode harian: "Ringkasan Harian 18 Nov" */
  const harianLabel = useMemo(() => {
    const t = latest?.tanggal ? String(latest.tanggal) : "";
    const [, m, d] = t.split("-");
    const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    if (!d) return "Ringkasan Harian";
    return `Ringkasan Harian ${Number(d)} ${bulan[Number(m) - 1] ?? m}`;
  }, [latest]);

  /** Versi pendek untuk mobile: "Harian 18 Nov" */
  const harianLabelShort = harianLabel.replace(/^Ringkasan\s+/i, "");

  // Kumpulkan kartu: MTD dulu, lalu harian — kartu yang semua nilainya 0 dibuang
  const cards = [
    ...groups.map((g, gi) => ({
      key: `capaian-mtd-${g.name}`,
      group: g,
      ribbon: RIBBON_COLORS[gi % RIBBON_COLORS.length],
      borderClass: BORDER_MTD,
      prod: mtd?.sums[g.name]?.prod ?? 0,
      total: mtd?.sums[g.name]?.total ?? 0,
      hasData: !!mtd && mtd.days > 0,
      period: "Ringkasan MTD",
      periodShort: "Ringkasan MTD",
    })),
    ...groups.map((g, gi) => ({
      key: `capaian-harian-${g.name}`,
      group: g,
      ribbon: RIBBON_COLORS[gi % RIBBON_COLORS.length],
      borderClass: BORDER_HARIAN,
      prod: num(g.prod),
      total: num(g.total),
      hasData: !!latest,
      period: harianLabel,
      periodShort: harianLabelShort,
    })),
  ].filter((c) => c.prod !== 0 || c.total !== 0);

  if (groups.length === 0 || cards.length === 0) return null;

  // Jumlah kolom menyesuaikan jumlah kartu yang tampil agar tidak ada sisa kolom kosong
  const gridCols =
    cards.length <= 2
      ? "grid-cols-2"
      : cards.length === 3
        ? "grid-cols-2 xl:grid-cols-3"
        : "grid-cols-2 xl:grid-cols-4";

  return (
    <div className="mb-6">
      {/* 1 baris, 4 kolom saat desktop: [MTD OPC, MTD PCC, Harian OPC, Harian PCC]
          Kartu bernilai 0 tidak dirender sehingga tidak menyisakan ruang kosong */}
      <div className={`grid ${gridCols} gap-2.5 sm:gap-4`}>
        {cards.map((c) => (
          <CapaianCard
            key={c.key}
            group={c.group}
            ribbon={c.ribbon}
            borderClass={c.borderClass}
            prod={c.prod}
            total={c.total}
            hasData={c.hasData}
            period={c.period}
            periodShort={c.periodShort}
          />
        ))}
      </div>
    </div>
  );
}

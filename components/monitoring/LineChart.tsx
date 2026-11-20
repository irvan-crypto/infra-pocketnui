"use client";

import { formatMonitoringNumber } from "@/lib/monitoring-config";

export interface LineChartSeries {
  label: string;
  color: string;
  values: number[]; // sejajar dengan `labels`
}

interface LineChartProps {
  title: string;
  labels: string[]; // sumbu X (tanggal), urut naik
  series: LineChartSeries[];
  unit?: string;
}

const VB_W = 560;
const VB_H = 168;
const PAD = { top: 12, right: 10, bottom: 22, left: 44 };

/** Skala "cantik": 1 / 2 / 5 × 10^n */
function niceCeil(value: number): number {
  if (!isFinite(value) || value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = Math.pow(10, exp);
  const n = value / base;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * base;
}

function shortNumber(v: number, maxY: number): string {
  const digits = maxY < 4 ? 2 : maxY < 20 ? 1 : 0;
  return v.toLocaleString("id-ID", { maximumFractionDigits: digits });
}

/** Grafik garis sederhana (SVG murni, tanpa library) */
export default function LineChart({
  title,
  labels,
  series,
  unit = "ton",
}: LineChartProps) {
  const innerW = VB_W - PAD.left - PAD.right;
  const innerH = VB_H - PAD.top - PAD.bottom;

  // Seri yang seluruh nilainya 0 tidak digambar (dan tidak masuk legenda)
  const activeSeries = series.filter((s) => s.values.some((v) => Number(v) !== 0));
  const n = labels.length;

  const allValues = activeSeries.flatMap((s) => s.values);
  const rawMax = Math.max(1, ...allValues);
  const maxY = niceCeil(rawMax);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    value: maxY * f,
    y: PAD.top + innerH * (1 - f),
  }));

  const xAt = (i: number) => (n <= 1 ? PAD.left + innerW / 2 : PAD.left + (innerW * i) / (n - 1));
  const yAt = (v: number) => PAD.top + innerH * (1 - Math.min(v, maxY) / maxY);

  /** Tampilkan maksimal ~7 label tanggal agar tidak bertumpuk */
  const labelStep = Math.max(1, Math.ceil(n / 7));

  // Tidak ada data / semua nilai 0 → tidak dirender sama sekali (tanpa menyisakan ruang kosong)
  if (n === 0 || activeSeries.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-gray-700">{title}</h3>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
          {activeSeries.map((s) => (
            <span key={s.label} className="flex items-center gap-1">
              <span
                className="inline-block h-1.5 w-3 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-[10px] font-medium text-gray-500">{s.label}</span>
            </span>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Grafik ${title}`}
      >
        {/* Grid + label sumbu Y */}
        {ticks.map((t, i) => (
          <g key={`tick-${i}`}>
            <line
              x1={PAD.left}
              x2={VB_W - PAD.right}
              y1={t.y}
              y2={t.y}
              stroke={i === 0 ? "#cbd5e1" : "#eef2f6"}
              strokeWidth="1"
            />
            <text
              x={PAD.left - 6}
              y={t.y + 3.2}
              textAnchor="end"
              fontSize="10"
              fill="#94a3b8"
              className="tabular-nums"
            >
              {shortNumber(t.value, maxY)}
            </text>
          </g>
        ))}

        {/* Label sumbu X */}
        {labels.map((lb, i) =>
          i % labelStep === 0 || i === n - 1 ? (
            <text
              key={`x-${i}`}
              x={xAt(i)}
              y={VB_H - 7}
              textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
              fontSize="10"
              fill="#94a3b8"
            >
              {lb}
            </text>
          ) : null
        )}

        {/* Garis + titik */}
        {activeSeries.map((s) => {
          const pts = s.values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ");
          return (
            <g key={s.label}>
              <polyline
                points={pts}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {s.values.map((v, i) => (
                <circle key={`${s.label}-${i}`} cx={xAt(i)} cy={yAt(v)} r="2.8" fill="#fff" stroke={s.color} strokeWidth="2">
                  <title>{`${labels[i]} · ${s.label}: ${formatMonitoringNumber(v)} ${unit}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

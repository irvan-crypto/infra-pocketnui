import { formatMonitoringNumber } from "@/lib/monitoring-config";

export interface SiloTank {
  key: string; // kolom stok: stok_silo21
  nomor: number; // 21
  nama: string; // "Silo 21" (dari packing_plant)
  stok: number;
  kapasitas: number;
  deadstok: number;
}

// Geometri tabung (px SVG). cx = pusat, rx/ry = radius elips bibir tabung.
const CX = 43;
const RX = 35;
const RY = 7.5;
const TOP = 12; // jarak dari atas SVG ke bibir atas tabung

/**
 * Satu tabung silo pseudo-3D (SVG): bayangan dasar, badan silinder
 * bergradasi, bibir atas elips, deadstok abu tua, stok hijau dengan
 * permukaan elips + glow berdenyut, dan kilau yang naik perlahan.
 */
export function Tank({ tank, height = 170 }: { tank: SiloTank; height?: number }) {
  const H = height; // tinggi dinding tabung (px SVG)
  const deadH = (tank.deadstok / tank.kapasitas) * H;
  const sisaKapasitas = tank.kapasitas - tank.deadstok;
  // Stok grafik = stok bersih (stok - deadstok); jika stok < deadstok -> 0
  const netStok = Math.max(0, tank.stok - tank.deadstok);
  const stokH =
    sisaKapasitas > 0
      ? Math.max(0, Math.min(netStok / sisaKapasitas, 1)) * (H - deadH)
      : 0;
  const pct = Math.min(Math.round((tank.stok / tank.kapasitas) * 100), 100);

  const uid = `tank-${tank.nomor}`;
  const bottom = TOP + H;
  const stokTop = bottom - deadH - stokH;
  const svgH = bottom + RY + 16;

  // Garis level antara deadstok (hitam) & stok (hijau) tidak lurus: dibuat
  // melengkung ke bawah di tengah agar terlihat seperti silinder 3D.
  // levelY = chord lurus; lengkungnya sedalam 2*RY pada titik tengah.
  const levelY = bottom - deadH;
  const bulge = 2 * RY;
  // Deadstok: bidang atas & alas bawah melengkung (busur depan silinder)
  const bandPath =
    `M 8,${levelY} Q ${CX},${levelY + bulge} 78,${levelY} ` +
    `L 78,${bottom} Q ${CX},${bottom + bulge} 8,${bottom} Z`;
  // Stok: tambahan bagian di bawah chord (ikut melengkung) agar batasnya nyambung
  const greenLensPath = `M 8,${levelY} Q ${CX},${levelY + bulge} 78,${levelY} Z`;

  // Label data di dalam segmen.
  // Hijau = stok bersih (stok - deadstok); abu tua = deadstok.
  // Jika stok < deadstok: segmen hijau hilang (net = 0) dan segmen gelap
  // berlabel "Deadstock".
  const stokDiBawahDeadstok = tank.stok < tank.deadstok;
  const deadstokText = stokDiBawahDeadstok
    ? "Deadstock"
    : formatMonitoringNumber(tank.deadstok, true);
  const stokText = stokDiBawahDeadstok ? "" : formatMonitoringNumber(netStok, true);

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
        x={CX}
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
      return label(stokTop + stokH / 2, stokH, stokText);
    }
    const ruangAtas = stokTop - RY - TOP;
    if (ruangAtas >= 10) {
      // Di atas permukaan (elips): font 9, hijau tua agar kontras di badan abu
      return label(stokTop - RY - 3, 12, stokText, { fontSize: 9, fill: "#15803d" });
    }
    // Fallback: di dalam, font terkecil
    return label(stokTop + stokH / 2, stokH, stokText, { fontSize: 5.5 });
  })();

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width="86"
        height={svgH}
        viewBox={`0 0 86 ${svgH}`}
        role="img"
        aria-label={`${tank.nama}: ${tank.stok} ton dari ${tank.kapasitas} ton`}
      >
        <defs>
          {/* Gradasi badan silinder: terang (kiri) -> gelap (kanan) */}
          <linearGradient id={`${uid}-body`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.18" stopColor="#f8fafc" />
            <stop offset="0.55" stopColor="#e8eaed" />
            <stop offset="0.82" stopColor="#d5d9de" />
            <stop offset="1" stopColor="#b3b9c1" />
          </linearGradient>

          {/* Gradasi isi hijau (lebih pekat & kontras) */}
          <linearGradient id={`${uid}-green`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#4ade80" />
            <stop offset="0.22" stopColor="#22c55e" />
            <stop offset="0.55" stopColor="#16a34a" />
            <stop offset="0.82" stopColor="#15803d" />
            <stop offset="1" stopColor="#14532d" />
          </linearGradient>

          {/* Permukaan isi (elips di garis level) */}
          <linearGradient id={`${uid}-green-surface`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#22c55e" />
            <stop offset="0.45" stopColor="#15803d" />
            <stop offset="1" stopColor="#14532d" />
          </linearGradient>

          {/* Gradasi alas tabung: lebih gelap agar terkesan menapak tanah */}
          <linearGradient id={`${uid}-base`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#cfd5db" />
            <stop offset="0.45" stopColor="#a9b1ba" />
            <stop offset="0.8" stopColor="#8b939d" />
            <stop offset="1" stopColor="#767e88" />
          </linearGradient>

          {/* Gradasi deadstok */}
          <linearGradient id={`${uid}-dead`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#6b7280" />
            <stop offset="0.5" stopColor="#4b5563" />
            <stop offset="1" stopColor="#1f2937" />
          </linearGradient>

          {/* Bibir atas tabung (metalik) */}
          <linearGradient id={`${uid}-rim`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.5" stopColor="#e9ecef" />
            <stop offset="1" stopColor="#c3c9d1" />
          </linearGradient>

          {/* Kilau horizontal tipis di badan tabung */}
          <linearGradient id={`${uid}-shine`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="0.35" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="0.75" stopColor="#000000" stopOpacity="0.05" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.16" />
          </linearGradient>

          {/* Kilau yang naik perlahan di dalam segmen stok */}
          <linearGradient id={`${uid}-sheen`} x1="0" x2="0" y1="1" y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Bayangan dasar: kontak langsung (tanpa celah) */}
          <radialGradient id={`${uid}-shadow`}>
            <stop offset="0" stopColor="#0f172a" stopOpacity="0.34" />
            <stop offset="0.55" stopColor="#0f172a" stopOpacity="0.16" />
            <stop offset="1" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}-shadow-contact`}>
            <stop offset="0" stopColor="#0f172a" stopOpacity="0.55" />
            <stop offset="0.6" stopColor="#0f172a" stopOpacity="0.25" />
            <stop offset="1" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>

          {/* Bentuk silinder: dinding + alas elips */}
          <clipPath id={`${uid}-cyl`}>
            <rect x="8" y={TOP} width="70" height={H} />
            <ellipse cx={CX} cy={bottom} rx={RX} ry={RY} />
          </clipPath>

          {/* Pembatas segmen stok (badan + lidah lengkung) */}
          <clipPath id={`${uid}-stok`}>
            <rect x="8" y={stokTop} width="70" height={Math.max(0, stokH)} />
            <path d={greenLensPath} />
          </clipPath>

          {/* Pembatas permukaan stok: badan + lidah, plus ruang elips di atasnya */}
          <clipPath id={`${uid}-surf`}>
            <rect
              x="8"
              y={stokTop - RY}
              width="70"
              height={Math.max(0, levelY - stokTop + RY)}
            />
            <path d={greenLensPath} />
          </clipPath>

          {/* Pembatas segmen deadstok (kilau) */}
          <clipPath id={`${uid}-dead-seg`}>
            <path d={bandPath} />
          </clipPath>
        </defs>

        {/* Bayangan di dasar tabung: menempel pada titik terendah alas */}
        <ellipse
          cx={CX}
          cy={bottom + RY - 1}
          rx={RX + 11}
          ry={6}
          fill={`url(#${uid}-shadow)`}
        />
        <ellipse
          cx={CX}
          cy={bottom + RY - 1.5}
          rx={RX - 3}
          ry={3.4}
          fill={`url(#${uid}-shadow-contact)`}
        />

        {/* Badan tabung (ruang kosong / kapasitas) */}
        <rect
          x="8"
          y={TOP}
          width="70"
          height={H}
          fill={`url(#${uid}-body)`}
          stroke="#c7ccd3"
          strokeWidth="1"
        />
        {/* Alas tabung (lebih gelap, menapak) */}
        <ellipse
          cx={CX}
          cy={bottom}
          rx={RX}
          ry={RY}
          fill={`url(#${uid}-base)`}
          stroke="#a8b0ba"
          strokeWidth="1"
        />

        <g clipPath={`url(#${uid}-cyl)`}>
          {/* Deadstok (dasar) — bidang atas melengkung seperti silinder */}
          {deadH > 0 && (
            <path
              d={bandPath}
              fill={`url(#${uid}-dead)`}
            />
          )}

          {/* Kilau yang naik perlahan di dalam segmen deadstok */}
          {deadH > 6 && (
            <g clipPath={`url(#${uid}-dead-seg)`}>
              <rect x="8" width="70" height="46" fill={`url(#${uid}-sheen)`} opacity="0.45">
                <animate
                  attributeName="y"
                  from={bottom}
                  to={levelY - 46}
                  dur="3.8s"
                  begin="0.9s"
                  repeatCount="indefinite"
                />
              </rect>
            </g>
          )}

          {/* Stok bersih — badan + lidah melengkung di garis level */}
          {stokH > 0 && (
            <>
              <rect
                className="tank-fill-anim"
                x="8"
                y={stokTop}
                width="70"
                height={stokH}
                fill={`url(#${uid}-green)`}
              />
              <path d={greenLensPath} fill={`url(#${uid}-green)`} />
            </>
          )}

          {/* Kilau yang naik perlahan di dalam segmen stok */}
          {stokH > 6 && (
            <g clipPath={`url(#${uid}-stok)`}>
              <rect x="8" width="70" height="46" fill={`url(#${uid}-sheen)`} opacity="0.55">
                <animate
                  attributeName="y"
                  from={levelY}
                  to={stokTop - 46}
                  dur="3.8s"
                  repeatCount="indefinite"
                />
              </rect>
            </g>
          )}

          {/* Permukaan stok (statis): elips hijau di garis level, dipotong
              mengikuti bentuk segmen agar tidak menimpa deadstok */}
          {stokH > 0 && (
            <g clipPath={`url(#${uid}-surf)`}>
              <g
                style={{
                  transform: `translateY(${stokTop - bottom}px)`,
                  transition: "transform 700ms cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <ellipse
                  cx={CX}
                  cy={bottom}
                  rx={RX}
                  ry={RY}
                  fill={`url(#${uid}-green-surface)`}
                />
              </g>
            </g>
          )}

          {/* Label data */}
          {label(
            bottom - deadH / 2,
            deadH,
            deadstokText,
            // teks "Deadstock" lebih panjang → font dikecilkan agar tidak meluber
            stokDiBawahDeadstok ? { fontSize: 8.5 } : undefined
          )}
          {stokLabel}

          {/* Kilau vertikal badan tabung */}
          <rect x="8" y={TOP} width="70" height={H} fill={`url(#${uid}-shine)`} />
        </g>

        {/* Bibir atas tabung */}
        <ellipse
          cx={CX}
          cy={TOP}
          rx={RX}
          ry={RY}
          fill={`url(#${uid}-rim)`}
          stroke="#a8b0ba"
          strokeWidth="1"
        />
        <ellipse
          cx={CX}
          cy={TOP}
          rx={RX - 6}
          ry={RY - 2.4}
          fill="#e3e7ec"
          stroke="#c7ccd3"
          strokeWidth="0.8"
        />
      </svg>

      <div className="text-center">
        <p className="text-xs font-bold text-gray-800">{tank.nama}</p>
        <p className="text-xs font-bold text-gray-700 tabular-nums">
          {formatMonitoringNumber(tank.stok)} ton
        </p>
        <p className="text-[10px] font-bold text-gray-400 tabular-nums">{pct}% terisi</p>
      </div>
    </div>
  );
}

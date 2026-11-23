"use client";

import { useEffect, useMemo, useState } from "react";
import ShipmentMap from "@/components/dashboard/ShipmentMap";
import DataTable from "@/components/ui/DataTable";
import PeriodFilter from "@/components/ui/PeriodFilter";
import { Maximize2, Minimize2, Ship, Anchor, Navigation, Factory } from "lucide-react";
import { SHIP_STATUS_ORDER, SHIP_STATUS_LABELS, type ShipStatusKey } from "@/lib/app-config";
import { formatDateIndonesian } from "@/lib/utils";
import {
  availableMonths,
  availableYears,
  defaultPeriod,
  filterByPeriod,
  normalizePeriod,
  periodLabel,
  shipmentPeriodDate,
  type Period,
} from "@/lib/period";

interface Shipment {
  id: string;
  nama_kapal: string;
  nama_vendor: string;
  type_muatan: string;
  muatan_ton: number;
  tujuan_pp: string;
  pelabuhan_asal: string;
  ta_tiba: string | null;
  sandar: string | null;
  muat: string | null;
  selesai_muat: string | null;
  td_pelabuhan: string | null;
  ta_pp: string | null;
  sandar_pp: string | null;
  bongkar_pp: string | null;
  selesai_pp: string | null;
  td_pp: string | null;
  created_at: string;
  updated_at: string;
}

function getLatestStatus(shipment: Shipment): { status: string; timestamp: string | null } {
  const fields = SHIP_STATUS_ORDER.map((key) => ({
    key,
    value: shipment[key as keyof Shipment] as string | null,
  }));
  let latest: { key: string; value: string | null } | null = null;
  let latestDate: Date | null = null;
  for (const f of fields) {
    if (f.value) {
      const d = new Date(f.value);
      if (!latestDate || d > latestDate) {
        latestDate = d;
        latest = f;
      }
    }
  }
  return latest ? { status: latest.key, timestamp: latest.value } : { status: "ta_tiba", timestamp: null };
}

function getLatestStatusTimestamp(shipment: Shipment): number {
  let latest = 0;
  for (const key of SHIP_STATUS_ORDER) {
    const value = shipment[key as keyof Shipment] as string | null;
    if (value) {
      const t = new Date(value).getTime();
      if (!Number.isNaN(t) && t > latest) latest = t;
    }
  }
  return latest;
}

export default function ShipmentLautPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  /** Filter periode: acuan td_pelabuhan (fallback tanggal lain di baris) */
  const [period, setPeriod] = useState<Period | null>(null);

  const periodYears = useMemo(() => availableYears(shipments, shipmentPeriodDate), [shipments]);
  const activePeriod = useMemo(
    () =>
      normalizePeriod(
        shipments,
        shipmentPeriodDate,
        period ?? defaultPeriod(shipments, shipmentPeriodDate)
      ),
    [shipments, period]
  );
  const periodMonths = useMemo(
    () => availableMonths(shipments, shipmentPeriodDate, activePeriod.year),
    [shipments, activePeriod.year]
  );
  const periodShipments = useMemo(
    () => filterByPeriod(shipments, shipmentPeriodDate, activePeriod, { keepUndated: true }),
    [shipments, activePeriod]
  );

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      // Lewat API (sesi cookie) — bukan anon key, sehingga RLS bisa dikunci
      const res = await fetch("/api/shipments", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json.ok === false) {
        throw new Error(json.message || "Gagal mengambil data shipment");
      }

      const list = (json.data || []) as Shipment[];
      setShipments(list);
    } catch (error) {
      console.error(
        "Error fetching shipments:",
        error instanceof Error ? error.message : JSON.stringify(error, null, 2)
      );
      if (shipments.length === 0) {
        const mockShipments: Shipment[] = [
          {
            id: "1",
            nama_kapal: "TL.XXI",
            nama_vendor: "PT. Pelayaran Nusantara",
            type_muatan: "Semen",
            muatan_ton: 1200.5,
            tujuan_pp: "PP. Bitung",
            pelabuhan_asal: "Pelabuhan Biringkassi",
            ta_tiba: "2026-09-08T08:00:00",
            sandar: "2026-09-08T12:00:00",
            muat: "2026-09-09T09:30:00",
            selesai_muat: "2026-09-09T16:45:00",
            td_pelabuhan: "2026-09-10T06:00:00",
            ta_pp: "2026-09-10T18:00:00",
            sandar_pp: "2026-09-10T19:00:00",
            bongkar_pp: "2026-09-11T06:00:00",
            selesai_pp: "2026-09-11T14:00:00",
            td_pp: "2026-09-12T06:00:00",
            created_at: "2026-09-08T08:00:00",
            updated_at: "2026-09-10T18:00:00",
          },
          {
            id: "2",
            nama_kapal: "KM. Bahari",
            nama_vendor: "PT. Samudera",
            type_muatan: "Semen",
            muatan_ton: 850.75,
            tujuan_pp: "PP. Palu",
            pelabuhan_asal: "Pelabuhan Tuban",
            ta_tiba: "2026-09-07T06:30:00",
            sandar: "2026-09-07T10:00:00",
            muat: "2026-09-08T08:15:00",
            selesai_muat: "2026-09-08T14:00:00",
            td_pelabuhan: "2026-09-09T07:00:00",
            ta_pp: null,
            sandar_pp: null,
            bongkar_pp: null,
            selesai_pp: null,
            td_pp: null,
            created_at: "2026-09-07T06:30:00",
            updated_at: "2026-09-09T07:00:00",
          },
          {
            id: "3",
            nama_kapal: "MV. Nusantara",
            nama_vendor: "PT. Lautan",
            type_muatan: "Semen",
            muatan_ton: 2000.0,
            tujuan_pp: "PP. Balikpapan",
            pelabuhan_asal: "Pelabuhan Biringkassi",
            ta_tiba: "2026-09-06T10:00:00",
            sandar: "2026-09-06T14:30:00",
            muat: "2026-09-07T07:00:00",
            selesai_muat: "2026-09-07T15:30:00",
            td_pelabuhan: "2026-09-08T06:00:00",
            ta_pp: "2026-09-08T18:00:00",
            sandar_pp: null,
            bongkar_pp: null,
            selesai_pp: null,
            td_pp: null,
            created_at: "2026-09-06T10:00:00",
            updated_at: "2026-09-08T18:00:00",
          },
        ];
        setShipments(mockShipments);
      }
    } finally {
      setLoading(false);
    }
  };

  // Tabel Ship Monitor: record terbaru per kombinasi nama_kapal + type_muatan.
  // Kapal sama dengan muatan berbeda tetap tampil sebagai baris terpisah.
  const tableShipments = useMemo(() => {
    const map = new Map<string, Shipment>();
    for (const s of periodShipments) {
      const key = `${s.nama_kapal}\u0000${s.type_muatan}`;
      const existing = map.get(key);
      if (!existing || getLatestStatusTimestamp(s) > getLatestStatusTimestamp(existing)) {
        map.set(key, s);
      }
    }
    return Array.from(map.values());
  }, [periodShipments]);

  // Peta: merge jadi 1 icon per nama_kapal (walau type_muatan berbeda),
  // ambil record dengan timestamp status terakhir paling baru.
  const mapShipments = useMemo(() => {
    const map = new Map<string, Shipment>();
    for (const s of periodShipments) {
      const existing = map.get(s.nama_kapal);
      if (!existing || getLatestStatusTimestamp(s) > getLatestStatusTimestamp(existing)) {
        map.set(s.nama_kapal, s);
      }
    }
    return Array.from(map.values());
  }, [periodShipments]);

  // Kartu ringkasan: total muatan & jumlah kapal unik per status terakhir.
  // Status terakhir = kolom status terakhir yang terisi (urutan SHIP_STATUS_ORDER).
  const statusTotals = useMemo(() => {
    const bucket = () => ({
      ton: 0,
      kapal: new Set<string>(),
      bks: 0,
      tuban: 0,
      bksKapal: new Set<string>(),
      tubanKapal: new Set<string>(),
    });
    const out = {
      berlabuh: bucket(),
      belumBerangkat: bucket(),
      perjalanan: bucket(),
      tibaPp: bucket(),
    };
    const BELUM = ["sandar", "muat", "selesai_muat"];

    for (const row of periodShipments) {
      let status: string | null = null;
      for (let i = SHIP_STATUS_ORDER.length - 1; i >= 0; i--) {
        const key = SHIP_STATUS_ORDER[i];
        if (row[key as keyof Shipment]) {
          status = key;
          break;
        }
      }
      if (!status) continue;

      let target: "berlabuh" | "belumBerangkat" | "perjalanan" | "tibaPp";
      if (status === "ta_tiba") target = "berlabuh";
      else if (BELUM.includes(status)) target = "belumBerangkat";
      else if (status === "td_pelabuhan") target = "perjalanan";
      else target = "tibaPp";

      const ton = Number(row.muatan_ton || 0);
      const vessel = String(row.nama_kapal ?? "").trim().toLowerCase() || "-";
      const port = String(row.pelabuhan_asal ?? "").toLowerCase();

      out[target].ton += ton;
      out[target].kapal.add(vessel);
      if (port.includes("biringkassi")) {
        out[target].bks += ton;
        out[target].bksKapal.add(vessel);
      } else if (port.includes("tuban")) {
        out[target].tuban += ton;
        out[target].tubanKapal.add(vessel);
      }
    }
    return out;
  }, [periodShipments]);

  type StatusCardItem = [string, number, number, number, number, number, number, React.ReactNode];

  const statusCards: StatusCardItem[] = [
    [
      "Kapal Berlabuh",
      statusTotals.berlabuh.ton,
      statusTotals.berlabuh.kapal.size,
      statusTotals.berlabuh.bks,
      statusTotals.berlabuh.bksKapal.size,
      statusTotals.berlabuh.tuban,
      statusTotals.berlabuh.tubanKapal.size,
      <Ship key="sb" size={18} className="text-blue-600" />,
    ],
    [
      "Kapal Belum Berangkat",
      statusTotals.belumBerangkat.ton,
      statusTotals.belumBerangkat.kapal.size,
      statusTotals.belumBerangkat.bks,
      statusTotals.belumBerangkat.bksKapal.size,
      statusTotals.belumBerangkat.tuban,
      statusTotals.belumBerangkat.tubanKapal.size,
      <Anchor key="ab" size={18} className="text-amber-600" />,
    ],
    [
      "Kapal Di Perjalanan",
      statusTotals.perjalanan.ton,
      statusTotals.perjalanan.kapal.size,
      statusTotals.perjalanan.bks,
      statusTotals.perjalanan.bksKapal.size,
      statusTotals.perjalanan.tuban,
      statusTotals.perjalanan.tubanKapal.size,
      <Navigation key="np" size={18} className="text-indigo-600" />,
    ],
    [
      "Kapal Tiba Packing Plant",
      statusTotals.tibaPp.ton,
      statusTotals.tibaPp.kapal.size,
      statusTotals.tibaPp.bks,
      statusTotals.tibaPp.bksKapal.size,
      statusTotals.tibaPp.tuban,
      statusTotals.tibaPp.tubanKapal.size,
      <Factory key="fp" size={18} className="text-emerald-600" />,
    ],
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500">Memuat data kapal...</p>
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: "nama_kapal",
      header: "Nama Kapal",
      render: (s: Shipment) => <span className="font-bold">{s.nama_kapal}</span>,
    },
    {
      key: "pelabuhan_asal",
      header: "Pelabuhan",
      render: (s: Shipment) => <span>{s.pelabuhan_asal || "-"}</span>,
    },
    {
      key: "tujuan_pp",
      header: "Tujuan",
      render: (s: Shipment) => <span>{s.tujuan_pp || "-"}</span>,
    },
    {
      key: "type_muatan",
      header: "Type Muatan",
      render: (s: Shipment) => <span>{s.type_muatan || "-"}</span>,
    },
    {
      key: "muatan_ton",
      header: "Muatan",
      className: "text-right",
      render: (s: Shipment) => (
        <span className="font-bold">
          {s.muatan_ton.toLocaleString("id-ID", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          ton
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (s: Shipment) => {
        const { status, timestamp } = getLatestStatus(s);
        const label = SHIP_STATUS_LABELS[status as ShipStatusKey] || status;
        return (
          <span className="text-xs">
            {label}
            {timestamp ? ` ${formatDateIndonesian(timestamp)}` : ""}
          </span>
        );
      },
    },
  ];

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Peta Monitoring Kapal</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Posisi & status kapal — {periodLabel(activePeriod)}
          </p>
        </div>
        <PeriodFilter
          years={periodYears}
          months={periodMonths}
          value={activePeriod}
          onChange={setPeriod}
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statusCards.map(([label, value, kapal, bks, bksKapal, tuban, tubanKapal, icon]) => (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4" key={label}>
            {icon}
            <div className="mt-2 flex items-start justify-between gap-2">
              <p className="text-xs text-gray-500">{label}</p>
              <div className="text-right">
                <p className="text-[11px] sm:text-xs font-semibold text-gray-700 whitespace-nowrap">
                  {kapal.toLocaleString("id-ID")} kapal
                </p>
                {bks > 0 && (
                  <p className="text-[10px] text-gray-500 whitespace-nowrap">
                    BKS - {Math.round(bks).toLocaleString("id-ID")} ({bksKapal.toLocaleString("id-ID")})
                  </p>
                )}
                {tuban > 0 && (
                  <p className="text-[10px] text-gray-500 whitespace-nowrap">
                    Tuban - {Math.round(tuban).toLocaleString("id-ID")} ({tubanKapal.toLocaleString("id-ID")})
                  </p>
                )}
              </div>
            </div>
            <p className="text-xl font-bold text-gray-800">
              {Math.round(value).toLocaleString("id-ID")}{" "}
              <span className="text-xs font-medium text-gray-400">ton</span>
            </p>
          </div>
        ))}
      </div>

      <div className="w-full flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Peta Sebaran Kapal</h2>
          {isFullScreen && (
            <button
              type="button"
              onClick={() => setIsFullScreen(false)}
              className="fixed top-4 right-4 z-[1000] flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-lg"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Kembali</span>
            </button>
          )}
          {!isFullScreen && (
            <button
              type="button"
              onClick={() => setIsFullScreen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Full Screen</span>
            </button>
          )}
        </div>
        <div className={isFullScreen ? "fixed inset-0 z-[100] bg-white rounded-none border-0 shadow-none h-screen w-full" : "h-[600px] w-full rounded-xl border border-gray-200 shadow-sm relative"}>
          <ShipmentMap shipments={mapShipments} fullScreen={isFullScreen} />
        </div>
      </div>

      <DataTable
        title={
          <span className="flex flex-wrap items-center gap-2">
            Ship Monitor
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">
              {periodLabel(activePeriod)}
            </span>
          </span>
        }
        columns={columns}
        data={tableShipments}
        searchable
        searchPlaceholder="Cari kapal, pelabuhan, tujuan..."
      />
    </div>
  );
}
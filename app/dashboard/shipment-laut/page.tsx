"use client";

import { useEffect, useMemo, useState } from "react";
import ShipmentMap from "@/components/dashboard/ShipmentMap";
import DataTable from "@/components/ui/DataTable";
import { createClient } from "@/lib/supabase/client";
import { SHIP_STATUS_ORDER, SHIP_STATUS_LABELS, type ShipStatusKey } from "@/lib/app-config";
import { formatDateIndonesian } from "@/lib/utils";

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

  const supabase = createClient();

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("shipments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      const list = (data || []) as Shipment[];
      if (list.length === 0) {
        throw new Error(
          'Supabase mengembalikan 0 baris. Kemungkinan RLS memblokir akses anon key (jalankan supabase-fix-rls.sql).'
        );
      }
      setShipments(list);
    } catch (error) {
      console.error("Error fetching shipments:", error);
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
    for (const s of shipments) {
      const key = `${s.nama_kapal}\u0000${s.type_muatan}`;
      const existing = map.get(key);
      if (!existing || getLatestStatusTimestamp(s) > getLatestStatusTimestamp(existing)) {
        map.set(key, s);
      }
    }
    return Array.from(map.values());
  }, [shipments]);

  // Peta: merge jadi 1 icon per nama_kapal (walau type_muatan berbeda),
  // ambil record dengan timestamp status terakhir paling baru.
  const mapShipments = useMemo(() => {
    const map = new Map<string, Shipment>();
    for (const s of shipments) {
      const existing = map.get(s.nama_kapal);
      if (!existing || getLatestStatusTimestamp(s) > getLatestStatusTimestamp(existing)) {
        map.set(s.nama_kapal, s);
      }
    }
    return Array.from(map.values());
  }, [shipments]);

  const stats = useMemo(() => {
    const total = mapShipments.length;
    let inProgress = 0;
    let completed = 0;
    for (const s of mapShipments) {
      const { status } = getLatestStatus(s);
      if (status === "ta_pp") completed++;
      else inProgress++;
    }
    return { total, inProgress, completed };
  }, [mapShipments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Kapal</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Dalam Perjalanan</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{stats.inProgress}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Selesai (TA. PP)</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
      </div>

      <div className="w-full flex flex-col">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Peta Monitoring Kapal</h1>
        <div className="h-[600px] w-full">
          <ShipmentMap shipments={mapShipments} />
        </div>
      </div>

      <DataTable
        title="Ship Monitor"
        columns={columns}
        data={tableShipments}
        searchable
        searchPlaceholder="Cari kapal, pelabuhan, tujuan..."
      />
    </div>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Warehouse, Factory, Truck, Package } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessPath } from "@/lib/access";
import ExpediturSummaryCards, {
  type ExpediturSummary,
} from "@/components/monitoring/ExpediturSummaryCards";
import {
  MONITORING_CONFIGS,
  formatMonitoringNumber,
  formatTanggalPanjang,
  monitoringFieldValue,
  type MonitoringTableConfig,
} from "@/lib/monitoring-config";

type Row = Record<string, any>;

function StatCard({
  label,
  value,
  suffix,
  footer,
  href,
  icon,
}: {
  label: string;
  value: string;
  suffix?: string;
  footer?: string;
  href?: string;
  icon?: React.ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        {icon && <span className="text-gray-300">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">
        {value}
        {suffix && <span className="text-sm font-medium text-gray-400 ml-1">{suffix}</span>}
      </p>
      {footer && <p className="mt-1 text-[10px] text-gray-400">{footer}</p>}
    </>
  );

  const cls =
    "block bg-white rounded-xl shadow-sm border border-gray-100 p-5 transition-shadow hover:shadow-md";

  return href ? (
    <Link href={href} className={cls}>
      {body}
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600">
        Detail <ArrowRight size={12} />
      </span>
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export default function MonitoringSummary() {
  const { user } = useAuth();
  /** Href hanya aktif bila role boleh membuka halamannya */
  const linkIf = (href: string) => (canAccessPath(user?.role, href, user) ? href : undefined);

  const [latest, setLatest] = useState<Record<string, Row | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/monitoring-summary");
        const data = await res.json();
        if (data.ok) setLatest(data.latest || {});
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const silo = latest["silo_semen"];
  const totalSilo = useMemo(() => {
    if (!silo) return null;
    const keys = MONITORING_CONFIGS.find((c) => c.table === "silo_semen")!.fields.map((f) => f.key);
    return keys.reduce((sum, k) => sum + Number(silo[k] || 0), 0);
  }, [silo]);

  const pantai = latest["silo_pantai"];
  const totalPantai = useMemo(() => {
    if (!pantai) return null;
    if (pantai.total_stok !== null && pantai.total_stok !== undefined) {
      return Number(pantai.total_stok);
    }
    const keys = MONITORING_CONFIGS
      .find((c) => c.table === "silo_pantai")!
      .fields.filter((f) => !f.generated && !f.virtual)
      .map((f) => f.key);
    return keys.reduce((sum, k) => sum + Number(pantai[k] || 0), 0);
  }, [pantai]);

  const cp = latest["cp_tonasa"];
  const birk = latest["pp_biringkassi"];
  const mini = latest["silo_mini"];
  const angkut = latest["angkutan_darat"];

  // PP cabang: gabungan baris terbaru PP1 + PP2
  const ppConfigs = MONITORING_CONFIGS.filter(
    (c) => c.slug.startsWith("pp1-") || c.slug.startsWith("pp2-")
  );
  const ppRows = useMemo(() => {
    return ppConfigs
      .map((cfg: MonitoringTableConfig) => {
        const row = latest[cfg.table];
        // Cari key kolom berdasarkan akhiran (struktur PP: *_masuk_opc, dst.)
        const keyOf = (suffix: string) =>
          cfg.fields.find((f) => f.key.endsWith(suffix))?.key;
        const num = (suffix: string) => {
          if (!row) return null;
          const k = keyOf(suffix);
          return k ? Number(row[k] || 0) : null;
        };
        // Total rilis OPC = total curah + total zak (kolom virtual, dihitung di UI)
        const totalRilis = cfg.fields.find(
          (f) => f.virtual && f.key.endsWith("_totalrilis_opc")
        );
        return {
          id: cfg.slug,
          lokasi: cfg.title,
          grup: cfg.slug.startsWith("pp1-") ? "PP1" : "PP2",
          tanggal: row?.tanggal || null,
          masuk: num("_masuk_opc"),
          rilis: row && totalRilis ? monitoringFieldValue(row, totalRilis) : null,
          stok: num("_stokakhir_opc"),
        };
      })
      .sort((a, b) => a.grup.localeCompare(b.grup) || a.lokasi.localeCompare(b.lokasi));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest]);

  const ppColumns = useMemo(
    () => [
      {
        key: "lokasi",
        header: "Lokasi",
        render: (r: any) =>
          canAccessPath(user?.role, `/monitoring/${r.id}`, user) ? (
            <Link href={`/monitoring/${r.id}`} className="font-semibold text-blue-600 hover:underline">
              {r.lokasi}
            </Link>
          ) : (
            <span className="font-semibold text-gray-700">{r.lokasi}</span>
          ),
      },
      {
        key: "grup",
        header: "Grup",
        render: (r: any) => (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {r.grup}
          </span>
        ),
      },
      {
        key: "tanggal",
        header: "Tanggal",
        render: (r: any) => <span className="text-gray-500">{formatTanggalPanjang(r.tanggal)}</span>,
      },
      {
        key: "masuk",
        header: "Masuk OPC (ton)",
        className: "text-right",
        render: (r: any) => <span className="tabular-nums">{r.masuk === null ? "-" : formatMonitoringNumber(r.masuk)}</span>,
      },
      {
        key: "rilis",
        header: "Rilis OPC (ton)",
        className: "text-right",
        render: (r: any) => <span className="tabular-nums">{r.rilis === null ? "-" : formatMonitoringNumber(r.rilis)}</span>,
      },
      {
        key: "stok",
        header: "Stok Akhir OPC (ton)",
        className: "text-right",
        render: (r: any) => <span className="tabular-nums font-semibold">{r.stok === null ? "-" : formatMonitoringNumber(r.stok)}</span>,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-500">Memuat ringkasan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ringkasan Monitoring</h1>
        <p className="text-sm text-gray-500 mt-0.5">Data terbaru dari seluruh tabel monitoring harian</p>
      </div>

      {/* Stok utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          label="Total Stok Silo Semen"
          value={totalSilo === null ? "-" : formatMonitoringNumber(totalSilo)}
          suffix="ton"
          footer={silo ? `Per ${formatTanggalPanjang(silo.tanggal)} (10 silo)` : "Belum ada data"}
          href={linkIf("/monitoring/silo-semen")}
          icon={<Warehouse size={20} />}
        />
        <StatCard
          label="Total Stok Silo Pantai"
          value={totalPantai === null ? "-" : formatMonitoringNumber(totalPantai)}
          suffix="ton"
          footer={pantai ? `Per ${formatTanggalPanjang(pantai.tanggal)} (10 silo)` : "Belum ada data"}
          href={linkIf("/monitoring/silo-pantai")}
          icon={<Warehouse size={20} />}
        />
        <StatCard
          label="Stok OPC — PP Biringkassi"
          value={birk ? formatMonitoringNumber(birk.stok_opc) : "-"}
          suffix="ton"
          footer={birk ? `Per ${formatTanggalPanjang(birk.tanggal)}` : "Belum ada data"}
          href={linkIf("/monitoring/pp-biringkassi")}
          icon={<Factory size={20} />}
        />
        <StatCard
          label="Stok PCC — PP Biringkassi"
          value={birk ? formatMonitoringNumber(birk.stok_pcc) : "-"}
          suffix="ton"
          footer={birk ? `Per ${formatTanggalPanjang(birk.tanggal)}` : "Belum ada data"}
          href={linkIf("/monitoring/pp-biringkassi")}
          icon={<Factory size={20} />}
        />
        <StatCard
          label="Stok OPC — Silo Mini"
          value={mini ? formatMonitoringNumber(mini.stok_opc) : "-"}
          suffix="ton"
          footer={mini ? `Per ${formatTanggalPanjang(mini.tanggal)}` : "Belum ada data"}
          href={linkIf("/monitoring/silo-mini")}
          icon={<Package size={20} />}
        />
      </div>

      {/* CP Tonasa terbaru */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">CP Tonasa — Data Terbaru</h2>
        {linkIf("/monitoring/cp-tonasa") && (
          <Link href="/monitoring/cp-tonasa" className="text-xs font-medium text-blue-600 hover:underline inline-flex items-center gap-1">
            Lihat semua <ArrowRight size={12} />
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Produksi FM (OPC)"
          value={cp ? formatMonitoringNumber(cp.prod_fmopc) : "-"}
          suffix="ton"
          footer={cp ? formatTanggalPanjang(cp.tanggal) : "Belum ada data"}
        />
        <StatCard
          label="Total Rilis (OPC)"
          value={cp ? formatMonitoringNumber(cp.total_rilisopc) : "-"}
          suffix="ton"
          footer={cp ? formatTanggalPanjang(cp.tanggal) : "Belum ada data"}
        />
        <StatCard
          label="Produksi FM (PCC)"
          value={cp ? formatMonitoringNumber(cp.prod_fmpcc) : "-"}
          suffix="ton"
          footer={cp ? formatTanggalPanjang(cp.tanggal) : "Belum ada data"}
        />
        <StatCard
          label="Total Rilis (PCC)"
          value={cp ? formatMonitoringNumber(cp.total_rilispcc) : "-"}
          suffix="ton"
          footer={cp ? formatTanggalPanjang(cp.tanggal) : "Belum ada data"}
        />
      </div>

      {/* Angkutan darat terbaru */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Angkutan Darat — Data Terbaru</h2>
        {linkIf("/monitoring/angkutan-darat") && (
          <Link href="/monitoring/angkutan-darat" className="text-xs font-medium text-blue-600 hover:underline inline-flex items-center gap-1">
            Lihat semua <ArrowRight size={12} />
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Expeditur"
          value={angkut?.nama_expeditur || "-"}
          footer={angkut ? formatTanggalPanjang(angkut.tanggal) : "Belum ada data"}
          icon={<Truck size={20} />}
        />
        <StatCard
          label="Retase"
          value={angkut ? formatMonitoringNumber(angkut.retase, true) : "-"}
          footer={angkut ? formatTanggalPanjang(angkut.tanggal) : "Belum ada data"}
        />
        <StatCard
          label="Tonase"
          value={angkut ? formatMonitoringNumber(angkut.tonase) : "-"}
          suffix="ton"
          footer={angkut ? formatTanggalPanjang(angkut.tanggal) : "Belum ada data"}
        />
        <StatCard
          label="Armada Operasi"
          value={angkut ? formatMonitoringNumber(angkut.armada_operasi, true) : "-"}
          suffix="unit"
          footer={angkut ? formatTanggalPanjang(angkut.tanggal) : "Belum ada data"}
        />
      </div>

      {/* Ringkasan per expeditur: MTD & Harian */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
          Ringkasan Expeditur — MTD & Harian
        </h2>
        {linkIf("/monitoring/angkutan-darat") && (
          <Link href="/monitoring/angkutan-darat" className="text-xs font-medium text-blue-600 hover:underline inline-flex items-center gap-1">
            Lihat semua <ArrowRight size={12} />
          </Link>
        )}
      </div>
      <div className="mb-6">
        <ExpediturSummaryCards />
      </div>

      {/* PP cabang */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Stok Terbaru — PP Cabang</h2>
      </div>
      <DataTable
        title="PP1 & PP2 Cabang (baris terbaru)"
        columns={ppColumns as any}
        data={ppRows}
        searchable={false}
      />
    </div>
  );
}

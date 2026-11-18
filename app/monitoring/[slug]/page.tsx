import { notFound } from "next/navigation";
import MonitoringPage from "@/components/monitoring/MonitoringPage";
import { getMonitoringConfig } from "@/lib/monitoring-config";

// Route dinamis untuk semua tabel monitoring harian:
// /monitoring/silo-semen, /monitoring/cp-tonasa, /monitoring/pp1-samarinda, dst.
export default async function MonitoringDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = getMonitoringConfig(slug);
  if (!config) notFound();
  return <MonitoringPage config={config} />;
}

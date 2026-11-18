"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_META, normalizeRole } from "@/lib/roles";

interface Props {
  /** Nama halaman / fitur yang tidak boleh diakses */
  feature?: string;
  /** Role yang sebenarnya dibutuhkan */
  requiredRoles?: string[];
}

// ============================================================
// Tampilan 403 untuk halaman yang tidak boleh diakses role ini
// ============================================================
export default function AccessDenied({ feature, requiredRoles }: Props) {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const roleName = role ? ROLE_META[role].label : "Tidak dikenal";
  const allowed = requiredRoles && requiredRoles.length > 0 ? requiredRoles.join(", ") : null;

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full bg-white border border-gray-100 rounded-2xl shadow-sm p-6 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
          <ShieldAlert size={24} />
        </div>
        <h1 className="text-lg font-semibold text-gray-900">Akses Ditolak</h1>
        <p className="text-sm text-gray-500 mt-2">
          {feature ? (
            <>Halaman <span className="font-medium text-gray-700">{feature}</span> tidak dapat diakses oleh role Anda.</>
          ) : (
            "Halaman ini tidak dapat diakses oleh role Anda."
          )}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Role Anda: <span className="font-semibold">{roleName}</span>
          {allowed && <> · Membutuhkan: {allowed}</>}
        </p>
        <Link
          href="/dashboard/shipment-laut"
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
        >
          <ArrowLeft size={16} /> Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}

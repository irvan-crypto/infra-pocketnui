"use client";

import { useState, useEffect, type ReactNode } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import LoginScreen from "@/components/LoginScreen";
import AccessDenied from "@/components/AccessDenied";
import { canAccessPath, getRouteRule } from "@/lib/access";
import { usePathname } from "next/navigation";

function LayoutContent({ children }: { children: ReactNode }) {
  const { user, ready, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-500">Memuat Aplikasi...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Guard halaman: role yang tidak berhak tidak pernah melihat kontennya
  const rule = getRouteRule(pathname);
  const allowed = canAccessPath(user?.role, pathname, user);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        collapsed={sidebarCollapsed && !mobileOpen}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div
        className={`flex flex-col min-h-screen w-full transition-all duration-300 ${
          sidebarCollapsed
            ? "lg:ml-[72px] lg:w-[calc(100%-72px)]"
            : "lg:ml-[260px] lg:w-[calc(100%-260px)]"
        }`}
      >
        <Header onMobileMenu={() => setMobileOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-full">
          <div className="w-full mx-auto" style={{ maxWidth: "1440px" }}>
            {allowed ? (
              children
            ) : (
              <AccessDenied feature={rule?.label} requiredRoles={rule?.roles} />
            )}
          </div>
        </main>

        <footer className="text-right px-4 sm:px-6 lg:px-8 pb-4">
          <p className="text-[10px] text-gray-400">&copy; 2026 SIMIRA — design by NUI6184</p>
        </footer>
      </div>
    </div>
  );
}

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LayoutContent>{children}</LayoutContent>
    </AuthProvider>
  );
}

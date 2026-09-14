"use client";

import { useState, useEffect, type ReactNode } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/Sidebar";
import LoginScreen from "@/components/LoginScreen";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MENU, getItemHref, isChildActive, isGroupActive } from "@/lib/menu";

function LayoutContent({ children }: { children: ReactNode }) {
  const { ready, isAuthenticated, user, logout } = useAuth();
  const pathname = usePathname();
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    setShowProfile(false);
  }, [pathname]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-gray-500">Memuat Aplikasi...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <>
      <Sidebar />

      <div className="lg:ml-[var(--sidebar-width)] min-h-screen flex flex-col pb-16 lg:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-20 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-end px-4 md:px-8">

          <div className="flex items-center gap-4 relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 text-[#1a56db] hover:bg-blue-200 transition-all"
            >
              {user?.namaLengkap?.charAt(0) || "U"}
            </button>

            {showProfile && user && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{user.namaLengkap}</p>
                    <p className="text-xs text-gray-500">{user.role}</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => { setShowProfile(false); logout(); }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>

        <footer className="text-center text-xs text-gray-400 py-3 border-t border-gray-100">
          &copy; 2026 ShipMonitor — PT. Semen Tonasa / SBI
        </footer>
      </div>

      {/* Bottom Nav (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex lg:hidden items-center justify-around bg-[radial-gradient(circle_at_top,_rgba(26,86,219,.2),_transparent_34%),linear-gradient(135deg,_#0f172a_0%,_#1e3a5f_35%,_#0d9488_100%)] shadow-[0_-4px_20px_rgba(0,0,0,0.35)] px-1 py-1">
        {MENU.map((item) => {
          const Icon = item.icon;
          const href = getItemHref(item);
          if (!href) return null;
          const active = item.children
            ? isGroupActive(pathname, item)
            : isChildActive(pathname, href);
          return (
            <Link
              key={item.title}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg transition-all min-w-0",
                active ? "text-white" : "text-white/60 hover:text-white/90"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-medium truncate max-w-[56px]">{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LayoutContent>{children}</LayoutContent>
    </AuthProvider>
  );
}
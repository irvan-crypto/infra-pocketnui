"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { MENU, isChildActive, isGroupActive, getItemHref } from "@/lib/menu";
import { canAccessPath } from "@/lib/access";
import { APP_NAME } from "@/lib/app-config";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const item of MENU) {
      if (item.children && isGroupActive(pathname, item)) {
        next[item.title] = true;
      }
    }
    if (Object.keys(next).length) {
      setOpenGroups((prev) => ({ ...next, ...prev }));
    }
  }, [pathname]);

  // Menu terbatas (Kelola Pengguna, DB Status) hanya untuk role tertentu
  const menuItems = useMemo(
    () =>
      MENU.filter(
        (item) => !item.restricted || canAccessPath(user?.role, getItemHref(item) || "")
      ),
    [user?.role]
  );

  if (!user) return null;

  const toggleGroup = (title: string) =>
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span className="block text-base font-bold text-white whitespace-nowrap leading-tight">
              {APP_NAME}
            </span>
            <span className="block text-[10px] text-white/60 leading-tight truncate">
              Semen Tonasa
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scrollbar-thin">
        {menuItems.map((item) => {
          const Icon = item.icon;

          // ── Menu dengan submenu (gaya dd-pocket) ──
          if (item.children) {
            const open = openGroups[item.title] ?? false;
            const active = isGroupActive(pathname, item);
            const shouldShow = active || open;
            return (
              <div key={item.title}>
                <button
                  type="button"
                  onClick={() => !collapsed && toggleGroup(item.title)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
                    shouldShow
                      ? "bg-blue-600/20 text-white"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="whitespace-nowrap flex-1 text-left">{item.title}</span>
                      <ChevronDown
                        size={16}
                        className={cn("transition-transform", shouldShow && "rotate-180")}
                      />
                    </>
                  )}
                  {shouldShow && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 rounded-r-md" />
                  )}
                </button>
                {shouldShow && !collapsed && (
                  <div className="space-y-0.5 mt-0.5">
                    {item.children.map((child) => {
                      const childActive = isChildActive(pathname, child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onMobileClose}
                          className={cn(
                            "flex items-center gap-3 pl-6 py-2 rounded-lg text-sm font-medium transition-colors relative",
                            childActive
                              ? "bg-blue-600/20 text-white"
                              : "text-white/60 hover:text-white hover:bg-white/5"
                          )}
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full flex-shrink-0",
                              childActive ? "bg-blue-500" : "bg-white/40"
                            )}
                          />
                          <span className="whitespace-nowrap">{child.title}</span>
                          {childActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-blue-500 rounded-r-md" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // ── Menu tunggal ──
          const href = getItemHref(item)!;
          const active = isChildActive(pathname, href);
          return (
            <Link
              key={item.title}
              href={href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
                active
                  ? "bg-blue-600/20 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{item.title}</span>}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 rounded-r-md" />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-gray-900 text-white z-30 transition-all duration-300",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        <button
          onClick={onToggle}
          className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white/60 hover:text-white z-10"
          aria-label={collapsed ? "Perluas menu" : "Ciutkan menu"}
        >
          <ChevronLeft size={14} className={cn("transition-transform", collapsed && "rotate-180")} />
        </button>
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={onMobileClose} />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed left-0 top-0 h-screen bg-gray-900 text-white z-50 transition-transform duration-300 w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={onMobileClose}
          className="absolute right-3 top-4 text-white/60 hover:text-white"
          aria-label="Tutup menu"
        >
          <X size={20} />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
}

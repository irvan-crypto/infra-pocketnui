"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { MENU, isChildActive, isGroupActive, getItemHref, type MenuItem, type MenuChild } from "@/lib/menu";
import { canAccessPath } from "@/lib/access";
import { APP_NAME } from "@/lib/app-config";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

/** Flyout untuk sidebar collapsed (ikon saja) */
interface FlyoutState {
  title: string;
  top: number;
  href?: string;
  children?: MenuChild[];
}

/** Grup yang berisi halaman aktif — dipakai untuk state awal & sinkronisasi route */
function findActiveGroupTitle(pathname: string): string | null {
  const item = MENU.find((i) => i.children?.length && isGroupActive(pathname, i));
  return item ? item.title : null;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Accordion eksklusif: maksimal satu dropdown terbuka
  const [openGroup, setOpenGroup] = useState<string | null>(() => findActiveGroupTitle(pathname));
  const [flyout, setFlyout] = useState<FlyoutState | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Route berubah: buka grup tujuan, tutup grup lain
  useEffect(() => {
    setOpenGroup(findActiveGroupTitle(pathname));
    setFlyout(null);
  }, [pathname]);

  // Flyout tidak relevan saat sidebar melebar / di mobile
  useEffect(() => {
    if (!collapsed || mobileOpen) setFlyout(null);
  }, [collapsed, mobileOpen]);

  useEffect(() => () => clearCloseTimer(), []);

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleFlyoutClose() {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setFlyout(null), 160);
  }

  const showFlyout = useCallback(
    (el: HTMLElement, item: MenuItem) => {
      if (!collapsed) return;
      clearCloseTimer();
      const rect = el.getBoundingClientRect();
      const maxTop = Math.max(8, window.innerHeight - 120);
      setFlyout({
        title: item.title,
        top: Math.min(Math.max(8, rect.top), maxTop),
        href: item.href,
        children: item.children,
      });
    },
    [collapsed]
  );

  // Menu terbatas (Kelola Pengguna, DB Status) hanya untuk role tertentu
  const menuItems = useMemo(
    () =>
      MENU.filter(
        (item) => !item.restricted || canAccessPath(user?.role, getItemHref(item) || "")
      ),
    [user?.role]
  );

  if (!user) return null;

  const toggleGroup = (title: string) => {
    // Buka grup ini -> grup lain otomatis tertutup; klik grup yang sama -> tutup
    setOpenGroup((prev) => (prev === title ? null : title));
  };

  const handleGroupClick = (title: string) => {
    if (collapsed) {
      // Sidebar collapsed: klik = lebarkan sidebar + buka grup tersebut
      setFlyout(null);
      toggleGroup(title);
      onToggle();
      return;
    }
    toggleGroup(title);
  };

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
      <nav
        className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scrollbar-thin"
        onScroll={() => setFlyout(null)}
      >
        {menuItems.map((item) => {
          const Icon = item.icon;

          // ── Menu dengan submenu (gaya dd-pocket) ──
          if (item.children) {
            const isOpen = openGroup === item.title;
            const active = isGroupActive(pathname, item);
            return (
              <div key={item.title}>
                <button
                  type="button"
                  onClick={() => handleGroupClick(item.title)}
                  onMouseEnter={(e) => showFlyout(e.currentTarget, item)}
                  onMouseLeave={scheduleFlyoutClose}
                  onFocus={(e) => showFlyout(e.currentTarget, item)}
                  onBlur={scheduleFlyoutClose}
                  aria-expanded={isOpen}
                  aria-haspopup="menu"
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
                    active || isOpen
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
                        className={cn(
                          "transition-transform duration-200",
                          isOpen && "rotate-180"
                        )}
                      />
                    </>
                  )}
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 rounded-r-md" />
                  )}
                </button>

                {/* Submenu dengan transisi tinggi (grid 0fr -> 1fr);
                    saat sidebar collapsed digantikan flyout */}
                {!collapsed && (
                  <div
                    className={cn(
                      "grid transition-all duration-200 ease-out",
                      isOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden min-h-0">
                      <div
                        className="space-y-0.5 pt-0.5"
                        aria-hidden={!isOpen}
                        inert={!isOpen}
                      >
                        {item.children.map((child) => {
                          const childActive = isChildActive(pathname, child.href);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={onMobileClose}
                              tabIndex={isOpen ? undefined : -1}
                              aria-current={childActive ? "page" : undefined}
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
                    </div>
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
              onMouseEnter={(e) => showFlyout(e.currentTarget, item)}
              onMouseLeave={scheduleFlyoutClose}
              aria-current={active ? "page" : undefined}
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

      {/* Flyout sidebar collapsed (fixed agar tidak terpotong area scroll nav) */}
      {collapsed && !mobileOpen && flyout && (
        <div
          className="hidden lg:flex flex-col fixed z-40 w-56 max-h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-gray-900/98 shadow-2xl shadow-black/40 backdrop-blur p-1.5 animate-flyout-in"
          style={{ left: 80, top: flyout.top }}
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleFlyoutClose}
          role="menu"
          aria-label={flyout.title}
        >
          {flyout.children ? (
            <>
              <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                {flyout.title}
              </div>
              {flyout.children.map((child) => {
                const childActive = isChildActive(pathname, child.href);
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    role="menuitem"
                    onClick={onMobileClose}
                    aria-current={childActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      childActive
                        ? "bg-blue-600/25 text-white"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full flex-shrink-0",
                        childActive ? "bg-blue-500" : "bg-white/40"
                      )}
                    />
                    <span className="whitespace-nowrap">{child.title}</span>
                  </Link>
                );
              })}
            </>
          ) : (
            <Link
              href={flyout.href ?? "#"}
              role="menuitem"
              onClick={onMobileClose}
              className="px-2 py-1.5 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 whitespace-nowrap"
            >
              {flyout.title}
            </Link>
          )}
        </div>
      )}

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

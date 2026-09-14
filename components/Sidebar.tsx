"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/lib/auth-config";
import { MENU, isChildActive, isGroupActive, getItemHref } from "@/lib/menu";

export default function Sidebar() {
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

  if (!user) return null;

  const roleMeta = ROLE_LABELS[user.role];

  const toggleGroup = (title: string) =>
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[var(--sidebar-width)] bg-[radial-gradient(circle_at_top,_rgba(26,86,219,.2),_transparent_34%),linear-gradient(135deg,_#0f172a_0%,_#1e3a5f_35%,_#0d9488_100%)] text-white flex-col hidden lg:flex shadow-xl">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-white/10 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center p-1.5">
          <Image
            src="/logo.png"
            alt="Logo"
            width={0}
            height={0}
            sizes="36px"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold leading-tight truncate text-white">ShipMonitor</h1>
          <p className="text-[10px] text-white/75 leading-tight">
            {roleMeta.label}
            {user.unitKerja && (
              <span className="ml-1 inline-flex items-center gap-0.5 bg-white/10 px-1.5 py-0.5 rounded-full">
                {user.unitKerja}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {MENU.map((item) => {
          const Icon = item.icon;

          if (item.children) {
            const open = openGroups[item.title] ?? false;
            const active = isGroupActive(pathname, item);
            return (
              <div key={item.title}>
                <button
                  type="button"
                  onClick={() => toggleGroup(item.title)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-white/15 text-white shadow-sm"
                      : "text-white/85 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className={cn("w-5 h-5 shrink-0", active ? "text-white" : "text-white/70")} />
                  <span className="flex-1 text-left truncate">{item.title}</span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 shrink-0 transition-transform duration-200",
                      open && "rotate-180"
                    )}
                  />
                </button>
                {open && (
                  <div className="mt-1 ml-4 pl-3 border-l border-white/15 space-y-1">
                    {item.children.map((child) => {
                      const childActive = isChildActive(pathname, child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-all duration-200",
                            childActive
                              ? "bg-white/15 text-white font-medium"
                              : "text-white/75 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              childActive ? "bg-white" : "bg-white/40"
                            )}
                          />
                          <span className="truncate">{child.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const href = getItemHref(item)!;
          const active = isChildActive(pathname, href);
          return (
            <Link
              key={item.title}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                active
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/85 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className={cn("w-5 h-5 shrink-0", active ? "text-white" : "text-white/70")} />
              <span className="truncate">{item.title}</span>
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
            </Link>
          );
        })}
      </nav>

      {/* User profile at bottom */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm">
            {user.namaLengkap.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user.namaLengkap}</p>
            <p className="text-[10px] text-white/60 truncate">{user.username}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
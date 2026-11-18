"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Menu, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { roleBadgeClass, roleLabel } from "@/lib/utils";

interface Props {
  onMobileMenu: () => void;
  /** Tampilan saja — badge merah hanya muncul jika > 0 */
  pendingCount?: number;
}

export default function Header({ onMobileMenu, pendingCount = 0 }: Props) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={onMobileMenu}
          className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Buka menu"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifikasi (tampilan saja) */}
        <button
          className="relative w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          aria-label="Notifikasi"
        >
          <Bell size={17} />
          {pendingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white">
              {pendingCount > 99 ? "99+" : pendingCount}
            </span>
          )}
        </button>

        {/* Profil pengguna */}
        <div className="relative" ref={dropdownRef}>
          <div
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.namaLengkap}
                className="w-9 h-9 rounded-full object-cover border border-gray-200 flex-shrink-0"
              />
            ) : (
              <img
                src="/logonui.png"
                alt="Foto profil"
                className="w-9 h-9 rounded-full object-cover border border-gray-200 flex-shrink-0"
              />
            )}
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-gray-800 leading-tight">{user?.namaLengkap || "User"}</p>
              {user && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block ${roleBadgeClass(user.role)}`}>
                  {roleLabel(user.role)}
                </span>
              )}
            </div>
            <ChevronDown size={14} className={`text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </div>

          {/* User Dropdown */}
          {dropdownOpen && user && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 animate-[fadeIn_0.15s_ease-out]">
              <div className="px-4 py-2 border-b border-gray-100 sm:hidden">
                <p className="text-sm font-semibold text-gray-800">{user.namaLengkap}</p>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${roleBadgeClass(user.role)}`}>
                  {roleLabel(user.role)}
                </span>
              </div>
              <div className="px-4 py-2 hidden sm:block">
                <p className="text-[11px] text-gray-400 truncate">{user.username}</p>
                {user.unitKerja && (
                  <p className="text-[11px] text-gray-400 truncate">Unit: {user.unitKerja}</p>
                )}
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

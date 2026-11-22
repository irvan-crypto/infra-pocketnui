"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

export default function NotifToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(typeof Notification !== "undefined" && Notification.permission === "granted");
  }, []);

  async function toggle() {
    if (typeof Notification === "undefined") return;
    if (!enabled) {
      const permission = await Notification.requestPermission();
      setEnabled(permission === "granted");
    } else {
      // Browser tidak menyediakan revoke permission dari halaman; arahkan status secara visual.
      setEnabled(false);
    }
  }

  return (
    <button onClick={toggle} className="w-full flex items-center gap-3 px-2 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
      {enabled ? <Bell size={16} className="text-green-600" /> : <BellOff size={16} className="text-gray-400" />}
      <span className="flex-1 text-left">Notifikasi</span>
      <span className={`text-[10px] font-semibold ${enabled ? "text-green-600" : "text-gray-400"}`}>{enabled ? "Aktif" : "Nonaktif"}</span>
    </button>
  );
}

"use client";

import { useEffect } from "react";

/**
 * Registrasi service worker PWA secara global.
 * Syarat installable: manifest valid + icon 192/512 + SW aktif dengan fetch handler.
 */
export default function PwaSetup() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("[PWA] Service worker gagal didaftarkan:", err));
    };

    // Daftarkan segera (bukan menunggu event load) agar kriteria installable cepat terpenuhi
    register();

    return () => {};
  }, []);

  return null;
}

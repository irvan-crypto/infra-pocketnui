"use client";

import { useEffect } from "react";

export default function PwaSetup() {
  useEffect(() => {
    // Register service worker if needed
    if ("serviceWorker" in navigator) {
      // Optional: register custom service worker
    }
  }, []);

  return null;
}
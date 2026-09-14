import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateIndonesian(date: Date | string | null): string {
  if (!date) return "-";

  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
  ];

  if (typeof date === "string") {
    // Format dari Supabase/Postgres biasanya: YYYY-MM-DD HH:mm:ss
    // Bisa juga: YYYY-MM-DDTHH:mm:ss, dengan/ tanpa milliseconds atau timezone.
    // Kita ambil komponen wall-clock apa adanya supaya tidak bergeser timezone.
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/);
    if (match) {
      const [, year, month, day, hours, minutes] = match;
      const monthName = months[parseInt(month, 10) - 1] ?? month;
      return `${day.padStart(2, "0")} ${monthName} ${year.slice(-2)} ${hours}:${minutes}`;
    }
  }

  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "-";

  const day = d.getDate().toString().padStart(2, "0");
  const month = months[d.getMonth()];
  const year = d.getFullYear().toString().slice(-2);
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${day} ${month} ${year} ${hours}:${minutes}`;
}

export function parseDateFromString(str: string): Date | null {
  // Format: dd/mm/yy hh:mm
  const parts = str.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  const datePart = parts[0]; // dd/mm/yy
  const timePart = parts[1]; // hh:mm
  const dateParts = datePart.split("/");
  if (dateParts.length !== 3) return null;
  const day = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1;
  const year = 2000 + parseInt(dateParts[2], 10);
  const timeParts = timePart.split(":");
  if (timeParts.length !== 2) return null;
  const hour = parseInt(timeParts[0], 10);
  const minute = parseInt(timeParts[1], 10);
  return new Date(year, month, day, hour, minute);
}
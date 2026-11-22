import {
  LayoutDashboard,
  Factory,
  Truck,
  BarChart3,
  Users,
  Database,
  type LucideIcon,
} from "lucide-react";

export interface MenuChild {
  title: string;
  href: string;
  /** true = hanya aktif bila path persis sama (bukan halaman turunannya) */
  exact?: boolean;
  /** true = hanya role tertentu (lihat RESTRICTED_ROUTES di lib/access.ts) */
  restricted?: boolean;
}

export interface MenuItem {
  title: string;
  icon: LucideIcon;
  href?: string;
  children?: MenuChild[];
  /** true = hanya role tertentu (lihat RESTRICTED_ROUTES di lib/access.ts) */
  restricted?: boolean;
}

export const MENU: MenuItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    children: [
      { title: "Ringkasan Monitoring", href: "/monitoring", exact: true },
      { title: "Shipment Laut", href: "/dashboard/shipment-laut" },
    ],
  },
  {
    title: "Plant & Port Prod",
    icon: Factory,
    children: [
      { title: "Silo Semen", href: "/monitoring/silo-semen" },
      { title: "Silo Pantai", href: "/monitoring/silo-pantai" },
      { title: "CP Tonasa", href: "/monitoring/cp-tonasa" },
      { title: "Silo Mini", href: "/monitoring/silo-mini" },
      { title: "PP Biringkassi", href: "/monitoring/pp-biringkassi" },
      { title: "Semua Silo", href: "/monitoring/semua-silo", restricted: true },
    ],
  },
  {
    title: "Interplant Logistic",
    icon: Truck,
    children: [
      { title: "Angkutan Darat", href: "/monitoring/angkutan-darat" },
      { title: "Angkutan Laut", href: "/monitoring/angkutan-laut" },
    ],
  },
  {
    title: "Packing Plant 1",
    icon: Factory,
    children: [
      { title: "Samarinda", href: "/monitoring/pp1-samarinda" },
      { title: "Balikpapan", href: "/monitoring/pp1-balikpapan" },
      { title: "Banjarmasin", href: "/monitoring/pp1-banjarmasin" },
      { title: "Palu", href: "/monitoring/pp1-palu" },
      { title: "Lembar", href: "/monitoring/pp1-lembar" },
      { title: "Makassar", href: "/monitoring/pp1-makassar" },
    ],
  },
  {
    title: "Packing Plant 2",
    icon: Factory,
    children: [
      { title: "Bitung", href: "/monitoring/pp2-bitung" },
      { title: "Mamuju", href: "/monitoring/pp2-mamuju" },
      { title: "Kendari", href: "/monitoring/pp2-kendari" },
      { title: "Oba", href: "/monitoring/pp2-oba" },
      { title: "Ambon", href: "/monitoring/pp2-ambon" },
      { title: "Sorong", href: "/monitoring/pp2-sorong" },
    ],
  },
  {
    title: "RKAP",
    icon: BarChart3,
    children: [
      { title: "Shipment Laut", href: "/rkap/shipment-laut" },
    ],
  },
  { title: "Kelola Pengguna", icon: Users, href: "/kelola-pengguna", restricted: true },
  { title: "DB Status", icon: Database, href: "/db-status", restricted: true },
];

export function isChildActive(pathname: string, target: MenuChild | string): boolean {
  const href = typeof target === "string" ? target : target.href;
  const exact = typeof target === "string" ? false : Boolean(target.exact);
  if (pathname === href) return true;
  // `exact` dipakai untuk halaman induk (mis. /monitoring) supaya tidak
  // ikut aktif saat membuka halaman turunannya (/monitoring/silo-semen).
  if (exact) return false;
  return pathname.startsWith(href + "/");
}

export function isGroupActive(pathname: string, item: MenuItem): boolean {
  return item.children?.some((c) => isChildActive(pathname, c)) ?? false;
}

export function getItemHref(item: MenuItem): string | undefined {
  return item.href ?? item.children?.[0]?.href;
}

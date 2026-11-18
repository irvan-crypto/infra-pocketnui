import {
  LayoutDashboard,
  LayoutGrid,
  Factory,
  Truck,
  BarChart3,
  Users,
  Database,
  Cylinder,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

export interface MenuChild {
  title: string;
  href: string;
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
      { title: "Shipment Laut", href: "/dashboard/shipment-laut" },
    ],
  },
  {
    title: "Ringkasan Monitoring",
    icon: LayoutGrid,
    href: "/monitoring",
  },
  {
    title: "Silo Semen",
    icon: Cylinder,
    children: [
      { title: "Stok Harian", href: "/monitoring/silo-semen" },
      { title: "Silo Pantai", href: "/monitoring/silo-pantai" },
      { title: "CP Tonasa", href: "/monitoring/cp-tonasa" },
      { title: "Silo Mini", href: "/monitoring/silo-mini" },
      { title: "Silo Pantai", href: "/silo-semen/silo-pantai" },
    ],
  },
  {
    title: "Packing Plant",
    icon: Factory,
    children: [
      { title: "PP Biringkassi", href: "/monitoring/pp-biringkassi" },
    ],
  },
  {
    title: "Interplant Logistic",
    icon: Truck,
    children: [
      { title: "Shipment Laut", href: "/interplant-logistic/shipment-laut" },
      { title: "Angkutan Darat (Expeditur)", href: "/monitoring/angkutan-darat" },
    ],
  },
  {
    title: "PP1 Cabang",
    icon: Factory,
    children: [
      { title: "Samarinda", href: "/monitoring/pp1-samarinda" },
      { title: "Balikpapan", href: "/monitoring/pp1-balikpapan" },
      { title: "Banjar", href: "/monitoring/pp1-banjar" },
      { title: "Palu", href: "/monitoring/pp1-palu" },
      { title: "Lembar", href: "/monitoring/pp1-lembar" },
      { title: "Makassar", href: "/monitoring/pp1-makassar" },
    ],
  },
  {
    title: "PP2 Cabang",
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

export function isChildActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

export function isGroupActive(pathname: string, item: MenuItem): boolean {
  return item.children?.some((c) => isChildActive(pathname, c.href)) ?? false;
}

export function getItemHref(item: MenuItem): string | undefined {
  return item.href ?? item.children?.[0]?.href;
}

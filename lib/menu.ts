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
}

export interface MenuItem {
  title: string;
  icon: LucideIcon;
  href?: string;
  children?: MenuChild[];
}

export const MENU: MenuItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    children: [
      { title: "Packing Plant 1", href: "/dashboard/packing-plant-1" },
      { title: "Packing Plant 2", href: "/dashboard/packing-plant-2" },
      { title: "Shipment Darat", href: "/dashboard/shipment-darat" },
      { title: "Shipment Laut", href: "/dashboard/shipment-laut" },
    ],
  },
  {
    title: "Packing Plant",
    icon: Factory,
    children: [
      { title: "Packing Plant 1", href: "/packing-plant/packing-plant-1" },
      { title: "Packing Plant 2", href: "/packing-plant/packing-plant-2" },
    ],
  },
  {
    title: "Interplant Logistic",
    icon: Truck,
    children: [
      { title: "Shipment Darat", href: "/interplant-logistic/shipment-darat" },
      { title: "Shipment Laut", href: "/interplant-logistic/shipment-laut" },
    ],
  },
  {
    title: "RKAP",
    icon: BarChart3,
    children: [
      { title: "Packing Plant 1", href: "/rkap/packing-plant-1" },
      { title: "Packing Plant 2", href: "/rkap/packing-plant-2" },
      { title: "Shipment Darat", href: "/rkap/shipment-darat" },
      { title: "Shipment Laut", href: "/rkap/shipment-laut" },
    ],
  },
  { title: "Kelola Pengguna", icon: Users, href: "/kelola-pengguna" },
  { title: "DB Status", icon: Database, href: "/db-status" },
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
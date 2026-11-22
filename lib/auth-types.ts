import type { Role } from "./roles";

/** Profil pengguna yang dipakai di client (tanpa password) */
export interface AuthUser {
  username: string;
  role: Role;
  namaLengkap: string;
  email?: string;
  noHandphone?: string;
  jabatan?: string;
  unitKerja?: string;
  departemen?: string;
  /** Akses modul: "Plant & Port Prod" | "Angkutan Darat" | "Angkutan Laut" | "Packing Plant 1" | "Packing Plant 2" */
  akses?: string;
  /** Unit PP spesifik (hanya untuk Packing Plant 1/2) */
  aksesPp?: string;
  status?: string;
  avatar_url?: string;
}

export type RouteKey = "dashboard" | "shipments" | "profile";

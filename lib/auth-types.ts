export type Role = "admin" | "manager" | "operator";

export interface AuthUser {
  role: Role;
  email: string;
  namaLengkap: string;
  unitKerja?: string;
  avatar_url?: string;
  username: string;
  mustChangePassword: boolean;
}

export type RouteKey = "dashboard" | "shipments" | "profile";
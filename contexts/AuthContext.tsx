"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { normalizeRole, type Role } from "@/lib/roles";
import type { AuthUser } from "@/lib/auth-types";

export type { Role, AuthUser };

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  ready: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  updateUserField: (fields: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface MeResponse {
  ok: boolean;
  data?: {
    username: string;
    role: string;
    nama: string;
    email?: string | null;
    no_handphone?: string | null;
    jabatan?: string | null;
    unit_kerja?: string | null;
    departemen?: string | null;
    akses?: string | null;
    akses_pp?: string | null;
    status?: string | null;
    avatar_url?: string | null;
  };
}

function toAuthUser(data: NonNullable<MeResponse["data"]>): AuthUser | null {
  const role = normalizeRole(data.role);
  if (!role) return null;
  return {
    username: data.username,
    role,
    namaLengkap: data.nama || data.username,
    email: data.email || undefined,
    noHandphone: data.no_handphone || undefined,
    jabatan: data.jabatan || undefined,
    unitKerja: data.unit_kerja || undefined,
    departemen: data.departemen || undefined,
    akses: data.akses || undefined,
    aksesPp: data.akses_pp || undefined,
    status: data.status || undefined,
    avatar_url: data.avatar_url || undefined,
  };
}

// ============================================================
// Sesi TIDAK lagi dibaca dari localStorage.
// Role diambil dari cookie HttpOnly lewat /api/auth/me, sehingga
// user tidak bisa menaikkan role sendiri dari browser.
// ============================================================
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const json = (await res.json()) as MeResponse;
      setUser(json.ok && json.data ? toAuthUser(json.data) : null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await refresh();
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!data.ok) {
      throw new Error(data.message || "Login gagal");
    }
    const userData = toAuthUser(data.data);
    if (!userData) {
      throw new Error("Role akun tidak valid. Hubungi admin.");
    }
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    // Hapus sesi di server (cookie HttpOnly) lalu bersihkan state
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  }, []);

  const updateUserField = useCallback((fields: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...fields } : prev));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        ready,
        login,
        logout,
        refresh,
        updateUserField,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

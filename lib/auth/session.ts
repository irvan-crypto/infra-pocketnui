import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { normalizeRole, type Role } from "@/lib/roles";

// ============================================================
// SESI SERVER-SIDE (cookie HttpOnly + tanda tangan HMAC)
// Menggantikan penyimpanan role di localStorage yang mudah
// dimanipulasi. Client hanya menerima profil lewat /api/auth/me.
// ============================================================

export const SESSION_COOKIE = "shipmonitor_session";
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 jam
/** Naikkan versi ini untuk memaksa semua user login ulang setelah perubahan payload */
const SESSION_VERSION = 2;

export interface SessionUser {
  username: string;
  role: Role;
  nama: string;
  unitKerja?: string;
  akses?: string;
  aksesPp?: string;
  status?: string;
}

interface SessionPayload extends SessionUser {
  sv: number;
  iat: number;
  exp: number;
}

function getSecret(): string {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!secret) {
    throw new Error("AUTH_SECRET belum diset. Sesi tidak dapat dibuat.");
  }
  return secret;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(data: string): string {
  return b64url(createHmac("sha256", getSecret()).update(data).digest());
}

export function createSessionToken(user: SessionUser): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    ...user,
    sv: SESSION_VERSION,
    iat: now,
    exp: now + SESSION_MAX_AGE,
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined | null): SessionUser | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  try {
    const expected = sign(body);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const parsed = JSON.parse(fromB64url(body).toString("utf8")) as SessionPayload;
    if (
      !parsed ||
      parsed.sv !== SESSION_VERSION ||
      typeof parsed.exp !== "number" ||
      parsed.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    const role = normalizeRole(parsed.role);
    if (!role || typeof parsed.username !== "string") return null;

    return {
      username: parsed.username,
      role,
      nama: parsed.nama || parsed.username,
      unitKerja: parsed.unitKerja,
      akses: parsed.akses,
      aksesPp: parsed.aksesPp,
      status: parsed.status,
    };
  } catch {
    return null;
  }
}

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(user), {
    ...cookieOptions,
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

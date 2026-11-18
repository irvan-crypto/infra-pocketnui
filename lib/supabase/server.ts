import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// CLIENT SUPABASE KHUSUS SERVER (API ROUTE)
// Memakai SERVICE ROLE KEY sehingga RLS bisa dikunci total
// untuk anon/authenticated. JANGAN dipakai di komponen client.
// ============================================================

let adminClient: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const fallbackKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const key = serviceKey || fallbackKey;

  if (!url || !key) {
    throw new Error(
      "Supabase URL / key belum diset. Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  if (!serviceKey) {
    console.warn(
      "[supabase] SUPABASE_SERVICE_ROLE_KEY belum diset — API memakai anon key. " +
        "RLS yang ketat akan memblokir query; segera set service role key."
    );
  }

  if (!adminClient) {
    adminClient = createSupabaseClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

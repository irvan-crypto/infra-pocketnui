-- ============================================================
-- LOCKDOWN RLS: HANYA SERVER (SERVICE ROLE) YANG BOLEH AKSES
-- ============================================================
-- Latar belakang:
-- Aplikasi memakai login CUSTOM (tabel pengguna), bukan Supabase Auth,
-- sehingga request dari browser sebelumnya memakai anon key tanpa JWT
-- dan RLS harus dibuka lebar (lihat supabase-fix-rls.sql).
--
-- Setelah refactor:
--  - Semua query data dilakukan di API route (server) memakai
--    SUPABASE_SERVICE_ROLE_KEY.
--  - Browser tidak lagi mengakses Supabase langsung.
--  - Otorisasi role/unit dilakukan di API (lib/auth/guard.ts).
--
-- Maka semua policy anon/authenticated dihapus. service_role memiliki
-- BYPASSRLS sehingga tetap bisa membaca/menulis.
--
-- PENTING: pastikan env SUPABASE_SERVICE_ROLE_KEY terisi di server.
-- Jalankan di Supabase -> SQL Editor. Aman dijalankan berulang.
-- ============================================================

do $$
declare
  t text;
  r record;
  tables text[] := array[
    'shipments',
    'shipments_darat',
    'rkap_shipments',
    'angkutan_darat',
    'packing_plant',
    'silo_semen',
    'silo_pantai',
    'silo_mini',
    'cp_tonasa',
    'pp_biringkassi',
    'pp1_samarinda',
    'pp1_balikpapan',
    'pp1_banjarmasin',
    'pp1_palu',
    'pp1_lembar',
    'pp1_makassar',
    'pp2_bitung',
    'pp2_mamuju',
    'pp2_kendari',
    'pp2_oba',
    'pp2_ambon',
    'pp2_sorong',
    'pengguna'
  ];
begin
  foreach t in array tables
  loop
    if to_regclass(t) is not null then
      execute format('alter table %I enable row level security', t);

      -- Hapus semua policy lama (anon/authenticated)
      for r in
        select polname from pg_policy where polrelid = t::regclass
      loop
        execute format('drop policy if exists %I on %I', r.polname, t);
      end loop;

      raise notice 'RLS dikunci: %', t;
    else
      raise notice 'Dilewati (tabel tidak ada): %', t;
    end if;
  end loop;
end $$;

-- Verifikasi: tidak boleh ada policy tersisa
select schemaname, tablename, policyname
from pg_policies
where tablename in (
  'shipments','shipments_darat','rkap_shipments','angkutan_darat','packing_plant',
  'pengguna','silo_semen','silo_pantai','silo_mini','cp_tonasa','pp_biringkassi',
  'pp1_samarinda','pp1_balikpapan','pp1_banjarmasin','pp1_palu','pp1_lembar','pp1_makassar',
  'pp2_bitung','pp2_mamuju','pp2_kendari','pp2_oba','pp2_ambon','pp2_sorong'
)
order by tablename, policyname;

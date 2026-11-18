-- ============================================================
-- EXPAND & STANDARDISASI ROLE
-- ============================================================
-- Role baru:
--   admin            -> akses penuh (CRUD + kelola pengguna)
--   asisten_admin    -> akses penuh (CRUD + kelola pengguna)
--   general_manager  -> lihat saja
--   senior_manager   -> lihat saja
--   manager          -> lihat saja
--   operator         -> CRUD sesuai unit kerja
--   guest            -> lihat saja
--
-- Jalankan di Supabase -> SQL Editor. Aman dijalankan berulang.
-- ============================================================

-- 1) Lepas constraint role lama (mungkin bernama pengguna_role_check)
do $$
declare r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'pengguna'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table pengguna drop constraint if exists %I', r.conname);
  end loop;
end $$;

-- 2) Migrasi data role lama
update pengguna set role = 'guest' where role = 'viewer';
update pengguna set role = 'guest' where role is null or role = '';
update pengguna
   set role = lower(trim(replace(role, ' ', '_')))
 where role in ('Asisten Admin', 'General Manager', 'Senior Manager');

-- 3) Pasang constraint role baru
alter table pengguna
  add constraint pengguna_role_check
  check (role in (
    'admin',
    'asisten_admin',
    'general_manager',
    'senior_manager',
    'manager',
    'operator',
    'guest'
  ));

-- 4) Default role untuk user baru: guest (paling aman)
alter table pengguna alter column role set default 'guest';

-- 5) Verifikasi
select role, count(*) as jumlah from pengguna group by role order by role;

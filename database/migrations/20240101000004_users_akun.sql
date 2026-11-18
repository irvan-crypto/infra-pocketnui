-- ============================================================
-- TABEL users_akun + MASTER users_role
-- ============================================================
-- Menggantikan tabel `pengguna`.
-- Login, profil, dan Kelola Pengguna memakai `users_akun`.
--
-- URUTAN DEPLOY:
--   1) Jalankan file ini (membuat users_akun + backfill data lama).
--   2) Deploy aplikasi versi baru.
--   3) Setelah login baru terbukti jalan, jalankan file
--      20240101000005_drop_pengguna.sql
-- ============================================================

-- 1) Tabel utama
create table if not exists users_akun (
  id            uuid primary key default gen_random_uuid(),
  nama_lengkap  text not null,
  email         text,
  no_handphone  text,
  jabatan       text,
  unit_kerja    text,
  departemen    text,
  username      text not null unique,
  password      text not null,
  role          text not null default 'guest',
  akses         text,
  akses_pp      text,
  status        text not null default 'Aktif'
                check (status in ('Aktif', 'Nonaktif')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_users_akun_username on users_akun(username);
create index if not exists idx_users_akun_role on users_akun(role);
create index if not exists idx_users_akun_status on users_akun(status);

-- Email unik (boleh NULL, case-insensitive)
create unique index if not exists uq_users_akun_email
  on users_akun (lower(email))
  where email is not null and btrim(email) <> '';

-- 2) Trigger updated_at
create or replace function users_akun_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_akun_updated_at on users_akun;
create trigger trg_users_akun_updated_at
before update on users_akun
for each row execute function users_akun_set_updated_at();

-- 3) Master role (tabel users_role sudah ada; kolom: role, akses_role, akses_pp)
create unique index if not exists uq_users_role_combination
  on users_role (role, coalesce(akses_role, ''), coalesce(akses_pp, ''));

insert into users_role (role, akses_role, akses_pp)
select v.role, v.akses_role, v.akses_pp
from (values
  -- Read-only / full access: semua akses
  ('admin',            'Semua Akses',      null::text),
  ('asisten_admin',    'Semua Akses',      null),
  ('general_manager',  'Semua Akses',      null),
  ('senior_manager',   'Semua Akses',      null),
  ('manager',          'Semua Akses',      null),
  ('guest',            'Semua Akses',      null),

  -- Operator Head Office
  ('operator',         'Semua Akses',      null),

  -- Operator Packing Plant 1
  ('operator',         'Packing Plant 1',  'PP1 Samarinda'),
  ('operator',         'Packing Plant 1',  'PP1 Balikpapan'),
  ('operator',         'Packing Plant 1',  'PP1 Banjar'),
  ('operator',         'Packing Plant 1',  'PP1 Palu'),
  ('operator',         'Packing Plant 1',  'PP1 Lembar'),
  ('operator',         'Packing Plant 1',  'PP1 Makassar'),

  -- Operator Packing Plant 2
  ('operator',         'Packing Plant 2',  'PP2 Bitung'),
  ('operator',         'Packing Plant 2',  'PP2 Mamuju'),
  ('operator',         'Packing Plant 2',  'PP2 Kendari'),
  ('operator',         'Packing Plant 2',  'PP2 Oba'),
  ('operator',         'Packing Plant 2',  'PP2 Ambon'),
  ('operator',         'Packing Plant 2',  'PP2 Sorong'),

  -- Operator unit lain
  ('operator',         'Silo',             null),
  ('operator',         'Angkutan Darat',   null)
) as v(role, akses_role, akses_pp)
where not exists (
  select 1
  from users_role u
  where u.role = v.role
    and coalesce(u.akses_role, '') = coalesce(v.akses_role, '')
    and coalesce(u.akses_pp, '') = coalesce(v.akses_pp, '')
);

-- 4) Backfill data dari tabel lama `pengguna` (jika masih ada)
do $$
begin
  if to_regclass('pengguna') is not null then
    insert into users_akun (
      nama_lengkap, email, no_handphone, jabatan, unit_kerja, departemen,
      username, password, role, akses, akses_pp, status, created_at, updated_at
    )
    select
      p.nama,
      null,                       -- email belum tersedia
      null,                       -- no handphone belum tersedia
      p.jabatan,
      p.unit_kerja,
      null,                       -- departemen belum tersedia
      p.username,
      p.password,
      case when p.role = 'viewer' then 'guest' else p.role end,
      case
        when p.role <> 'operator' then 'Semua Akses'
        when lower(coalesce(p.unit_pp, '')) like '%head office%' then 'Semua Akses'
        when lower(coalesce(p.unit_pp, '')) like '%samarinda%'  then 'Packing Plant 1'
        when lower(coalesce(p.unit_pp, '')) like '%balikpapan%' then 'Packing Plant 1'
        when lower(coalesce(p.unit_pp, '')) like '%banjar%'     then 'Packing Plant 1'
        when lower(coalesce(p.unit_pp, '')) like '%palu%'       then 'Packing Plant 1'
        when lower(coalesce(p.unit_pp, '')) like '%lembar%'     then 'Packing Plant 1'
        when lower(coalesce(p.unit_pp, '')) like '%makassar%'   then 'Packing Plant 1'
        when lower(coalesce(p.unit_pp, '')) like '%bitung%'     then 'Packing Plant 2'
        when lower(coalesce(p.unit_pp, '')) like '%mamuju%'     then 'Packing Plant 2'
        when lower(coalesce(p.unit_pp, '')) like '%kendari%'    then 'Packing Plant 2'
        when lower(coalesce(p.unit_pp, '')) like '%oba%'        then 'Packing Plant 2'
        when lower(coalesce(p.unit_pp, '')) like '%ambon%'      then 'Packing Plant 2'
        when lower(coalesce(p.unit_pp, '')) like '%sorong%'     then 'Packing Plant 2'
        when lower(coalesce(p.unit_pp, '')) like '%silo%'       then 'Silo'
        when lower(coalesce(p.unit_pp, '')) like '%angkutan%'   then 'Angkutan Darat'
        else 'Semua Akses'
      end,
      case
        when p.role <> 'operator' then null
        when lower(coalesce(p.unit_pp, '')) like '%head office%' then null
        when lower(coalesce(p.unit_pp, '')) like '%samarinda%'  then 'PP1 Samarinda'
        when lower(coalesce(p.unit_pp, '')) like '%balikpapan%' then 'PP1 Balikpapan'
        when lower(coalesce(p.unit_pp, '')) like '%banjar%'     then 'PP1 Banjar'
        when lower(coalesce(p.unit_pp, '')) like '%palu%'       then 'PP1 Palu'
        when lower(coalesce(p.unit_pp, '')) like '%lembar%'     then 'PP1 Lembar'
        when lower(coalesce(p.unit_pp, '')) like '%makassar%'   then 'PP1 Makassar'
        when lower(coalesce(p.unit_pp, '')) like '%bitung%'     then 'PP2 Bitung'
        when lower(coalesce(p.unit_pp, '')) like '%mamuju%'     then 'PP2 Mamuju'
        when lower(coalesce(p.unit_pp, '')) like '%kendari%'    then 'PP2 Kendari'
        when lower(coalesce(p.unit_pp, '')) like '%oba%'        then 'PP2 Oba'
        when lower(coalesce(p.unit_pp, '')) like '%ambon%'      then 'PP2 Ambon'
        when lower(coalesce(p.unit_pp, '')) like '%sorong%'     then 'PP2 Sorong'
        else null
      end,
      'Aktif',
      coalesce(p.created_at, now()),
      coalesce(p.updated_at, now())
    from pengguna p
    where not exists (
      select 1 from users_akun u where u.username = p.username
    );
  end if;
end $$;

-- 5) RLS: hanya server (service role) yang boleh akses
do $$
declare
  r record;
  t text;
begin
  foreach t in array array['users_akun', 'users_role']
  loop
    execute format('alter table %I enable row level security', t);
    for r in
      select policyname from pg_policies where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on %I', r.policyname, t);
    end loop;
  end loop;
end $$;

-- 6) Verifikasi
select count(*) as total_users_akun from users_akun;
select role, count(*) from users_akun group by role order by role;
select role, akses_role, akses_pp from users_role order by role, akses_role, akses_pp;

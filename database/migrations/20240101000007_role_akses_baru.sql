-- ============================================================
-- 20240101000007_role_akses_baru.sql
-- Restrukturisasi master role & akses (Kelola Pengguna).
--
-- 1) Role baru        : direksi, staff
-- 2) Akses baru       : "Plant & Port Prod", "Angkutan Laut"
--    Akses dihapus    : "Semua Akses", "Silo"
-- 3) Hak Akses        : untuk "Plant & Port Prod" -> CP Tonasa / Biringkassi
-- ============================================================

-- ------------------------------------------------------------
-- 1) MASTER users_role
-- ------------------------------------------------------------
-- Buang kombinasi lama yang tidak dipakai lagi
delete from users_role where akses_role in ('Semua Akses', 'Silo');

-- Tambah kombinasi baru (aman dijalankan berulang)
insert into users_role (role, akses_role, akses_pp)
select v.role, v.akses_role, v.akses_pp
from (
  values
    -- Role non-operator: akses tidak relevan (dropdown disembunyikan)
    ('admin',           'Plant & Port Prod', null::text),
    ('asisten_admin',   'Plant & Port Prod', null),
    ('general_manager', 'Plant & Port Prod', null),
    ('senior_manager',  'Plant & Port Prod', null),
    ('manager',         'Plant & Port Prod', null),
    ('direksi',         'Plant & Port Prod', null),
    ('staff',           'Plant & Port Prod', null),
    ('guest',           'Plant & Port Prod', null),

    -- Operator: Plant & Port Prod + Hak Akses
    ('operator',        'Plant & Port Prod', 'CP Tonasa'),
    ('operator',        'Plant & Port Prod', 'Biringkassi'),

    -- Operator: Angkutan
    ('operator',        'Angkutan Darat',    null),
    ('operator',        'Angkutan Laut',     null),

    -- Operator: Packing Plant 1
    ('operator',        'Packing Plant 1',   'PP1 Samarinda'),
    ('operator',        'Packing Plant 1',   'PP1 Balikpapan'),
    ('operator',        'Packing Plant 1',   'PP1 Banjar'),
    ('operator',        'Packing Plant 1',   'PP1 Palu'),
    ('operator',        'Packing Plant 1',   'PP1 Lembar'),
    ('operator',        'Packing Plant 1',   'PP1 Makassar'),

    -- Operator: Packing Plant 2
    ('operator',        'Packing Plant 2',   'PP2 Bitung'),
    ('operator',        'Packing Plant 2',   'PP2 Mamuju'),
    ('operator',        'Packing Plant 2',   'PP2 Kendari'),
    ('operator',        'Packing Plant 2',   'PP2 Oba'),
    ('operator',        'Packing Plant 2',   'PP2 Ambon'),
    ('operator',        'Packing Plant 2',   'PP2 Sorong')
) as v(role, akses_role, akses_pp)
where not exists (
  select 1
  from users_role u
  where u.role = v.role
    and coalesce(u.akses_role, '') = coalesce(v.akses_role, '')
    and coalesce(u.akses_pp, '') = coalesce(v.akses_pp, '')
);

-- ------------------------------------------------------------
-- 2) MIGRASI DATA PENGGUNA
--    "Semua Akses" (operator) -> Plant & Port Prod + CP Tonasa
--    "Silo"                   -> Plant & Port Prod + Biringkassi
--    Role non-operator        -> akses/akses_pp dikosongkan
-- ------------------------------------------------------------
update users_akun
set akses = 'Plant & Port Prod',
    akses_pp = 'CP Tonasa'
where akses = 'Semua Akses'
  and role = 'operator';

update users_akun
set akses = 'Plant & Port Prod',
    akses_pp = 'Biringkassi'
where akses = 'Silo';

update users_akun
set akses = 'Plant & Port Prod'
where akses = 'Semua Akses';

update users_akun
set akses = null,
    akses_pp = null
where role <> 'operator';

-- ------------------------------------------------------------
-- 3) Verifikasi
-- ------------------------------------------------------------
select role, akses_role, akses_pp from users_role order by role, akses_role, akses_pp;

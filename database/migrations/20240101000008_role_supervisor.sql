-- ============================================================
-- 20240101000008_role_supervisor.sql
-- Menambah role "supervisor" (fitur sama seperti "operator":
-- dibatasi oleh Akses + Hak Akses).
-- ============================================================

-- Salin seluruh kombinasi akses milik operator ke supervisor.
insert into users_role (role, akses_role, akses_pp)
select 'supervisor', u.akses_role, u.akses_pp
from users_role u
where u.role = 'operator'
  and not exists (
    select 1
    from users_role x
    where x.role = 'supervisor'
      and coalesce(x.akses_role, '') = coalesce(u.akses_role, '')
      and coalesce(x.akses_pp, '') = coalesce(u.akses_pp, '')
  );

-- Verifikasi
select role, akses_role, akses_pp
from users_role
where role = 'supervisor'
order by akses_role, akses_pp;

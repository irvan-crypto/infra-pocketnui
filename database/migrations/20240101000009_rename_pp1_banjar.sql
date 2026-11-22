-- ============================================================
-- 20240101000009_rename_pp1_banjar.sql
-- Menyeragamkan penamaan: pp1_banjar  ->  pp1_banjarmasin
-- (mengikuti nama PP: PP. Banjarmasin / PP1 Banjarmasin)
-- ============================================================

-- ------------------------------------------------------------
-- 1) Rename tabel + index
-- ------------------------------------------------------------
alter table if exists public.pp1_banjar rename to pp1_banjarmasin;

alter index if exists public.idx_pp1_banjar_tanggal
  rename to idx_pp1_banjarmasin_tanggal;

-- ------------------------------------------------------------
-- 2) Kompatibilitas sementara
--    Production lama masih membaca pp1_banjar sampai deploy kode
--    baru selesai. View di bawah menjaga aplikasi tetap jalan.
--    >>> HAPUS view ini setelah deploy kode baru selesai <<<
-- ------------------------------------------------------------
drop view if exists public.pp1_banjar;
create view public.pp1_banjar as select * from public.pp1_banjarmasin;

-- ------------------------------------------------------------
-- 3) Samakan label Hak Akses pada master role & data pengguna
-- ------------------------------------------------------------
update users_role  set akses_pp = 'PP1 Banjarmasin' where akses_pp = 'PP1 Banjar';
update users_akun  set akses_pp = 'PP1 Banjarmasin' where akses_pp = 'PP1 Banjar';

-- ------------------------------------------------------------
-- 4) Verifikasi
-- ------------------------------------------------------------
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('pp1_banjar', 'pp1_banjarmasin')
order by table_name;

select role, akses_role, akses_pp
from users_role
where akses_role = 'Packing Plant 1'
order by akses_pp;

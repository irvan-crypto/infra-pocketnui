-- ============================================================
-- FIX RLS: tabel shipments tidak terlihat dari aplikasi
-- ============================================================
-- Penyebab: aplikasi ini memakai login CUSTOM (bukan Supabase Auth),
-- sehingga request dari browser memakai anon key TANPA JWT role claim.
-- Policy lama mensyaratkan  auth.jwt() ->> 'role' = 'admin' / 'manager' /
-- 'operator', sehingga TIDAK ADA policy yang cocok -> SELECT berhasil
-- tapi mengembalikan array kosong ([]).
--
-- Jalankan file ini di Supabase Dashboard -> SQL Editor.
-- ============================================================

alter table shipments enable row level security;

-- 1) Hapus policy lama yang mensyaratkan JWT role
drop policy if exists admin_all on shipments;
drop policy if exists manager_read on shipments;
drop policy if exists operator_insert on shipments;
drop policy if exists operator_update on shipments;
drop policy if exists "Allow read for all authenticated" on shipments;

-- 2) Policy baru: izinkan akses untuk anon + authenticated
--    CATATAN: ini untuk tahap development/internal.
--    Untuk produksi, pindah ke Supabase Auth + policy berbasis auth.uid().
drop policy if exists shipments_read_all on shipments;
create policy shipments_read_all on shipments
  for select to anon, authenticated
  using (true);

drop policy if exists shipments_insert_all on shipments;
create policy shipments_insert_all on shipments
  for insert to anon, authenticated
  with check (true);

drop policy if exists shipments_update_all on shipments;
create policy shipments_update_all on shipments
  for update to anon, authenticated
  using (true) with check (true);

drop policy if exists shipments_delete_all on shipments;
create policy shipments_delete_all on shipments
  for delete to anon, authenticated
  using (true);

-- 3) Verifikasi (harus mengembalikan jumlah baris > 0)
select count(*) as total_rows from shipments;
select id, nama_kapal, pelabuhan_asal, tujuan_pp, ta_pp
from shipments
order by created_at desc
limit 5;
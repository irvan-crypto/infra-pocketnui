-- ============================================================
-- HAPUS TABEL LAMA `pengguna`
-- ============================================================
-- JALANKAN HANYA SETELAH:
--   1) 20240101000004_users_akun.sql sukses, DAN
--   2) aplikasi versi baru sudah deploy + login diuji dengan users_akun.
--
-- Sebelum drop, cek hasil migrasi:
select id, username, role, akses, akses_pp, status from users_akun order by username;
-- Bandingkan jumlahnya dengan tabel lama:
select count(*) as jumlah_lama from pengguna;

-- Jika jumlah users_akun >= jumlah pengguna, lanjutkan:
drop table if exists pengguna;

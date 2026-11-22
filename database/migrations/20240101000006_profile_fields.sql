-- Field tambahan profil pengguna (signature tidak digunakan)
alter table users_akun add column if not exists avatar_url text;

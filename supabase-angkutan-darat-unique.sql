-- ============================================================
-- ANGKUTAN DARAT: KEUNIKAN (TANGGAL + NAMA EXPEDITUR)
-- ============================================================
-- Aturan:
-- - Tanggal sama + expeditur BERBEDA -> valid (boleh input)
-- - Tanggal sama + expeditur SAMA    -> ditolak (gunakan Edit)
--
-- INSTRUKSI:
-- 1. Buka Supabase Dashboard -> SQL Editor
-- 2. Paste seluruh isi file ini, lalu Run
-- 3. Aman dijalankan ulang (idempotent)
-- ============================================================

-- 1) Lepas UNIQUE lama yang hanya mencakup kolom tanggal (jika ada,
--    apapun namanya) supaya tanggal sama dengan expeditur berbeda
--    tidak lagi ditolak di level database.
do $$
declare r record;
begin
  for r in
    select i.relname as index_name
    from pg_index ix
    join pg_class i on i.oid = ix.indexrelid
    join pg_class t on t.oid = ix.indrelid
    join pg_attribute a on a.attrelid = t.oid and a.attnum = ix.indkey[0]
    where t.relname = 'angkutan_darat'
      and ix.indisunique
      and not ix.indisprimary
      and ix.indnkeyatts = 1
      and a.attname = 'tanggal'
  loop
    execute format('alter table angkutan_darat drop constraint if exists %I', r.index_name);
    execute format('drop index if exists %I', r.index_name);
  end loop;
end $$;

-- 2) Pasang UNIQUE (tanggal, nama_expeditur) sebagai pengaman database.
--    Jika data lama masih mengandung duplikat kombinasi ini, constraint
--    sengaja tidak dipasang (lihat NOTICE) — bersihkan dulu duplikatnya.
do $$
declare n int;
begin
  select count(*) into n from (
    select 1 from angkutan_darat
    group by tanggal, nama_expeditur
    having count(*) > 1
    limit 1
  ) x;
  if n = 0 then
    execute 'create unique index if not exists uq_angkutan_darat_tanggal_expeditur on angkutan_darat (tanggal, nama_expeditur)';
    raise notice 'OK: unique (tanggal, nama_expeditur) terpasang.';
  else
    raise notice 'BATAL: masih ada duplikat (tanggal + expeditur). Bersihkan dulu, lalu jalankan ulang file ini.';
  end if;
end $$;

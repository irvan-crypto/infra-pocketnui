-- ============================================================
-- MIGRASI: Tabel PP1 & PP2 → struktur OPC + PCC
-- File   : supabase-pp1-pp2-opc-pcc.sql
-- Target : 12 tabel (6 PP1 + 6 PP2)
-- Sifat  : idempotent — aman dijalankan berulang
--
-- Prefix per tabel (kolom baru mengikuti prefix tabelnya):
--   pp1_samarinda  → sama      pp2_bitung  → btg
--   pp1_balikpapan → bpp       pp2_mamuju  → mmju
--   pp1_banjarmasin     → bjr       pp2_kendari → kdri
--   pp1_palu       → palu      pp2_oba     → oba
--   pp1_lembar     → lbr       pp2_ambon   → abn
--   pp1_makassar   → mks       pp2_sorong  → srg
--
-- Perubahan per tabel (contoh prefix <p>):
--   1. RENAME (data lama tetap aman):
--        <p>_masuk → <p>_masuk_opc
--        <p>_rilis → <p>_riliscurah_opc
--        <p>_stok  → <p>_stokakhir_opc
--   2. TAMBAH kolom input manual (numeric(15,2) default 0):
--        <p>_stokawal_opc, <p>_riliszak50_opc, <p>_riliszak40_opc,
--        <p>_rilisjcurah_opc,
--        <p>_masuk_pcc, <p>_riliscurah_pcc, <p>_riliszak50_pcc,
--        <p>_riliszak40_pcc, <p>_rilisjcurah_pcc,
--        <p>_stokawal_pcc, <p>_stokakhir_pcc
--   3. TAMBAH kolom GENERATED (dihitung database, tidak diisi manual):
--        <p>_totalcurah_opc = <p>_riliscurah_opc + <p>_rilisjcurah_opc
--        <p>_totalzak_opc   = <p>_riliszak50_opc  + <p>_riliszak40_opc
--        <p>_totalcurah_pcc = <p>_riliscurah_pcc + <p>_rilisjcurah_pcc
--        <p>_totalzak_pcc   = <p>_riliszak50_pcc  + <p>_riliszak40_pcc
--
-- Hasil akhir per tabel: 22 kolom
--   id, tanggal,
--   stokawal_opc, masuk_opc, riliscurah_opc, riliszak50_opc, riliszak40_opc,
--   rilisjcurah_opc, stokakhir_opc, totalcurah_opc*, totalzak_opc*,
--   stokawal_pcc, masuk_pcc, riliscurah_pcc, riliszak50_pcc, riliszak40_pcc,
--   rilisjcurah_pcc, stokakhir_pcc, totalcurah_pcc*, totalzak_pcc*,
--   create_date, update_date        (* = generated stored)
--
-- CATATAN PENTING
-- - Stok akhir TETAP input manual (bukan generated).
-- - RENAME menjaga posisi kolom lama; kolom baru ditambahkan di AKHIR
--   tabel (Postgres tidak bisa menyusun ulang urutan kolom tanpa rebuild).
-- - Trigger update_date & RLS tidak diubah (sudah dibuat oleh
--   supabase-monitoring-tables.sql).
-- - Snapshot backup dibuat otomatis: <tabel>_backup_ppopc (sekali saja,
--   tidak ditimpa saat file dijalankan ulang).
-- - SETELAH ini dijalankan, lib/monitoring-config.ts WAJIB ikut diupdate
--   (ppFields), kalau tidak halaman /monitoring/pp1-* & /monitoring/pp2-*
--   akan error karena nama kolom lama sudah tidak ada.
--
-- ROLLBACK (kalau perlu kembali ke struktur lama):
--   alter table <tabel> drop column <p>_stokawal_opc, ... ;
--   alter table <tabel> rename column <p>_masuk_opc to <p>_masuk; dst.
--   atau pulihkan dari <tabel>_backup_ppopc.
-- ============================================================

begin;

do $$
declare
  spec   record;
  tbl    text;
  pfx    text;
  suffix text;
begin
  for spec in
    select *
    from (values
      ('pp1_samarinda',  'sama'),
      ('pp1_balikpapan', 'bpp'),
      ('pp1_banjarmasin',     'bjr'),
      ('pp1_palu',       'palu'),
      ('pp1_lembar',     'lbr'),
      ('pp1_makassar',   'mks'),
      ('pp2_bitung',     'btg'),
      ('pp2_mamuju',     'mmju'),
      ('pp2_kendari',    'kdri'),
      ('pp2_oba',        'oba'),
      ('pp2_ambon',      'abn'),
      ('pp2_sorong',     'srg')
    ) as v(tbl, pfx)
  loop
    tbl := spec.tbl;
    pfx := spec.pfx;

    if to_regclass('public.' || tbl) is null then
      raise notice 'Dilewati (tabel tidak ada): %', tbl;
      continue;
    end if;

    -- --------------------------------------------------------
    -- 0. Snapshot backup sebelum diubah (sekali saja)
    -- --------------------------------------------------------
    execute format(
      'create table if not exists %I as select * from %I',
      tbl || '_backup_ppopc', tbl
    );

    -- --------------------------------------------------------
    -- 1. RENAME kolom lama → nama baru (hanya jika belum di-rename)
    -- --------------------------------------------------------
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = tbl
        and column_name = pfx || '_masuk'
    ) and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = tbl
        and column_name = pfx || '_masuk_opc'
    ) then
      execute format(
        'alter table %I rename column %I to %I',
        tbl, pfx || '_masuk', pfx || '_masuk_opc'
      );
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = tbl
        and column_name = pfx || '_rilis'
    ) and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = tbl
        and column_name = pfx || '_riliscurah_opc'
    ) then
      execute format(
        'alter table %I rename column %I to %I',
        tbl, pfx || '_rilis', pfx || '_riliscurah_opc'
      );
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = tbl
        and column_name = pfx || '_stok'
    ) and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = tbl
        and column_name = pfx || '_stokakhir_opc'
    ) then
      execute format(
        'alter table %I rename column %I to %I',
        tbl, pfx || '_stok', pfx || '_stokakhir_opc'
      );
    end if;

    -- --------------------------------------------------------
    -- 2. Kolom input manual baru (default 0)
    -- --------------------------------------------------------
    foreach suffix in array array[
      '_stokawal_opc',
      '_riliszak50_opc',
      '_riliszak40_opc',
      '_rilisjcurah_opc',
      '_masuk_pcc',
      '_riliscurah_pcc',
      '_riliszak50_pcc',
      '_riliszak40_pcc',
      '_rilisjcurah_pcc',
      '_stokawal_pcc',
      '_stokakhir_pcc'
    ] loop
      execute format(
        'alter table %I add column if not exists %I numeric(15, 2) default 0',
        tbl, pfx || suffix
      );
    end loop;

    -- --------------------------------------------------------
    -- 3. Kolom generated (auto jumlah)
    -- --------------------------------------------------------
    -- OPC
    execute format(
      'alter table %I add column if not exists %I numeric(15, 2)
         generated always as (coalesce(%I, 0) + coalesce(%I, 0)) stored',
      tbl, pfx || '_totalcurah_opc', pfx || '_riliscurah_opc', pfx || '_rilisjcurah_opc'
    );
    execute format(
      'alter table %I add column if not exists %I numeric(15, 2)
         generated always as (coalesce(%I, 0) + coalesce(%I, 0)) stored',
      tbl, pfx || '_totalzak_opc', pfx || '_riliszak50_opc', pfx || '_riliszak40_opc'
    );
    -- PCC
    execute format(
      'alter table %I add column if not exists %I numeric(15, 2)
         generated always as (coalesce(%I, 0) + coalesce(%I, 0)) stored',
      tbl, pfx || '_totalcurah_pcc', pfx || '_riliscurah_pcc', pfx || '_rilisjcurah_pcc'
    );
    execute format(
      'alter table %I add column if not exists %I numeric(15, 2)
         generated always as (coalesce(%I, 0) + coalesce(%I, 0)) stored',
      tbl, pfx || '_totalzak_pcc', pfx || '_riliszak50_pcc', pfx || '_riliszak40_pcc'
    );

    raise notice 'Selesai: % (prefix %)', tbl, pfx;
  end loop;
end $$;

commit;

-- ============================================================
-- VERIFIKASI
-- Ekspektasi tiap tabel: total_kolom = 22, kolom_opc = 9,
-- kolom_pcc = 9, kolom_generated = 4
-- ============================================================
select
  table_name,
  count(*)                                        as total_kolom,
  count(*) filter (where column_name like '%\_opc') as kolom_opc,
  count(*) filter (where column_name like '%\_pcc') as kolom_pcc,
  count(*) filter (where is_generated = 'ALWAYS')   as kolom_generated
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'pp1_samarinda', 'pp1_balikpapan', 'pp1_banjarmasin',
    'pp1_palu', 'pp1_lembar', 'pp1_makassar',
    'pp2_bitung', 'pp2_mamuju', 'pp2_kendari',
    'pp2_oba', 'pp2_ambon', 'pp2_sorong'
  )
group by table_name
order by table_name;

-- Detail kolom satu tabel (sampel untuk pengecekan nama & posisi)
select ordinal_position, column_name, data_type, is_generated
from information_schema.columns
where table_schema = 'public' and table_name = 'pp1_samarinda'
order by ordinal_position;

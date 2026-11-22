-- ============================================================
-- BACKFILL: kolom stok awal PP1 & PP2
-- File   : supabase-pp1-pp2-backfill-stokawal.sql
-- Aturan : stok awal suatu tanggal = stok akhir tanggal sebelumnya
--          (per tabel, diurutkan berdasarkan tanggal)
-- Sifat  : idempotent — hanya mengisi baris yang stok awalnya
--          masih kosong (NULL atau 0), jadi aman dijalankan ulang
--          dan TIDAK menimpa angka yang sudah diisi manual.
--
-- Kolom yang diisi:
--   <p>_stokawal_opc  ← <p>_stokakhir_opc  (tanggal sebelumnya)
--   <p>_stokawal_pcc  ← <p>_stokakhir_pcc  (tanggal sebelumnya)
--
-- Catatan:
-- - Baris tanggal paling awal tidak punya "hari sebelumnya",
--   jadi stok awalnya dibiarkan apa adanya (0) — isi manual.
-- - Blok PCC saat ini semuanya 0, jadi hasilnya tetap 0 (tidak ada
--   perubahan); aman.
-- - Kalau ingin MENIMPA semua nilai stok awal (termasuk yang sudah
--   diisi manual), ubah kondisi "only_empty := true" menjadi false
--   di blok DO di bawah.
-- - Backup cepat (opsional, jalankan dulu kalau ragu):
--     create table pp1_samarinda_bak_stokawal as
--       select id, tanggal, sama_stokawal_opc, sama_stokakhir_opc from pp1_samarinda;
-- ============================================================

begin;

do $$
declare
  spec       record;
  tbl        text;
  pfx        text;
  suffix     text;
  col_awal   text;
  col_akhir  text;
  affected   integer;
  only_empty boolean := true; -- true = jangan timpa nilai yang sudah ada
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

    foreach suffix in array array['_opc', '_pcc'] loop
      col_awal  := pfx || '_stokawal'  || suffix;
      col_akhir := pfx || '_stokakhir' || suffix;

      -- pastikan kolomnya ada (migrasi supabase-pp1-pp2-opc-pcc.sql sudah jalan)
      if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = tbl
          and column_name = col_awal
      ) then
        raise notice 'Dilewati (%): kolom % tidak ada — jalankan migrasi dulu', tbl, col_awal;
        continue;
      end if;

      -- stok awal hari ini = stok akhir hari sebelumnya
      execute format($q$
        with prev as (
          select id,
                 lag(%1$I) over (order by tanggal, create_date) as prev_stok
          from %2$I
        )
        update %2$I t
           set %3$I = prev.prev_stok
          from prev
         where prev.id = t.id
           and prev.prev_stok is not null
           and t.%3$I is distinct from prev.prev_stok
           %4$s
      $q$,
        col_akhir, -- %1$I : kolom yang dibaca (stok akhir hari sebelumnya)
        tbl,       -- %2$I : tabel
        col_awal,  -- %3$I : kolom yang ditulis (stok awal)
        case when only_empty
             then format('and (t.%I is null or t.%I = 0)', col_awal, col_awal)
             else ''
        end        -- %4$s : filter "hanya yang kosong"
      );

      get diagnostics affected = row_count;
      raise notice '% → %: % baris diisi', tbl, col_awal, affected;
    end loop;
  end loop;
end $$;

commit;

-- ============================================================
-- VERIFIKASI: jumlah baris terisi vs total, per tabel
-- Ekspektasi: "terisi" = total baris − 1 (tanggal paling awal
-- tidak punya hari sebelumnya), kecuali data PCC yang masih 0.
-- ============================================================
do $$
declare
  spec record;
  r    record;
begin
  for spec in
    select * from (values
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
    if to_regclass('public.' || spec.tbl) is null then
      continue;
    end if;
    execute format(
      'select count(*) as total,
              count(*) filter (where %I <> 0) as terisi_opc,
              count(*) filter (where %I <> 0) as terisi_pcc
         from %I',
      spec.pfx || '_stokawal_opc', spec.pfx || '_stokawal_pcc', spec.tbl
    ) into r;
    raise notice '% → total % baris, stokawal_opc terisi %, stokawal_pcc terisi %',
      spec.tbl, r.total, r.terisi_opc, r.terisi_pcc;
  end loop;
end $$;

-- Sampel hasil (silakan ganti nama tabel/prefix sesuai kebutuhan)
select tanggal,
       sama_stokawal_opc,
       sama_masuk_opc,
       sama_riliscurah_opc,
       sama_rilisjcurah_opc,
       sama_totalcurah_opc,
       sama_riliszak50_opc,
       sama_riliszak40_opc,
       sama_totalzak_opc,
       sama_stokakhir_opc
from pp1_samarinda
order by tanggal;

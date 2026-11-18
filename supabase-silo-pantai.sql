-- ============================================================
-- TABEL SILO PANTAI (TAMBAHAN KE-18) + DATA CONTOH
-- ============================================================
-- INSTRUKSI:
-- 1. Buka Supabase Dashboard -> SQL Editor
-- 2. Paste seluruh isi file ini, lalu Run
-- 3. Aman dijalankan ulang (idempotent):
--    - CREATE TABLE IF NOT EXISTS
--    - DROP TRIGGER/POLICY IF EXISTS sebelum dibuat
--    - Data contoh & kapasitas di-skip jika sudah ada
--
-- CATATAN PENTING:
-- - total_stok adalah GENERATED COLUMN (dihitung otomatis dari
--   silo_1..silo_10). JANGAN diisi manual dari aplikasi.
-- - update_date diperbarui otomatis oleh trigger saat UPDATE.
-- - RLS terbuka untuk anon + authenticated (pola tabel monitoring lain).
-- - Kapasitas & deadstok Silo Pantai di tabel packing_plant memakai
--   NILAI SEMENTARA (kapasitas 5.000 / deadstok 500 per silo).
--   >>> Ganti dengan nilai sebenarnya bila sudah ada <<<
-- ============================================================

-- ============================================================
-- 1. TABEL SILO PANTAI
-- ============================================================
create table if not exists silo_pantai (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  silo_1 numeric(15, 2) default 0,
  silo_2 numeric(15, 2) default 0,
  silo_3 numeric(15, 2) default 0,
  silo_4 numeric(15, 2) default 0,
  silo_5 numeric(15, 2) default 0,
  silo_6 numeric(15, 2) default 0,
  silo_7 numeric(15, 2) default 0,
  silo_8 numeric(15, 2) default 0,
  silo_9 numeric(15, 2) default 0,
  silo_10 numeric(15, 2) default 0,
  total_stok numeric(15, 2) generated always as (
    coalesce(silo_1, 0) + coalesce(silo_2, 0) + coalesce(silo_3, 0) +
    coalesce(silo_4, 0) + coalesce(silo_5, 0) + coalesce(silo_6, 0) +
    coalesce(silo_7, 0) + coalesce(silo_8, 0) + coalesce(silo_9, 0) +
    coalesce(silo_10, 0)
  ) stored,
  create_date timestamp with time zone default now(),
  update_date timestamp with time zone default now()
);
create index if not exists idx_silo_pantai_tanggal on silo_pantai(tanggal);

-- ============================================================
-- 2. KAPASITAS & DEADSTOK SILO PANTAI (tabel packing_plant)
--    Kapasitas asli SUDAH TERSEDIA di baris packing_plant dengan
--    nama_pp "Silo 1" s.d. "Silo 10" — tidak perlu insert baru.
--    Grafik membaca angka dari nama_pp, jadi otomatis cocok.
--
--    Blok di bawah hanya membersihkan placeholder lama
--    ("Silo Pantai 1"-"Silo Pantai 10") bila sempat ter-insert.
-- ============================================================
delete from packing_plant where nama_pp like 'Silo Pantai %';

-- ============================================================
-- 3. TRIGGER + RLS (sama dengan tabel monitoring lain)
-- ============================================================
create or replace function update_update_date()
returns trigger as $$
begin
  new.update_date = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  foreach t in array array['silo_pantai'] loop
    -- Trigger: update_date otomatis saat UPDATE
    execute format('drop trigger if exists trg_%s_update_date on %I', t, t);
    execute format(
      'create trigger trg_%s_update_date before update on %I
       for each row execute function update_update_date()', t, t
    );

    -- RLS: enable + policy terbuka (anon + authenticated)
    execute format('alter table %I enable row level security', t);

    execute format('drop policy if exists %I on %I', t || '_read_all', t);
    execute format(
      'create policy %I on %I for select to anon, authenticated using (true)',
      t || '_read_all', t
    );

    execute format('drop policy if exists %I on %I', t || '_insert_all', t);
    execute format(
      'create policy %I on %I for insert to anon, authenticated with check (true)',
      t || '_insert_all', t
    );

    execute format('drop policy if exists %I on %I', t || '_update_all', t);
    execute format(
      'create policy %I on %I for update to anon, authenticated using (true) with check (true)',
      t || '_update_all', t
    );

    execute format('drop policy if exists %I on %I', t || '_delete_all', t);
    execute format(
      'create policy %I on %I for delete to anon, authenticated using (true)',
      t || '_delete_all', t
    );
  end loop;
end $$;

-- ============================================================
-- 4. DATA CONTOH (5 baris terakhir, relatif hari ini)
--    Aman dijalankan ulang: baris dengan tanggal yang sama
--    tidak akan diduplikasi (guard per tanggal).
-- ============================================================
insert into silo_pantai (tanggal, silo_1, silo_2, silo_3, silo_4, silo_5, silo_6, silo_7, silo_8, silo_9, silo_10)
select * from (values
  (current_date - 4, 3200, 2800, 4100, 2400, 3600, 2900, 4300, 2600, 3800, 3100),
  (current_date - 3, 3050, 2950, 3950, 2550, 3450, 3050, 4150, 2500, 3700, 3250),
  (current_date - 2, 3350, 2700, 4250, 2300, 3700, 2800, 4400, 2700, 3900, 3000),
  (current_date - 1, 3150, 2900, 4050, 2450, 3550, 2950, 4250, 2550, 3750, 3200),
  (current_date,     3250, 2850, 4150, 2350, 3650, 2850, 4350, 2650, 3850, 3150)
) as v(tanggal, silo_1, silo_2, silo_3, silo_4, silo_5, silo_6, silo_7, silo_8, silo_9, silo_10)
where not exists (select 1 from silo_pantai s where s.tanggal = v.tanggal);

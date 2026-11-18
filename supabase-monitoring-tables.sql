-- ============================================================
-- TABEL MONITORING INFRASTRUKTUR (17 TABEL) + DATA CONTOH
-- ============================================================
-- INSTRUKSI:
-- 1. Buka Supabase Dashboard -> SQL Editor
-- 2. Paste seluruh isi file ini, lalu Run
-- 3. Aman dijalankan ulang (idempotent):
--    - CREATE TABLE IF NOT EXISTS
--    - DROP TRIGGER/POLICY IF EXISTS sebelum dibuat
--    - Data contoh di-skip jika tanggal yang sama sudah ada
--
-- CATATAN PENTING:
-- - total_rilisopc / total_rilispcc adalah GENERATED COLUMN
--   (dihitung otomatis oleh database). JANGAN diisi manual dari
--   aplikasi -- cukup isi kolom rilis komponennya saja.
-- - update_date diperbarui otomatis oleh trigger saat UPDATE.
-- - RLS terbuka untuk anon + authenticated (pola sama dengan
--   tabel shipments_darat, karena aplikasi memakai login custom
--   dengan role di level aplikasi).
-- ============================================================


-- ============================================================
-- 1. SILO SEMEN
-- ============================================================
create table if not exists silo_semen (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  stok_silo21 numeric(15, 2) default 0,
  stok_silo22 numeric(15, 2) default 0,
  stok_silo23 numeric(15, 2) default 0,
  stok_silo24 numeric(15, 2) default 0,
  stok_silo41 numeric(15, 2) default 0,
  stok_silo42 numeric(15, 2) default 0,
  stok_silo43 numeric(15, 2) default 0,
  stok_silo51 numeric(15, 2) default 0,
  stok_silo52 numeric(15, 2) default 0,
  stok_silo53 numeric(15, 2) default 0,
  create_date timestamp with time zone default now(),
  update_date timestamp with time zone default now()
);
create index if not exists idx_silo_semen_tanggal on silo_semen(tanggal);

-- ============================================================
-- 2. CP TONASA
-- ============================================================
create table if not exists cp_tonasa (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  -- Blok OPC
  prod_fmopc numeric(15, 2) default 0,
  rilis_spantaiopc numeric(15, 2) default 0,
  rilis_sminiopc numeric(15, 2) default 0,
  rilis_curah_fotopc numeric(15, 2) default 0,
  rilis_jumbo_fobopc numeric(15, 2) default 0,
  rilis_jumbo_fotopc numeric(15, 2) default 0,
  total_rilisopc numeric(15, 2) generated always as (
    coalesce(rilis_spantaiopc, 0) + coalesce(rilis_sminiopc, 0) +
    coalesce(rilis_curah_fotopc, 0) + coalesce(rilis_jumbo_fobopc, 0) +
    coalesce(rilis_jumbo_fotopc, 0)
  ) stored,
  -- Blok PCC
  prod_fmpcc numeric(15, 2) default 0,
  rilis_spantaipcc numeric(15, 2) default 0,
  rilis_curah_fotpcc numeric(15, 2) default 0,
  rilis_ppmkspcc numeric(15, 2) default 0,
  rilis_packerpcc numeric(15, 2) default 0,
  rilis_polyslingpcc numeric(15, 2) default 0,
  rilis_jumbo_fobpcc numeric(15, 2) default 0,
  rilis_jumbo_fotpcc numeric(15, 2) default 0,
  total_rilispcc numeric(15, 2) generated always as (
    coalesce(rilis_spantaipcc, 0) + coalesce(rilis_curah_fotpcc, 0) +
    coalesce(rilis_ppmkspcc, 0) + coalesce(rilis_packerpcc, 0) +
    coalesce(rilis_polyslingpcc, 0) + coalesce(rilis_jumbo_fobpcc, 0) +
    coalesce(rilis_jumbo_fotpcc, 0)
  ) stored,
  create_date timestamp with time zone default now(),
  update_date timestamp with time zone default now()
);
create index if not exists idx_cp_tonasa_tanggal on cp_tonasa(tanggal);

-- ============================================================
-- 3. PP BIRINGKASSI
-- ============================================================
create table if not exists pp_biringkassi (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  -- Blok OPC
  masukopc numeric(15, 2) default 0,
  rilis_jumboopc numeric(15, 2) default 0,
  rilis_packeropc numeric(15, 2) default 0,
  rilis_outletppopc numeric(15, 2) default 0,
  total_rilisopc numeric(15, 2) generated always as (
    coalesce(rilis_jumboopc, 0) + coalesce(rilis_packeropc, 0) +
    coalesce(rilis_outletppopc, 0)
  ) stored,
  stok_opc numeric(15, 2) default 0,
  -- Blok PCC
  masukpcc numeric(15, 2) default 0,
  rilis_jumbopcc numeric(15, 2) default 0,
  rilis_packerpcc numeric(15, 2) default 0,
  rilis_outletpppcc numeric(15, 2) default 0,
  total_rilispcc numeric(15, 2) generated always as (
    coalesce(rilis_jumbopcc, 0) + coalesce(rilis_packerpcc, 0) +
    coalesce(rilis_outletpppcc, 0)
  ) stored,
  stok_pcc numeric(15, 2) default 0,
  create_date timestamp with time zone default now(),
  update_date timestamp with time zone default now()
);
create index if not exists idx_pp_biringkassi_tanggal on pp_biringkassi(tanggal);

-- ============================================================
-- 4. SILO MINI
-- ============================================================
create table if not exists silo_mini (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  masukopc numeric(15, 2) default 0,
  rilis_jumboopc numeric(15, 2) default 0,
  stok_opc numeric(15, 2) default 0,
  create_date timestamp with time zone default now(),
  update_date timestamp with time zone default now()
);
create index if not exists idx_silo_mini_tanggal on silo_mini(tanggal);

-- ============================================================
-- 5. PP1 SAMARINDA
-- ============================================================
create table if not exists pp1_samarinda (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  sama_masuk numeric(15, 2) default 0,
  sama_rilis numeric(15, 2) default 0,
  sama_stok numeric(15, 2) default 0,
  create_date timestamp with time zone default now(),
  update_date timestamp with time zone default now()
);
create index if not exists idx_pp1_samarinda_tanggal on pp1_samarinda(tanggal);

-- ============================================================
-- 6. PP1 BALIKPAPAN
-- ============================================================
create table if not exists pp1_balikpapan (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  bpp_masuk numeric(15, 2) default 0,
  bpp_rilis numeric(15, 2) default 0,
  bpp_stok numeric(15, 2) default 0,
  create_date timestamp with time zone default now(),
  update_date timestamp with time zone default now()
);
create index if not exists idx_pp1_balikpapan_tanggal on pp1_balikpapan(tanggal);

-- ============================================================
-- 7. PP1 BANJAR
-- ============================================================
create table if not exists pp1_banjar (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  bjr_masuk numeric(15, 2) default 0,
  bjr_rilis numeric(15, 2) default 0,
  bjr_stok numeric(15, 2) default 0,
  create_date timestamp with time zone default now(),
  update_date timestamp with time zone default now()
);
create index if not exists idx_pp1_banjar_tanggal on pp1_banjar(tanggal);

-- ============================================================
-- 8. PP1 PALU
-- ============================================================
create table if not exists pp1_palu (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  palu_masuk numeric(15, 2) default 0,
  palu_rilis numeric(15, 2) default 0,
  palu_stok numeric(15, 2) default 0,
  create_date timestamp with time zone default now(),
  update_date timestamp with time zone default now()
);
create index if not exists idx_pp1_palu_tanggal on pp1_palu(tanggal);

-- ============================================================
-- 9. PP1 LEMBAR
-- ============================================================
create table if not exists pp1_lembar (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  lbr_masuk numeric(15, 2) default 0,
  lbr_rilis numeric(15, 2) default 0,
  lbr_stok numeric(15, 2) default 0,
  create_date timestamp with time zone default now(),
  update_date timestamp with time zone default now()
);
create index if not exists idx_pp1_lembar_tanggal on pp1_lembar(tanggal);

-- ============================================================
-- 10. PP1 MAKASSAR
-- ============================================================
create table if not exists pp1_makassar (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  mks_masuk numeric(15, 2) default 0,
  mks_rilis numeric(15, 2) default 0,
  mks_stok numeric(15, 2) default 0,
  create_date timestamp with time zone default now(),
  update_date timestamp with time zone default now()
);
create index if not exists idx_pp1_makassar_tanggal on pp1_makassar(tanggal);

-- ============================================================
-- 11. PP2 BITUNG
-- ============================================================
create table if not exists pp2_bitung (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  btg_masuk numeric(15, 2) default 0,
  btg_rilis numeric(15, 2) default 0,
  btg_stok numeric(15, 2) default 0,
  create_date timestamp with time zone default now(),
  update_date timestamp with time zone default now()
);
create index if not exists idx_pp2_bitung_tanggal on pp2_bitung(tanggal);

-- ============================================================
-- 12. PP2 MAMUJU
-- ============================================================
create table if not exists pp2_mamuju (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  mmju_masuk numeric(15, 2) default 0,
  mmju_rilis numeric(15, 2) default 0,
  mmju_stok numeric(15, 2) default 0,
  create_date timestamp with time zone default now(),
  update_date timestamp with time zone default now()
);
create index if not exists idx_pp2_mamuju_tanggal on pp2_mamuju(tanggal);

-- ============================================================
-- 13. PP2 KENDARI
-- ============================================================
create table if not exists pp2_kendari (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  kdri_masuk numeric(15, 2) default 0,
  kdri_rilis numeric(15, 2) default 0,
  kdri_stok numeric(15, 2) default 0,
  create_date timestamp with time zone default now(),
  update_date timestamp with time zone default now()
);
create index if not exists idx_pp2_kendari_tanggal on pp2_kendari(tanggal);

-- ============================================================
-- 14. PP2 OBA
-- ============================================================
create table if not exists pp2_oba (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  oba_masuk numeric(15, 2) default 0,
  oba_rilis numeric(15, 2) default 0,
  oba_stok numeric(15, 2) default 0,
  create_date timestamp with time zone default now(),
  update_date timestamp with time zone default now()
);
create index if not exists idx_pp2_oba_tanggal on pp2_oba(tanggal);

-- ============================================================
-- 15. PP2 AMBON
-- ============================================================
create table if not exists pp2_ambon (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  abn_masuk numeric(15, 2) default 0,
  abn_rilis numeric(15, 2) default 0,
  abn_stok numeric(15, 2) default 0,
  create_date timestamp with time zone default now(),
  update_date timestamp with time zone default now()
);
create index if not exists idx_pp2_ambon_tanggal on pp2_ambon(tanggal);

-- ============================================================
-- 16. PP2 SORONG
-- ============================================================
create table if not exists pp2_sorong (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  srg_masuk numeric(15, 2) default 0,
  srg_rilis numeric(15, 2) default 0,
  srg_stok numeric(15, 2) default 0,
  create_date timestamp with time zone default now(),
  update_date timestamp with time zone default now()
);
create index if not exists idx_pp2_sorong_tanggal on pp2_sorong(tanggal);

-- ============================================================
-- 17. ANGKUTAN DARAT
-- ============================================================
create table if not exists angkutan_darat (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  nama_expeditur text not null,
  retase integer default 0,
  armada_operasi integer default 0,
  create_date timestamp with time zone default now(),
  update_date timestamp with time zone default now()
);
create index if not exists idx_angkutan_darat_tanggal on angkutan_darat(tanggal);
create index if not exists idx_angkutan_darat_expeditur on angkutan_darat(nama_expeditur);


-- ============================================================
-- TRIGGER + RLS (semua tabel di atas)
-- ============================================================
-- Function update_date otomatis (sama dengan shipments_darat;
-- CREATE OR REPLACE agar tidak duplikat jika sudah ada)
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
  foreach t in array array[
    'silo_semen', 'cp_tonasa', 'pp_biringkassi', 'silo_mini',
    'pp1_samarinda', 'pp1_balikpapan', 'pp1_banjar', 'pp1_palu',
    'pp1_lembar', 'pp1_makassar',
    'pp2_bitung', 'pp2_mamuju', 'pp2_kendari', 'pp2_oba',
    'pp2_ambon', 'pp2_sorong',
    'angkutan_darat'
  ] loop
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
-- DATA CONTOH (5 baris terakhir per tabel, relatif hari ini)
-- ============================================================
-- Aman dijalankan ulang: baris dengan tanggal yang sama tidak
-- akan diduplikasi (guard per tanggal).

-- ── 1. Silo Semen ──
insert into silo_semen (tanggal, stok_silo21, stok_silo22, stok_silo23, stok_silo24, stok_silo41, stok_silo42, stok_silo43, stok_silo51, stok_silo52, stok_silo53)
select * from (values
  (current_date - 4, 5200, 4800, 6100, 3500, 7200, 6800, 2900, 5400, 4100, 7600),
  (current_date - 3, 4950, 5100, 5850, 3900, 6950, 6500, 3200, 5150, 4350, 7300),
  (current_date - 2, 5400, 4650, 6300, 3300, 7400, 7050, 2700, 5600, 3900, 7800),
  (current_date - 1, 5100, 5250, 6000, 3700, 7100, 6650, 3050, 5300, 4200, 7500),
  (current_date,     5350, 4900, 6200, 3450, 7250, 6900, 2850, 5450, 4050, 7650)
) as v(tanggal, stok_silo21, stok_silo22, stok_silo23, stok_silo24, stok_silo41, stok_silo42, stok_silo43, stok_silo51, stok_silo52, stok_silo53)
where not exists (select 1 from silo_semen s where s.tanggal = v.tanggal);

-- ── 2. CP Tonasa (total_rilis* dihitung otomatis, tidak diisi) ──
insert into cp_tonasa (tanggal, prod_fmopc, rilis_spantaiopc, rilis_sminiopc, rilis_curah_fotopc, rilis_jumbo_fobopc, rilis_jumbo_fotopc, prod_fmpcc, rilis_spantaipcc, rilis_curah_fotpcc, rilis_ppmkspcc, rilis_packerpcc, rilis_polyslingpcc, rilis_jumbo_fobpcc, rilis_jumbo_fotpcc)
select * from (values
  (current_date - 4, 7200, 1850,  950, 1400, 1100,  850, 5400, 1600, 750, 480,  950, 320, 640, 520),
  (current_date - 3, 6850, 1700,  880, 1320, 1050,  790, 5150, 1520, 700, 440,  900, 300, 600, 480),
  (current_date - 2, 7450, 1950, 1020, 1480, 1180,  910, 5650, 1680, 800, 520, 1000, 340, 680, 560),
  (current_date - 1, 7000, 1780,  920, 1380, 1080,  820, 5250, 1560, 720, 460,  930, 310, 620, 500),
  (current_date,     7600, 2000, 1050, 1520, 1220,  950, 5800, 1720, 830, 540, 1040, 355, 700, 585)
) as v(tanggal, prod_fmopc, rilis_spantaiopc, rilis_sminiopc, rilis_curah_fotopc, rilis_jumbo_fobopc, rilis_jumbo_fotopc, prod_fmpcc, rilis_spantaipcc, rilis_curah_fotpcc, rilis_ppmkspcc, rilis_packerpcc, rilis_polyslingpcc, rilis_jumbo_fobpcc, rilis_jumbo_fotpcc)
where not exists (select 1 from cp_tonasa c where c.tanggal = v.tanggal);

-- ── 3. PP Biringkassi (total_rilis* dihitung otomatis, tidak diisi) ──
insert into pp_biringkassi (tanggal, masukopc, rilis_jumboopc, rilis_packeropc, rilis_outletppopc, stok_opc, masukpcc, rilis_jumbopcc, rilis_packerpcc, rilis_outletpppcc, stok_pcc)
select * from (values
  (current_date - 4, 3200, 1450,  980, 420, 2600, 1850,  720, 540, 260, 1350),
  (current_date - 3, 3050, 1380,  930, 395, 2450, 1720,  680, 500, 240, 1280),
  (current_date - 2, 3350, 1520, 1030, 450, 2750, 1950,  760, 570, 280, 1420),
  (current_date - 1, 3150, 1420,  960, 410, 2520, 1780,  700, 520, 250, 1300),
  (current_date,     3420, 1560, 1060, 465, 2820, 2000,  780, 585, 290, 1450)
) as v(tanggal, masukopc, rilis_jumboopc, rilis_packeropc, rilis_outletppopc, stok_opc, masukpcc, rilis_jumbopcc, rilis_packerpcc, rilis_outletpppcc, stok_pcc)
where not exists (select 1 from pp_biringkassi p where p.tanggal = v.tanggal);

-- ── 4. Silo Mini ──
insert into silo_mini (tanggal, masukopc, rilis_jumboopc, stok_opc)
select * from (values
  (current_date - 4, 850, 720, 2400),
  (current_date - 3, 800, 680, 2570),
  (current_date - 2, 900, 760, 2710),
  (current_date - 1, 830, 700, 2840),
  (current_date,     880, 745, 2975)
) as v(tanggal, masukopc, rilis_jumboopc, stok_opc)
where not exists (select 1 from silo_mini s where s.tanggal = v.tanggal);

-- ── 5. PP1 Samarinda ──
insert into pp1_samarinda (tanggal, sama_masuk, sama_rilis, sama_stok)
select * from (values
  (current_date - 4, 950, 820, 3100),
  (current_date - 3, 900, 780, 3220),
  (current_date - 2, 1000, 870, 3250),
  (current_date - 1, 930, 800, 3380),
  (current_date,     980, 850, 3510)
) as v(tanggal, sama_masuk, sama_rilis, sama_stok)
where not exists (select 1 from pp1_samarinda p where p.tanggal = v.tanggal);

-- ── 6. PP1 Balikpapan ──
insert into pp1_balikpapan (tanggal, bpp_masuk, bpp_rilis, bpp_stok)
select * from (values
  (current_date - 4, 780, 650, 2050),
  (current_date - 3, 740, 620, 2170),
  (current_date - 2, 820, 690, 2300),
  (current_date - 1, 760, 640, 2420),
  (current_date,     800, 670, 2550)
) as v(tanggal, bpp_masuk, bpp_rilis, bpp_stok)
where not exists (select 1 from pp1_balikpapan p where p.tanggal = v.tanggal);

-- ── 7. PP1 Banjar ──
insert into pp1_banjar (tanggal, bjr_masuk, bjr_rilis, bjr_stok)
select * from (values
  (current_date - 4, 620, 540, 1500),
  (current_date - 3, 590, 510, 1580),
  (current_date - 2, 650, 570, 1660),
  (current_date - 1, 610, 530, 1740),
  (current_date,     640, 555, 1825)
) as v(tanggal, bjr_masuk, bjr_rilis, bjr_stok)
where not exists (select 1 from pp1_banjar p where p.tanggal = v.tanggal);

-- ── 8. PP1 Palu ──
insert into pp1_palu (tanggal, palu_masuk, palu_rilis, palu_stok)
select * from (values
  (current_date - 4, 540, 470, 1300),
  (current_date - 3, 510, 445, 1365),
  (current_date - 2, 565, 495, 1435),
  (current_date - 1, 530, 460, 1505),
  (current_date,     555, 480, 1580)
) as v(tanggal, palu_masuk, palu_rilis, palu_stok)
where not exists (select 1 from pp1_palu p where p.tanggal = v.tanggal);

-- ── 9. PP1 Lembar ──
insert into pp1_lembar (tanggal, lbr_masuk, lbr_rilis, lbr_stok)
select * from (values
  (current_date - 4, 880, 760, 2800),
  (current_date - 3, 840, 720, 2920),
  (current_date - 2, 920, 800, 3040),
  (current_date - 1, 865, 745, 3160),
  (current_date,     905, 780, 3285)
) as v(tanggal, lbr_masuk, lbr_rilis, lbr_stok)
where not exists (select 1 from pp1_lembar p where p.tanggal = v.tanggal);

-- ── 10. PP1 Makassar ──
insert into pp1_makassar (tanggal, mks_masuk, mks_rilis, mks_stok)
select * from (values
  (current_date - 4, 1100,  950, 3600),
  (current_date - 3, 1050,  900, 3750),
  (current_date - 2, 1150, 1000, 3900),
  (current_date - 1, 1080,  930, 4050),
  (current_date,     1120,  970, 4200)
) as v(tanggal, mks_masuk, mks_rilis, mks_stok)
where not exists (select 1 from pp1_makassar p where p.tanggal = v.tanggal);

-- ── 11. PP2 Bitung ──
insert into pp2_bitung (tanggal, btg_masuk, btg_rilis, btg_stok)
select * from (values
  (current_date - 4, 700, 600, 1900),
  (current_date - 3, 665, 570, 1995),
  (current_date - 2, 735, 630, 2100),
  (current_date - 1, 690, 590, 2205),
  (current_date,     720, 615, 2310)
) as v(tanggal, btg_masuk, btg_rilis, btg_stok)
where not exists (select 1 from pp2_bitung p where p.tanggal = v.tanggal);

-- ── 12. PP2 Mamuju ──
insert into pp2_mamuju (tanggal, mmju_masuk, mmju_rilis, mmju_stok)
select * from (values
  (current_date - 4, 450, 380, 1100),
  (current_date - 3, 425, 360, 1165),
  (current_date - 2, 475, 405, 1235),
  (current_date - 1, 445, 385, 1295),
  (current_date,     465, 395, 1365)
) as v(tanggal, mmju_masuk, mmju_rilis, mmju_stok)
where not exists (select 1 from pp2_mamuju p where p.tanggal = v.tanggal);

-- ── 13. PP2 Kendari ──
insert into pp2_kendari (tanggal, kdri_masuk, kdri_rilis, kdri_stok)
select * from (values
  (current_date - 4, 520, 440, 1400),
  (current_date - 3, 495, 420, 1475),
  (current_date - 2, 545, 465, 1555),
  (current_date - 1, 515, 440, 1630),
  (current_date,     535, 455, 1710)
) as v(tanggal, kdri_masuk, kdri_rilis, kdri_stok)
where not exists (select 1 from pp2_kendari p where p.tanggal = v.tanggal);

-- ── 14. PP2 Oba ──
insert into pp2_oba (tanggal, oba_masuk, oba_rilis, oba_stok)
select * from (values
  (current_date - 4, 480, 410, 1250),
  (current_date - 3, 455, 390, 1315),
  (current_date - 2, 505, 430, 1390),
  (current_date - 1, 475, 405, 1460),
  (current_date,     495, 420, 1530)
) as v(tanggal, oba_masuk, oba_rilis, oba_stok)
where not exists (select 1 from pp2_oba p where p.tanggal = v.tanggal);

-- ── 15. PP2 Ambon ──
insert into pp2_ambon (tanggal, abn_masuk, abn_rilis, abn_stok)
select * from (values
  (current_date - 4, 560, 480, 1600),
  (current_date - 3, 530, 455, 1675),
  (current_date - 2, 590, 505, 1760),
  (current_date - 1, 555, 475, 1840),
  (current_date,     575, 490, 1925)
) as v(tanggal, abn_masuk, abn_rilis, abn_stok)
where not exists (select 1 from pp2_ambon p where p.tanggal = v.tanggal);

-- ── 16. PP2 Sorong ──
insert into pp2_sorong (tanggal, srg_masuk, srg_rilis, srg_stok)
select * from (values
  (current_date - 4, 430, 365, 1050),
  (current_date - 3, 410, 345, 1115),
  (current_date - 2, 455, 385, 1185),
  (current_date - 1, 425, 360, 1250),
  (current_date,     445, 375, 1320)
) as v(tanggal, srg_masuk, srg_rilis, srg_stok)
where not exists (select 1 from pp2_sorong p where p.tanggal = v.tanggal);

-- ── 17. Angkutan Darat ──
insert into angkutan_darat (tanggal, nama_expeditur, retase, armada_operasi)
select * from (values
  (current_date - 4, 'PT. Samudera Trans',        18, 25),
  (current_date - 3, 'PT. Karya Logistik',        12, 15),
  (current_date - 2, 'PT. Mitra Angkut Nusantara', 22, 30),
  (current_date - 1, 'PT. Tonasa Transport',       9, 12),
  (current_date,     'PT. Bara Perkasa',          15, 20)
) as v(tanggal, nama_expeditur, retase, armada_operasi)
where not exists (
  select 1 from angkutan_darat a
  where a.tanggal = v.tanggal and a.nama_expeditur = v.nama_expeditur
);


-- ============================================================
-- VERIFIKASI
-- ============================================================
select 'silo_semen' as tabel, count(*) as jumlah_baris from silo_semen
union all select 'cp_tonasa',        count(*) from cp_tonasa
union all select 'pp_biringkassi',   count(*) from pp_biringkassi
union all select 'silo_mini',        count(*) from silo_mini
union all select 'pp1_samarinda',    count(*) from pp1_samarinda
union all select 'pp1_balikpapan',   count(*) from pp1_balikpapan
union all select 'pp1_banjar',       count(*) from pp1_banjar
union all select 'pp1_palu',         count(*) from pp1_palu
union all select 'pp1_lembar',       count(*) from pp1_lembar
union all select 'pp1_makassar',     count(*) from pp1_makassar
union all select 'pp2_bitung',       count(*) from pp2_bitung
union all select 'pp2_mamuju',       count(*) from pp2_mamuju
union all select 'pp2_kendari',      count(*) from pp2_kendari
union all select 'pp2_oba',          count(*) from pp2_oba
union all select 'pp2_ambon',        count(*) from pp2_ambon
union all select 'pp2_sorong',       count(*) from pp2_sorong
union all select 'angkutan_darat',   count(*) from angkutan_darat
order by 1;

-- Cek generated column (total harus = jumlah rilis komponennya)
select tanggal, rilis_spantaiopc, rilis_sminiopc, rilis_curah_fotopc,
       rilis_jumbo_fobopc, rilis_jumbo_fotopc, total_rilisopc
from cp_tonasa order by tanggal desc limit 5;

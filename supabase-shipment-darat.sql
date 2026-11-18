-- ============================================================
-- TABEL SHIPMENTS DARAT
-- ============================================================
-- INSTRUKSI:
-- Jika sudah ada pesan "relation already exists", jalankan dulu:
-- DROP TABLE IF EXISTS shipments_darat CASCADE;
-- 
-- Setelah itu jalankan file ini lagi.
-- ============================================================

-- Buat tabel shipments_darat
create table shipments_darat (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  nama_material text not null,
  muatan numeric(15, 2) not null default 0,
  retase text,
  armada text not null,
  tarif numeric(15, 2) not null default 0,
  biaya numeric(15, 2) not null default 0,
  created_date timestamp with time zone default now(),
  update_date timestamp with time zone default now()
);

-- Buat index untuk pencarian
create index idx_shipments_darat_tanggal on shipments_darat(tanggal);
create index idx_shipments_darat_nama_material on shipments_darat(nama_material);
create index idx_shipments_darat_armada on shipments_darat(armada);

-- Function untuk update timestamp otomatis
create or replace function update_update_date()
returns trigger as $$
begin
  new.update_date = now();
  return new;
end;
$$ language plpgsql;

-- Trigger untuk update otomatis
create trigger update_shipments_darat_date
  before update on shipments_darat
  for each row
  execute function update_update_date();

-- RLS Policy (mirip seperti shipments)
alter table shipments_darat enable row level security;

-- Policy untuk read semua (SELECT)
drop policy if exists shipments_darat_read_all on shipments_darat;
create policy shipments_darat_read_all on shipments_darat
  for select to anon, authenticated
  using (true);

-- Policy untuk insert (INSERT)
drop policy if exists shipments_darat_insert_all on shipments_darat;
create policy shipments_darat_insert_all on shipments_darat
  for insert to anon, authenticated
  with check (true);

-- Policy untuk update (UPDATE)
drop policy if exists shipments_darat_update_all on shipments_darat;
create policy shipments_darat_update_all on shipments_darat
  for update to anon, authenticated
  using (true) with check (true);

-- Policy untuk delete (DELETE)
drop policy if exists shipments_darat_delete_all on shipments_darat;
create policy shipments_darat_delete_all on shipments_darat
  for delete to anon, authenticated
  using (true);

-- Verifikasi
select count(*) as total_rows from shipments_darat;
select * from shipments_darat limit 5;
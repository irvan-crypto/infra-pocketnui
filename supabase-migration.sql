-- Tabel shipments untuk monitoring kapal
CREATE TABLE IF NOT EXISTS shipments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_kapal TEXT NOT NULL,
  nama_vendor TEXT,
  type_muatan TEXT,
  muatan_ton DECIMAL(10,2),
  tujuan_pp TEXT NOT NULL,
  pelabuhan_asal TEXT NOT NULL,
  ta_tiba TIMESTAMP,
  sandar TIMESTAMP,
  muat TIMESTAMP,
  selesai_muat TIMESTAMP,
  td_pelabuhan TIMESTAMP,
  ta_pp TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index untuk performa
CREATE INDEX idx_shipments_status ON shipments (ta_tiba, sandar, muat, selesai_muat, td_pelabuhan, ta_pp);
CREATE INDEX idx_shipments_pelabuhan ON shipments (pelabuhan_asal);
CREATE INDEX idx_shipments_tujuan ON shipments (tujuan_pp);

-- Trigger untuk update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shipments_updated_at
BEFORE UPDATE ON shipments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY admin_all ON shipments
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Manager: read only
CREATE POLICY manager_read ON shipments
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'manager');

-- Operator: insert & update (tidak bisa delete)
CREATE POLICY operator_insert ON shipments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'operator');

CREATE POLICY operator_update ON shipments
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'operator')
  WITH CHECK (auth.jwt() ->> 'role' = 'operator');

-- Seed data contoh
INSERT INTO shipments (nama_kapal, nama_vendor, type_muatan, muatan_ton, tujuan_pp, pelabuhan_asal, ta_tiba, sandar, muat, selesai_muat, td_pelabuhan, ta_pp)
VALUES
  ('TL.XXI', 'PT. Pelayaran Nusantara', 'Semen', 1200.50, 'PP. Bitung', 'Pelabuhan Biringkassi', '2026-09-08 08:00:00', '2026-09-08 12:00:00', '2026-09-09 09:30:00', '2026-09-09 16:45:00', NULL, NULL),
  ('KM. Bahari', 'PT. Samudera', 'Semen', 850.75, 'PP. Palu', 'Pelabuhan Tuban', '2026-09-07 06:30:00', '2026-09-07 10:00:00', '2026-09-08 08:15:00', '2026-09-08 14:00:00', '2026-09-09 07:00:00', NULL),
  ('MV. Nusantara', 'PT. Lautan', 'Semen', 2000.00, 'PP. Balikpapan', 'Pelabuhan Biringkassi', '2026-09-06 10:00:00', '2026-09-06 14:30:00', '2026-09-07 07:00:00', '2026-09-07 15:30:00', '2026-09-08 06:00:00', '2026-09-08 18:00:00');
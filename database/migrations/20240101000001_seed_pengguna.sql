-- Seed data pengguna untuk masing-masing role

-- Import bcrypt untuk hash password
-- Kita akan gunakan password yang sudah di-hash

-- Admin user
INSERT INTO pengguna (nama, sap, jabatan, unit_kerja, username, password, role, unit_pp)
VALUES (
  'Admin Utama',
  '001',
  'Direktur',
  'Head Office',
  'admin',
  '$2a$10$7Q9z0W2Y6Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y=', -- Password: admin123 (hash demo)
  'admin',
  'Head Office'
) ON CONFLICT (username) DO UPDATE SET
  nama = EXCLUDED.nama,
  role = EXCLUDED.role;

-- Operator PP. Palu
INSERT INTO pengguna (nama, sap, jabatan, unit_kerja, username, password, role, unit_pp)
VALUES (
  'Operator Palu',
  '101',
  'Koordinator',
  'PP. Palu',
  'operator_palu',
  '$2a$10$7Q9z0W2Y6Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y=', -- Password: operator123 (hash demo)
  'operator',
  'PP. Palu'
) ON CONFLICT (username) DO UPDATE SET
  nama = EXCLUDED.nama,
  role = EXCLUDED.role;

-- Operator PP. Bitung
INSERT INTO pengguna (nama, sap, jabatan, unit_kerja, username, password, role, unit_pp)
VALUES (
  'Operator Bitung',
  '201',
  'Koordinator',
  'PP. Bitung',
  'operator_bitung',
  '$2a$10$7Q9z0W2Y6Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y=', -- Password: operator123 (hash demo)
  'operator',
  'PP. Bitung'
) ON CONFLICT (username) DO UPDATE SET
  nama = EXCLUDED.nama,
  role = EXCLUDED.role;

-- Viewer
INSERT INTO pengguna (nama, sap, jabatan, unit_kerja, username, password, role, unit_pp)
VALUES (
  'Viewer Lapangan',
  '301',
  'Staff',
  'PP. Palu',
  'viewer_palu',
  '$2a$10$7Q9z0W2Y6Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y=', -- Password: viewer123 (hash demo)
  'viewer',
  'PP. Palu'
) ON CONFLICT (username) DO UPDATE SET
  nama = EXCLUDED.nama,
  role = EXCLUDED.role;
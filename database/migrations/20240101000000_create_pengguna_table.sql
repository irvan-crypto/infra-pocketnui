-- Create table for pengguna (users)
CREATE TABLE pengguna (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nama TEXT NOT NULL,
    sap TEXT NOT NULL UNIQUE,
    jabatan TEXT,
    unit_kerja TEXT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'viewer')),
    unit_pp TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_pengguna_sap ON pengguna(sap);
CREATE INDEX idx_pengguna_username ON pengguna(username);
CREATE INDEX idx_pengguna_role ON pengguna(role);

-- Enable row level security (optional but recommended for Supabase)
-- ALTER TABLE pengguna ENABLE ROW LEVEL SECURITY; -- Disabled for now, enable in production
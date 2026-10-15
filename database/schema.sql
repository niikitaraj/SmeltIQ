-- ==============================================================================
-- SmeltIQ Gate Entry Compliance System - Database Architecture
-- Target: Supabase PostgreSQL / Standard PostgreSQL 14+ with JSONB support
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean up existing objects if re-running migration
DROP TABLE IF EXISTS gate_movements CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TYPE IF EXISTS movement_type_enum CASCADE;
DROP TYPE IF EXISTS compliance_status_enum CASCADE;

-- 1. Create Enums
CREATE TYPE movement_type_enum AS ENUM ('ENTRY', 'EXIT');
CREATE TYPE compliance_status_enum AS ENUM ('ALLOWED', 'DENIED', 'OVERRIDDEN');

-- 2. Master Table: vendors
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_code VARCHAR(50) NOT NULL UNIQUE,
    vendor_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    contact_phone VARCHAR(30),
    contact_email VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by vendor_code and active status
CREATE INDEX idx_vendors_code ON vendors(vendor_code);
CREATE INDEX idx_vendors_is_active ON vendors(is_active);

-- 3. Movement Audit Log Table: gate_movements
CREATE TABLE gate_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_id VARCHAR(50) NOT NULL,
    movement_type movement_type_enum NOT NULL DEFAULT 'ENTRY',
    vehicle_number VARCHAR(20) NOT NULL,
    ocr_confidence NUMERIC(5, 2),
    owner_name VARCHAR(255),
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    rc_status VARCHAR(50),
    puc_valid_until DATE,
    insurance_valid_until DATE,
    vehicle_class VARCHAR(100),
    permit_number VARCHAR(100),
    permit_type VARCHAR(100),
    permit_valid_until DATE,
    permit_status VARCHAR(50) DEFAULT 'NOT_AVAILABLE',
    national_permit_number VARCHAR(100),
    national_permit_upto DATE,
    national_permit_issued_by VARCHAR(150),
    compliance_status compliance_status_enum NOT NULL,
    rejection_reasons TEXT[] DEFAULT '{}',
    raw_surepass_payload JSONB,
    guard_id VARCHAR(50) NOT NULL,
    override_reason TEXT,
    supervisor_code VARCHAR(50),
    overridden_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance and Audit query indexes
CREATE INDEX idx_gate_movements_vehicle_number ON gate_movements(vehicle_number);
CREATE INDEX idx_gate_movements_vendor_id ON gate_movements(vendor_id);
CREATE INDEX idx_gate_movements_compliance_status ON gate_movements(compliance_status);
CREATE INDEX idx_gate_movements_created_at ON gate_movements(created_at DESC);
CREATE INDEX idx_gate_movements_gate_id ON gate_movements(gate_id);
CREATE INDEX idx_gate_movements_permit_number ON gate_movements(permit_number);
CREATE INDEX idx_gate_movements_permit_status ON gate_movements(permit_status);
CREATE INDEX idx_gate_movements_national_permit ON gate_movements(national_permit_number);

-- GIN Index for rapid querying over raw JSON payload
CREATE INDEX idx_gate_movements_raw_payload ON gate_movements USING GIN (raw_surepass_payload);

-- Automated updated_at trigger for vendors
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_vendors_modtime
BEFORE UPDATE ON vendors
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- Row Level Security (RLS) policies for Supabase
-- ==============================================================================
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_movements ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated guards / anon API keys for PoC
CREATE POLICY "Allow public read access to vendors"
ON vendors FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to vendors"
ON vendors FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public read to gate_movements"
ON gate_movements FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to gate_movements"
ON gate_movements FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update to gate_movements"
ON gate_movements FOR UPDATE
USING (true);

-- ==============================================================================
-- 4. User Profiles & Role-Based Access Control (RBAC)
-- ==============================================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('GATE_GUARD', 'PLANT_SUPERVISOR', 'ADMIN');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role public.user_role NOT NULL DEFAULT 'GATE_GUARD',
    assigned_gate_id VARCHAR(50) DEFAULT 'GATE-01',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_employee_id ON public.profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_gate_id ON public.profiles(assigned_gate_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read profiles" 
ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow users to update own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow service role full access to profiles" 
ON public.profiles FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow anon read for dev authentication" 
ON public.profiles FOR SELECT USING (auth.role() = 'anon');

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, employee_id, full_name, role, assigned_gate_id)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'employee_id', split_part(new.email, '@', 1)), 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Plant Staff'), 
    COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'GATE_GUARD'::public.user_role),
    COALESCE(new.raw_user_meta_data->>'assigned_gate_id', 'GATE-01')
  )
  ON CONFLICT (id) DO UPDATE SET
    employee_id = EXCLUDED.employee_id,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    assigned_gate_id = EXCLUDED.assigned_gate_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


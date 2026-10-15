-- ==============================================================================
-- SmeltIQ Gate Entry Compliance System - Statutory Transport Permit Migration
-- Target: Supabase PostgreSQL / Standard PostgreSQL 14+
-- Adds support for statutory Local & National Transport Permits (Surepass RC v2)
-- ==============================================================================

-- 1. Add statutory permit columns to gate_movements table if not already present
ALTER TABLE public.gate_movements 
ADD COLUMN IF NOT EXISTS permit_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS permit_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS permit_valid_until DATE,
ADD COLUMN IF NOT EXISTS permit_status VARCHAR(50) DEFAULT 'NOT_AVAILABLE',
ADD COLUMN IF NOT EXISTS national_permit_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS national_permit_upto DATE,
ADD COLUMN IF NOT EXISTS national_permit_issued_by VARCHAR(150);

-- 2. Create index on permit_number for fast statutory audit lookups
CREATE INDEX IF NOT EXISTS idx_gate_movements_permit_number ON public.gate_movements(permit_number);
CREATE INDEX IF NOT EXISTS idx_gate_movements_permit_status ON public.gate_movements(permit_status);
CREATE INDEX IF NOT EXISTS idx_gate_movements_national_permit ON public.gate_movements(national_permit_number);

-- 3. Comment on columns for schema documentation
COMMENT ON COLUMN public.gate_movements.permit_number IS 'Statutory transport permit number issued by State/Regional Transport Authority (RTA)';
COMMENT ON COLUMN public.gate_movements.permit_type IS 'Permit classification: e.g. NATIONAL PERMIT (GOODS), GOODS CARRIER PERMIT, LOCAL PERMIT';
COMMENT ON COLUMN public.gate_movements.permit_valid_until IS 'Validity expiration date of the primary/local transport permit';
COMMENT ON COLUMN public.gate_movements.permit_status IS 'Rule 4 statutory compliance status: VALID, EXPIRED, NOT_AVAILABLE, or NOT_APPLICABLE';
COMMENT ON COLUMN public.gate_movements.national_permit_number IS 'National Permit (NP) authorization number under Central Motor Vehicles Rules';
COMMENT ON COLUMN public.gate_movements.national_permit_upto IS 'National Permit authorization validity date';
COMMENT ON COLUMN public.gate_movements.national_permit_issued_by IS 'RTO / State Transport Authority issuing the National Permit';

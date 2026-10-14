-- ==============================================================================
-- SmeltIQ Gate Entry Compliance System - RBAC & User Profile Migration
-- Date: 2026-10-13
-- Description: Extends auth.users with public.profiles, user roles, RLS policies,
--              and automatic user onboarding trigger.
-- ==============================================================================

-- 1. Create User Roles Enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('GATE_GUARD', 'PLANT_SUPERVISOR', 'ADMIN');
    END IF;
END $$;

-- 2. User Profiles Table (Extends Supabase auth.users)
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

-- Index for speedy queries on employee_id, role, and assigned gate
CREATE INDEX IF NOT EXISTS idx_profiles_employee_id ON public.profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_gate_id ON public.profiles(assigned_gate_id);

-- 3. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can view user profiles
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
CREATE POLICY "Allow authenticated users to read profiles" 
ON public.profiles FOR SELECT 
USING (auth.role() = 'authenticated');

-- Policy 2: Allow users to update their own profile
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
CREATE POLICY "Allow users to update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Policy 3: Allow service_role complete access (for admin/backend proxies)
DROP POLICY IF EXISTS "Allow service role full access to profiles" ON public.profiles;
CREATE POLICY "Allow service role full access to profiles" 
ON public.profiles FOR ALL 
USING (auth.role() = 'service_role');

-- Policy 4: Public anon read allowed for testing/development if needed
DROP POLICY IF EXISTS "Allow anon read for dev authentication" ON public.profiles;
CREATE POLICY "Allow anon read for dev authentication" 
ON public.profiles FOR SELECT 
USING (auth.role() = 'anon');

-- 4. Trigger Function: Automatically create profile on auth.users signup
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

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

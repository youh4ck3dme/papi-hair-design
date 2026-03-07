-- PAPI HAIR DESIGN - Database Initialization
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'employee', 'customer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.appointment_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.day_of_week AS ENUM ('monday','tuesday','wednesday','thursday','friday','saturday','sunday');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.hour_mode AS ENUM ('open', 'closed', 'on_request');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Tables (minimal set for home page)
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'Europe/Bratislava',
  lead_time_minutes INT NOT NULL DEFAULT 60,
  max_days_ahead INT NOT NULL DEFAULT 60,
  cancellation_hours INT NOT NULL DEFAULT 24,
  onboarding_completed boolean NOT NULL DEFAULT false,
  opening_hours JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name_sk TEXT NOT NULL,
  description_sk TEXT,
  duration_minutes INT NOT NULL DEFAULT 30,
  buffer_minutes INT NOT NULL DEFAULT 0,
  price NUMERIC(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Seed Demo Data (Business ID used in app)
INSERT INTO public.businesses (id, name, slug, timezone, onboarding_completed)
VALUES ('a1b2c3d4-0000-0000-0000-000000000001', 'Papi Hair Studio', 'papi-hair', 'Europe/Bratislava', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.services (business_id, name_sk, duration_minutes, price, is_active)
VALUES 
('a1b2c3d4-0000-0000-0000-000000000001', 'Dámsky strih', 45, 25.00, true),
('a1b2c3d4-0000-0000-0000-000000000001', 'Pánsky strih', 30, 15.00, true)
ON CONFLICT DO NOTHING;

-- NOTE: For full functionality, please run the complete script found in:
-- supabase/migrations/run-all.sql

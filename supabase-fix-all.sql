-- ============================================================
-- CONSOLIDATED SQL FOR 8 EXTENDED FEATURES
-- Run this in your Supabase SQL Editor for project zcbklrgrawjsshpoyolr
-- ============================================================

-- [1] EMPLOYEE SERVICES (Feature 1)
CREATE TABLE IF NOT EXISTS public.employee_services (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(employee_id, service_id)
);
ALTER TABLE public.employee_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read for employee_services" ON public.employee_services;
CREATE POLICY "Public read for employee_services" ON public.employee_services FOR SELECT USING (true);

-- [2 & 3] BUSINESS HOURS & OVERRIDES (Feature 2 & 3)
DO $$ BEGIN
    CREATE TYPE public.hour_mode AS ENUM ('open', 'closed', 'on_request');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  day_of_week public.day_of_week NOT NULL,
  mode public.hour_mode NOT NULL DEFAULT 'open',
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '17:00',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bh_time_check CHECK (start_time < end_time)
);
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bh_select_public" ON public.business_hours;
CREATE POLICY "bh_select_public" ON public.business_hours FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.business_date_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  override_date date NOT NULL,
  mode public.hour_mode NOT NULL DEFAULT 'closed',
  start_time time,
  end_time time,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bdo_time_check CHECK (
    (mode = 'closed') OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  )
);
ALTER TABLE public.business_date_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bdo_select_public" ON public.business_date_overrides;
CREATE POLICY "bdo_select_public" ON public.business_date_overrides FOR SELECT USING (true);

-- [4 & 8] EMPLOYEE ENHANCEMENTS (Feature 4 & 8)
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS show_in_calendar boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_bookable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_receive_service_bookings boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS order_index integer NOT NULL DEFAULT 0;

ALTER TABLE public.businesses 
  ADD COLUMN IF NOT EXISTS allow_admin_as_provider BOOLEAN NOT NULL DEFAULT false;

-- [7] NOTIFICATIONS (Feature 7)
CREATE TABLE IF NOT EXISTS public.user_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{"emailNotificationsEnabled": true, "reservationCreated": true, "reservationUpdated": true, "reservationCancelled": true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.reservation_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('reservation.created','reservation.updated','reservation.cancelled')),
  recipient_email TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('admin','employee','customer')),
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- [5] EMPLOYEE SCOPE RLS (Feature 5)
CREATE OR REPLACE FUNCTION public.get_employee_id(_user_id UUID, _business_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.employees
  WHERE profile_id = _user_id AND business_id = _business_id AND is_active = true
  LIMIT 1
$$;

DROP POLICY IF EXISTS "employees_select_member_or_public" ON public.employees;
CREATE POLICY "employees_select_member_or_public"
  ON public.employees FOR SELECT
  USING (
    is_active = true OR 
    EXISTS (SELECT 1 FROM public.memberships WHERE business_id = employees.business_id AND profile_id = auth.uid())
  );

-- Auto-assign all current services to all current employees to fix F1 immediately
INSERT INTO public.employee_services (employee_id, service_id)
SELECT e.id, s.id
FROM public.employees e
CROSS JOIN public.services s
WHERE e.business_id = s.business_id
ON CONFLICT DO NOTHING;

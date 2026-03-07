-- ============================================================
-- FIX: Recreate is_employee_bookable_for_services function
-- and enable admin providers for demo business
-- ============================================================

-- 1. Recreate the function (was missing from schema cache)
CREATE OR REPLACE FUNCTION public.is_employee_bookable_for_services(
  _employee_id UUID,
  _business_id UUID
) RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    CASE
      -- Legacy employee without profile link - always bookable
      WHEN e.profile_id IS NULL THEN true
      -- Regular employee - always bookable
      WHEN m.role = 'employee' THEN true
      -- Customer role - not bookable
      WHEN m.role = 'customer' THEN false
      -- Admin/Owner - bookable only if setting is enabled
      WHEN m.role IN ('admin', 'owner') THEN
        COALESCE(
          (SELECT allow_admin_as_provider FROM public.businesses WHERE id = _business_id),
          false
        )
      -- Unknown role - not bookable
      ELSE false
    END
  FROM public.employees e
  LEFT JOIN public.memberships m ON m.profile_id = e.profile_id AND m.business_id = e.business_id
  WHERE e.id = _employee_id AND e.business_id = _business_id AND e.is_active = true;
$$;

-- Grant to all roles so edge function (service_role) and REST API can call it
GRANT EXECUTE ON FUNCTION public.is_employee_bookable_for_services(UUID, UUID) TO anon, authenticated, service_role;

-- 2. Enable admin providers for demo business (allow Mato, Miska to be booked)
UPDATE public.businesses
SET allow_admin_as_provider = true
WHERE id = 'a1b2c3d4-0000-0000-0000-000000000001';

-- 3. Ensure both employees are active
UPDATE public.employees
SET is_active = true
WHERE business_id = 'a1b2c3d4-0000-0000-0000-000000000001';

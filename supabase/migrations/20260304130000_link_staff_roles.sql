-- ============================================================
-- PAPI HAIR DESIGN — Link staff auth accounts to employees + roles
-- Run AFTER creating auth users for papi, miska, mato
-- ============================================================

DO $$
DECLARE
  v_bid   uuid := 'a1b2c3d4-0000-0000-0000-000000000001';
  v_papi  uuid;
  v_mato  uuid;
  v_miska uuid;
BEGIN
  -- Get auth.users IDs (= profile IDs, created auto by trigger on signup)
  SELECT id INTO v_papi  FROM auth.users WHERE email = 'papi@papihairdesign.sk';
  SELECT id INTO v_mato  FROM auth.users WHERE email = 'mato@papihairdesign.sk';
  SELECT id INTO v_miska FROM auth.users WHERE email = 'miska@papihairdesign.sk';

  IF v_papi  IS NULL THEN RAISE EXCEPTION 'Auth user papi@papihairdesign.sk nenajdeny — najprv ho vytvor!'; END IF;
  IF v_mato  IS NULL THEN RAISE EXCEPTION 'Auth user mato@papihairdesign.sk nenajdeny — najprv ho vytvor!'; END IF;
  IF v_miska IS NULL THEN RAISE EXCEPTION 'Auth user miska@papihairdesign.sk nenajdeny — najprv ho vytvor!'; END IF;

  -- 1. MEMBERSHIPS — papi = admin, ostatni = employee
  INSERT INTO public.memberships (business_id, profile_id, role)
  VALUES
    (v_bid, v_papi,  'admin'),
    (v_bid, v_mato,  'employee'),
    (v_bid, v_miska, 'employee')
  ON CONFLICT (business_id, profile_id) DO UPDATE SET role = EXCLUDED.role;

  -- 2. GLOBAL USER_ROLES (konzistentnost s is_business_admin checks)
  INSERT INTO public.user_roles (user_id, role)
  VALUES
    (v_papi,  'admin'),
    (v_mato,  'employee'),
    (v_miska, 'employee')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3. LINK employees.profile_id → auth user
  --    Match podla display_name (case-insensitive)
  UPDATE public.employees
    SET profile_id = v_papi
  WHERE business_id = v_bid
    AND display_name ILIKE '%papi%'
    AND profile_id IS DISTINCT FROM v_papi;

  UPDATE public.employees
    SET profile_id = v_mato
  WHERE business_id = v_bid
    AND display_name ILIKE '%mat%'
    AND profile_id IS DISTINCT FROM v_mato;

  UPDATE public.employees
    SET profile_id = v_miska
  WHERE business_id = v_bid
    AND (display_name ILIKE '%mi%' OR display_name ILIKE '%miška%' OR display_name ILIKE '%miska%')
    AND profile_id IS DISTINCT FROM v_miska;

  RAISE NOTICE 'Hotovo: papi(%) = admin, mato(%) = employee, miska(%) = employee', v_papi, v_mato, v_miska;
END $$;

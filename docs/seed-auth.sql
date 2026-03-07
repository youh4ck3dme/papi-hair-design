-- ============================================================
-- SEED: Demo Owner Auth User (Ultra-Compatible DO block)
-- ============================================================

DO $$
DECLARE
  target_email TEXT := 'owner@papihairdesign.sk';
  target_id    UUID := 'd1000000-0000-0000-0000-000000000001';
  business_id  UUID := 'a1b2c3d4-0000-0000-0000-000000000001';
  found_id     UUID;
BEGIN
  -- 1. Check if user already exists
  SELECT id INTO found_id FROM auth.users WHERE email = target_email;

  IF found_id IS NULL THEN
    -- A) Create new user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at, 
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
      role, confirmation_token, is_super_admin
    )
    VALUES (
      target_id, '00000000-0000-0000-0000-000000000000', target_email, 
      crypt('PapiDemo2025!', gen_salt('bf')), now(), 
      '{"provider":"email","providers":["email"]}', 
      '{"full_name":"Papi Owner"}', now(), now(), 
      'authenticated', '', false
    );
    found_id := target_id;
  ELSE
    -- B) Update existing user password and confirmed status
    UPDATE auth.users 
    SET encrypted_password = crypt('PapiDemo2025!', gen_salt('bf')),
        updated_at = now(),
        email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE id = found_id;
  END IF;

  -- 2. Sync public profile (Profile ID must match found_id)
  INSERT INTO public.profiles (id, email, full_name, updated_at)
  VALUES (found_id, target_email, 'Papi Owner', now())
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email, 
    full_name = EXCLUDED.full_name, 
    updated_at = now();

  -- 3. Link memberships
  INSERT INTO public.memberships (business_id, profile_id, role)
  VALUES (business_id, found_id, 'owner')
  ON CONFLICT DO NOTHING;
END $$;

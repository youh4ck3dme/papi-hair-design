-- Fix for 403 error: Allow admins (Mato, Miska) to be booked as providers
UPDATE businesses 
SET allow_admin_as_provider = true 
WHERE id = 'a1b2c3d4-0000-0000-0000-000000000001';

-- Ensure Mato and Miska are active
UPDATE employees 
SET is_active = true 
WHERE business_id = 'a1b2c3d4-0000-0000-0000-000000000001';

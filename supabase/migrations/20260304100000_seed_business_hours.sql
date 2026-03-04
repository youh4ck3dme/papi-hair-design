-- =============================================================================
-- Seed official business hours for PAPI HAIR DESIGN
-- =============================================================================
-- Pondelok – Piatok : 08:00 – 17:00  (open)
-- Sobota            : Podľa objednávok (on_request)
-- Nedeľa            : Zavreté         (closed)
--
-- Idempotentné: DELETE + INSERT zaručí čistý stav pri opakovanom spustení.
-- Týka sa iba demo business: a1b2c3d4-0000-0000-0000-000000000001
-- =============================================================================

DO $$
DECLARE
  v_bid uuid := 'a1b2c3d4-0000-0000-0000-000000000001';
BEGIN
  -- Vymazať existujúce hodiny pre tento business (clean re-run)
  DELETE FROM public.business_hours WHERE business_id = v_bid;

  -- Vložiť kanonický rozvrh
  INSERT INTO public.business_hours
    (business_id, day_of_week, mode, start_time, end_time, sort_order)
  VALUES
    (v_bid, 'monday',    'open',       '08:00', '17:00', 1),
    (v_bid, 'tuesday',   'open',       '08:00', '17:00', 2),
    (v_bid, 'wednesday', 'open',       '08:00', '17:00', 3),
    (v_bid, 'thursday',  'open',       '08:00', '17:00', 4),
    (v_bid, 'friday',    'open',       '08:00', '17:00', 5),
    (v_bid, 'saturday',  'on_request', '08:00', '17:00', 6),
    (v_bid, 'sunday',    'closed',     '08:00', '17:00', 7);

  RAISE NOTICE 'business_hours: 7 riadkov vložených pre business %', v_bid;
END $$;

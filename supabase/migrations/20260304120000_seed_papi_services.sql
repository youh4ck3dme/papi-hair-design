-- =============================================================================
-- Seed oficiálny cenník PAPI HAIR DESIGN do tabuľky services
-- =============================================================================
-- 34 služieb: 21 dámskych + 13 pánskych
-- Aplikované zmeny (docs/zmenacennik.txt):
--   • Strih Junior: do 10r. (bolo do 15r.)
--   • Pánsky strih: 24 € (bolo 19 €)
--   • Kombinácia vlasy a brada: 29 € (bolo 27 €)
--   • Strihanie len strojčekom: 19 € (NOVÁ SLUŽBA)
--
-- Idempotentné: DELETE + INSERT zaručí čistý stav pri opakovanom spustení.
-- Týka sa iba demo business: a1b2c3d4-0000-0000-0000-000000000001
-- =============================================================================

DO $$
DECLARE
  v_bid uuid := 'a1b2c3d4-0000-0000-0000-000000000001';
BEGIN

  -- 1. Pridať sort_order stĺpec (ak ešte neexistuje)
  ALTER TABLE public.services ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;

  -- 2. Vymazať existujúce employee_services pre tento business (CASCADE cez service_id)
  DELETE FROM public.employee_services
  WHERE service_id IN (
    SELECT id FROM public.services WHERE business_id = v_bid
  );

  -- 3. Vymazať existujúce služby pre tento business
  DELETE FROM public.services WHERE business_id = v_bid;

  -- 4. Vložiť 34 kanonických služieb
  INSERT INTO public.services
    (business_id, name_sk, category, subcategory, price, duration_minutes, sort_order, is_active)
  VALUES

    -- =====================================================================
    -- DÁMSKE: Strih & Styling
    -- =====================================================================
    (v_bid, 'Dámsky strih',           'damske', 'Strih & Styling',  30.00,  60,  10, true),
    (v_bid, 'Fúkaná dlhé vlasy',      'damske', 'Strih & Styling',  30.00,  45,  20, true),
    (v_bid, 'Fúkaná polodlhé vlasy',  'damske', 'Strih & Styling',  20.00,  30,  30, true),
    (v_bid, 'Finálny styling',        'damske', 'Strih & Styling',  20.00,  30,  40, true),

    -- =====================================================================
    -- DÁMSKE: Farbenie
    -- =====================================================================
    (v_bid, 'Farbenie odrastov so strihom',  'damske', 'Farbenie',  60.00,  90,  50, true),
    (v_bid, 'Farbenie odrastov',             'damske', 'Farbenie',  45.00,  60,  60, true),
    (v_bid, 'Kompletné farbenie',            'damske', 'Farbenie',  70.00,  90,  70, true),
    (v_bid, 'Kompletné farbenie so strihom', 'damske', 'Farbenie',  90.00, 120,  80, true),

    -- =====================================================================
    -- DÁMSKE: Balayage & Melír
    -- =====================================================================
    (v_bid, 'Balayage komplet',  'damske', 'Balayage & Melír', 150.00, 180,  90, true),
    (v_bid, 'Balayage dorábka',  'damske', 'Balayage & Melír', 120.00, 150, 100, true),
    (v_bid, 'Melír dorábka',     'damske', 'Balayage & Melír', 120.00, 150, 110, true),
    (v_bid, 'Melír komplet',     'damske', 'Balayage & Melír', 150.00, 180, 120, true),

    -- =====================================================================
    -- DÁMSKE: Odfarbovanie & Regenerácia
    -- =====================================================================
    (v_bid, 'Gumovanie alebo čistenie farby', 'damske', 'Odfarbovanie & Regenerácia', 100.00, 120, 130, true),
    (v_bid, 'Sťahovanie farby',               'damske', 'Odfarbovanie & Regenerácia', 160.00, 150, 140, true),
    (v_bid, 'Methamorphyc - rýchla kúra',     'damske', 'Odfarbovanie & Regenerácia',  35.00,  30, 150, true),
    (v_bid, 'Methamorphyc - exkluzívna kúra', 'damske', 'Odfarbovanie & Regenerácia',  50.00,  60, 160, true),
    (v_bid, 'Brazílsky keratín',              'damske', 'Odfarbovanie & Regenerácia', 130.00, 180, 170, true),

    -- =====================================================================
    -- DÁMSKE: Predlžovanie & Účesy
    -- =====================================================================
    (v_bid, 'Aplikácia Tape-in',   'damske', 'Predlžovanie & Účesy',  40.00,  60, 180, true),
    (v_bid, 'Prepojenie Tape-in',  'damske', 'Predlžovanie & Účesy', 120.00, 120, 190, true),
    (v_bid, 'Zapletané vrkôčiky',  'damske', 'Predlžovanie & Účesy',  30.00,  45, 200, true),
    (v_bid, 'Spoločenský účes',    'damske', 'Predlžovanie & Účesy',  40.00,  60, 210, true),

    -- =====================================================================
    -- PÁNSKE: Vlasy
    -- =====================================================================
    (v_bid, 'Strih Junior (do 10r.)',    'panske', 'Vlasy',  15.00,  20,  10, true),
    (v_bid, 'Strihanie len strojčekom',  'panske', 'Vlasy',  19.00,  20,  20, true),
    (v_bid, 'Pánsky strih',              'panske', 'Vlasy',  24.00,  30,  30, true),

    -- =====================================================================
    -- PÁNSKE: Brada & Kombinácie
    -- =====================================================================
    (v_bid, 'Úprava brady',             'panske', 'Brada & Kombinácie',  12.00,  20,  40, true),
    (v_bid, 'Kombinácia vlasy a brada', 'panske', 'Brada & Kombinácie',  29.00,  45,  50, true),
    (v_bid, 'Pánsky špeciál',           'panske', 'Brada & Kombinácie',  50.00,  60,  60, true),

    -- =====================================================================
    -- PÁNSKE: Farbenie
    -- =====================================================================
    (v_bid, 'Trvalá',              'panske', 'Farbenie',  40.00,  60,  70, true),
    (v_bid, 'Zosvetlenie vlasov',  'panske', 'Farbenie',  40.00,  60,  80, true),
    (v_bid, 'Farbenie brady',      'panske', 'Farbenie',  10.00,  20,  90, true),
    (v_bid, 'Tónovanie sedín',     'panske', 'Farbenie',  10.00,  20, 100, true),

    -- =====================================================================
    -- PÁNSKE: Doplnkové Služby
    -- =====================================================================
    (v_bid, 'Depilácia nosa aj uší',   'panske', 'Doplnkové Služby',   5.00,  10, 110, true),
    (v_bid, 'Ušné sviečky',            'panske', 'Doplnkové Služby',  10.00,  15, 120, true),
    (v_bid, 'Čierna zlupovacia maska', 'panske', 'Doplnkové Služby',  12.00,  20, 130, true);

  RAISE NOTICE 'services: 34 riadkov vložených pre business %', v_bid;

  -- 5. Auto-assign všetky nové služby všetkým aktívnym zamestnancom
  INSERT INTO public.employee_services (employee_id, service_id)
  SELECT e.id, s.id
  FROM public.employees e
  CROSS JOIN public.services s
  WHERE e.business_id = s.business_id
    AND e.is_active = true
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'employee_services: auto-assigned pre všetkých zamestnancov';

END $$;

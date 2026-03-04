-- ============================================================
-- calendar_events: zamestnanci môžu spravovať VLASTNÉ udalosti
--
-- Pravidlá:
--   admin  → SELECT + INSERT + UPDATE + DELETE (všetko, všade)
--   employee → SELECT všetky v biznise (kalendár kolegov vidí)
--           → INSERT/UPDATE/DELETE IBA kde resource_id = ich employee
--           → NEMÔŽE vytvoriť service_booking ani admin_booking_note
--             (tie sú systémové / adminské)
-- ============================================================

-- Vytvor enum + tabuľku ak ešte neexistuje (idempotentné)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'calendar_event_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.calendar_event_type AS ENUM (
      'service_booking', 'blocked_time', 'private_note', 'internal_event', 'admin_booking_note'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  type public.calendar_event_type NOT NULL,
  title text NOT NULL,
  note text,
  visibility text NOT NULL DEFAULT 'private',
  linked_appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_events_time_check CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_business_resource_start
  ON public.calendar_events (business_id, resource_id, start_at);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.touch_calendar_events_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_calendar_events_touch_updated_at ON public.calendar_events;
CREATE TRIGGER trg_calendar_events_touch_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION public.touch_calendar_events_updated_at();

-- Odstráň staré policies (nahradíme presnejšími)
DROP POLICY IF EXISTS "calendar_events_manage_admin"        ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_select_member"       ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert_own_employee" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_update_own_employee" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete_own_employee" ON public.calendar_events;

-- SELECT: všetci členovia biznisu vidia celý kalendár
CREATE POLICY "calendar_events_select_member"
  ON public.calendar_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.business_id = calendar_events.business_id
        AND m.profile_id = auth.uid()
    )
  );

-- ALL: admin má plný prístup na všetko
CREATE POLICY "calendar_events_manage_admin"
  ON public.calendar_events FOR ALL
  USING  (public.is_business_admin(auth.uid(), calendar_events.business_id))
  WITH CHECK (public.is_business_admin(auth.uid(), calendar_events.business_id));

-- INSERT: zamestnanec — len na svojom resource_id, nie systémové typy
CREATE POLICY "calendar_events_insert_own_employee"
  ON public.calendar_events FOR INSERT
  WITH CHECK (
    calendar_events.resource_id = public.get_employee_id(auth.uid(), calendar_events.business_id)
    AND calendar_events.type NOT IN ('service_booking', 'admin_booking_note')
  );

-- UPDATE: zamestnanec — len vlastné udalosti
CREATE POLICY "calendar_events_update_own_employee"
  ON public.calendar_events FOR UPDATE
  USING (
    calendar_events.resource_id = public.get_employee_id(auth.uid(), calendar_events.business_id)
    AND calendar_events.type NOT IN ('service_booking', 'admin_booking_note')
  )
  WITH CHECK (
    calendar_events.resource_id = public.get_employee_id(auth.uid(), calendar_events.business_id)
    AND calendar_events.type NOT IN ('service_booking', 'admin_booking_note')
  );

-- DELETE: zamestnanec — len vlastné (nie systémové)
CREATE POLICY "calendar_events_delete_own_employee"
  ON public.calendar_events FOR DELETE
  USING (
    calendar_events.resource_id = public.get_employee_id(auth.uid(), calendar_events.business_id)
    AND calendar_events.type NOT IN ('service_booking', 'admin_booking_note')
  );

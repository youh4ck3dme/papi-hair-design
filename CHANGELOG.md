# Changelog

## [2026-03-11] - Grande Finale hardening

### Added
- Google Analytics `gtag.js` snippet v `<head>` s consent-aware default nastavenim.
- Operativny status dokument: `docs/GRANDE-FINALE-STATUS-2026-03-11.md`.

### Changed
- Firestore rules hardening pre employee-service mapping:
  - `employee_services` write operacie su owner-only.
  - `service_mode` governance je owner-driven.
- Booking success UX:
  - registrovany user uz nedostava CTA "Dokonci registraciu".
- Accessibility cleanup:
  - command dialog ma doplneny `DialogTitle` a `DialogDescription`.
- Dokumentacny source-of-truth alignment:
  - README a klucove docs odkazuju na aktualny finale status.

### Fixed
- Firestore indexy nasadene v produkcii pre booking/admin query patterny.
- Booking a admin calendar E2E flow upraveny a overeny po UX zmenach.

## [checkpoint/e2e-rls-claim-stable] — 2026-02-19

### Fixed
- **Onboarding gating**: `businesses.onboarding_completed` is now the sole source of truth. Removed `DEMO_BUSINESS_ID` hack from frontend logic.
- **Soft-delete safety**: Services and employees in onboarding steps 3/4 use upsert + `is_active=false` deactivation instead of hard-delete, preserving FK integrity.
- **Demo seed**: Demo business (`a1b2c3d4-...0001`) seeded with `onboarding_completed=true` via SQL — not frontend workaround.

### Added
- **Employee self-service** (`/admin/my`): Employees see only their own calendar and can mark appointments as completed. RLS enforces data isolation.
- **Claim flow**: `claim-booking` edge function validates Bearer auth, hashed token, expiry, and idempotency (`used_at`). Creates membership on successful claim.
- **Public booking**: `create-public-booking` edge function with conflict detection, customer upsert, and 30-min claim token generation.

### Security
- RLS policies: `appointments_select_employee_own`, `appointments_update_employee_own` enforce `employee_id = get_employee_id(auth.uid(), business_id)`.
- All multi-tenant queries include `business_id` constraint in RLS policies.
- Booking claims table: no user INSERT/UPDATE/DELETE — only service-role edge functions write.

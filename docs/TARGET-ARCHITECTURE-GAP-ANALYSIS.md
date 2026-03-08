# Target Architecture Gap Analysis

Datum: 2026-03-08
Repo baseline: `origin/main`
Local working tree status: dirty, but `main` is aligned with `origin/main`; all deltas are local uncommitted changes, not remote divergence.

## Executive summary

The target architecture document is directionally correct, but the current codebase is still client-heavy and does not yet implement the core backend-authoritative invariants needed for a multi-tenant SaaS booking platform.

The current local worktree contains a mix of:

- useful infrastructure alignment changes
- temporary migration tooling
- large UI/admin redesign work
- changes that conflict with the target architecture or introduce new security risk

The correct move is not to merge everything as one final pack. The correct move is to extract a clean target-architecture pack from the current local work, keep only the changes that reduce baseline drift, and rewrite the rest behind the target model.

## What is true in the current codebase

### Backend authority is not established yet

- Public booking is still created directly as `confirmed` in `functions/src/createPublicBooking.ts`.
- There is no hold lifecycle, no payment lifecycle, no Stripe webhook confirmation path, and no expiry flow.
- Offline sync mutates appointments directly and returns empty conflict results in `functions/src/syncOfflineData.ts`.

### Auth and tenant control are still split between client, rules, and backend

- Memberships are read directly from Firestore in `src/contexts/AuthContext.tsx`.
- Route access is enforced in the client in `src/components/ProtectedRoute.tsx`.
- Firestore rules still allow direct client writes for several business collections in `firestore.rules`.
- `memberships` create is still open for signed-in users in rules.
- `src/pages/BootstrapPage.tsx` can create owner membership from the client, which is the opposite of the target architecture.

### Public booking reads are still source-collection driven

- `src/integrations/firebase/useBookingDataFirebase.ts` reads `businesses`, `services`, `employees`, `business_hours`, `business_date_overrides`, `schedules`, `employee_services`, and sometimes `memberships`.
- There is no `public_snapshots/{businessId}` read model yet.
- No snapshot rebuild pipeline exists.

### Secrets and operational safety are not hardened enough

- SMTP password is still stored in Firestore in `functions/src/saveSmtpConfig.ts`.
- No Secret Manager abstraction exists.
- No Stripe secrets, webhook verification, or billing guard flow exists.

### Multi-tenant support is partial

- There is a tenant hint resolver in `src/lib/tenantResolver.ts`.
- There is also still hardcoded fallback business behavior in multiple places.
- The current model is closer to "single default salon with partial tenant hooks" than real multi-tenant SaaS isolation.

## Local change assessment

### Keep in the target-architecture baseline pack

These changes reduce environment drift or improve consistency without pushing the architecture in the wrong direction.

- `firebase.json`
  - switches Firestore config to `(default)` database
- `src/integrations/firebase/config.ts`
  - aligns client Firestore access with default database
  - aligns Functions region to `europe-west1`
- `functions/src/claimBooking.ts`
- `functions/src/createPublicBooking.ts`
- `functions/src/saveSmtpConfig.ts`
- `functions/src/syncOfflineData.ts`
  - region alignment plus `getFirestore()` cleanup
- `src/hooks/useBusiness.ts`
- `src/integrations/firebase/useBookingDataFirebase.ts`
- `src/components/calendar/MobileCalendarShell.tsx`
- `src/hooks/useBookingForm.ts`
- `src/hooks/useOnboarding.ts`
  - replace fake demo business id with `papi-hair-design-main`
- `src/integrations/firebase/useBusinessInfoFirebase.ts`
- `src/pages/LiquidPlayground.tsx`
  - centralize service loading into business info instead of a duplicate query in the page
- `e2e/playwright.config.ts`
  - serial execution is slower but is a rational stabilization step for flaky calendar tests

### Keep only as temporary migration tooling

These files can be useful for a one-time migration window, but they should not be treated as permanent platform architecture.

- `functions/src/importMigrationData.ts`
- `scripts/import-firestore.js`
- `functions/migration_data/`

Constraints:

- should be disabled or removed after cutover
- should never remain as a permanently deployed callable import surface
- should be callable only by controlled operator workflow, not by a reusable app endpoint

### Do not merge as part of the architecture baseline

These changes are mostly UX/admin presentation work. They may still be valuable later, but they are not the right first pack if the goal is target architecture convergence.

- `src/pages/admin/AppointmentsPage.tsx`
- `src/pages/admin/CustomersPage.tsx`
- `src/pages/admin/EmployeesPage.tsx`
- `src/pages/admin/ServicesPage.tsx`
- `src/pages/admin/SettingsPage.tsx`
- `src/components/admin/BusinessHoursEditor.tsx`

Reason:

- they are large diffs
- they mainly change surface/UI behavior
- they increase merge surface before the auth and backend authority spine is fixed

### Rewrite before merging

These changes go in a direction that conflicts with the target architecture or remain unsafe as-is.

- `src/pages/BootstrapPage.tsx`
  - still performs owner bootstrap and data seeding from the client
  - this should become an operator-only backend workflow or be removed entirely after setup
- `functions/src/saveSmtpConfig.ts`
  - even if other local changes are kept, SMTP storage must be redesigned before launch
- `functions/src/createPublicBooking.ts`
  - current local diff only normalizes region/database access; the booking implementation itself still requires a structural rewrite

### Reject as-is

- `e2e/calendar-comprehensive.spec.ts`
  - contains hardcoded credentials
  - should not be merged in current form

## Recommended final working pack

Build the future work on a clean pack with the following scope.

### Pack 0: Baseline alignment

Goal: eliminate environment drift and get repo, runtime, and data target pointed at one Firebase baseline.

Include:

- Firestore `(default)` database alignment
- Functions region normalization to `europe-west1`
- real business id normalization
- service loading normalization in business info hook
- test runner stabilization only if credentials are externalized

Exclude:

- UI restyles
- client bootstrap expansion
- permanent migration callables

### Pack 1: Security and auth spine

Goal: backend becomes the only authority for privileged operations.

Required changes:

- remove client bootstrap writes for owner creation
- close `memberships` client create in rules
- move privileged writes behind callable/server guards
- fix route-role mismatch and remove employee leakage into admin-only flows
- define `requireAuth` and `requireMembership` backend guard layer
- move SMTP secret handling to Secret Manager

### Pack 2: Booking spine

Goal: replace direct `confirmed` writes with a booking state machine.

Required changes:

- implement `hold_created`, `payment_pending`, `confirmed`, `completed`, `cancelled`, `expired`, `no_show`
- add TTL/expiry handling
- add idempotency on booking create
- ensure availability conflict checks operate on authoritative booking states
- redesign offline sync around server-side conflict handling

### Pack 3: Payments spine

Goal: payment outcome is authoritative only from backend/webhooks.

Required changes:

- Stripe server-side session or intent creation
- webhook verification
- status transitions only from verified backend events
- pricing calculated on backend from service source-of-truth

### Pack 4: Snapshot spine

Goal: public booking reads a single optimized read model.

Required changes:

- `public_snapshots/{businessId}` schema
- rebuild function
- revisioning and stale/error handling
- frontend switch from source collections to snapshot reads

### Pack 5: SaaS hardening

Goal: make the platform operable for pilot tenants and safe production rollout.

Required changes:

- subscription guards
- observability and alerting
- backup/restore runbooks
- pilot onboarding flow
- feature flags and rollback path

## Missing information still needed from infra/business owners

- Firebase project matrix for `dev`, `staging`, `prod`
- which Firestore database is canonical in production
- Vercel project mapping per environment
- domain and DNS ownership
- Secrets inventory and owner
- Stripe account strategy
- test accounts and data reset flow
- deployment approval flow
- expected tenant count and traffic envelope
- uptime/SLO expectations

## Decision

Proceed by extracting a clean architecture pack from the current local work instead of merging the whole dirty worktree.

The local changes contain usable pieces, but they are not a safe final pack in their current shape.

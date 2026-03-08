# 90-Day Target Architecture Plan

Datum: 2026-03-08
Planning basis:

- target architecture direction from the resolved target document
- current repository state from local code audit
- local uncommitted work classified into keep/rewrite/defer buckets

## Objective

In 90 days, the platform should move from a salon-focused Firebase MVP with client-heavy authority to a backend-authoritative, tenant-safe booking SaaS foundation that is ready for controlled pilot rollout.

## Success criteria

By day 90, all of the following should be true:

- privileged writes are backend-only
- membership and role enforcement are server-authoritative
- booking creation uses a state machine instead of direct `confirmed` writes
- payment-confirmed bookings are created only from verified backend events
- public booking no longer reads many source collections directly
- SMTP and other sensitive secrets are not stored plaintext in Firestore
- pilot onboarding for the first tenant set is operationally supportable

## Working principles

- Fix authority first, UI later.
- Remove root causes, not symptoms.
- Minimize merge surface before the auth and booking spine are stable.
- Prefer reversible rollout with feature flags and migration rehearsals.
- Ship in narrow packs with verification gates.

## Phase plan

### Days 1-10: Baseline freeze and architecture guardrails

Deliverables:

- decide canonical Firebase database and region
- extract and land Pack 0 baseline alignment
- freeze unsafe local changes from being merged ad hoc
- write architecture ADRs for auth authority, booking state machine, snapshot model, and migration strategy
- inventory secrets, environments, and operators

Verification gates:

- build, lint, typecheck pass on clean baseline branch
- env matrix documented
- target architecture scope signed off

Primary risks:

- hidden dependence on non-default Firestore database
- undocumented production secrets
- unknown runtime behavior not reflected in repo

### Days 11-25: Security and auth spine

Deliverables:

- backend guard library for auth and membership verification
- close client-side privileged writes in rules
- remove or lock down client bootstrap flows
- role model documented and enforced consistently
- SMTP secret storage moved out of Firestore

Verification gates:

- no owner/admin provisioning from client
- Firestore rules deny direct privileged writes
- security regression tests added for role boundaries

Primary risks:

- breaking current admin workflows during rule tightening
- migration of existing memberships and bootstrap assumptions

### Days 26-45: Booking spine

Deliverables:

- booking state machine model
- hold creation and expiry flow
- idempotent booking create callable
- authoritative overlap/conflict detection
- offline sync contract updated to reflect server conflict authority

Verification gates:

- no direct public write to `confirmed` on first submit
- duplicate submit does not create duplicate bookings
- booking conflicts are reproducible and handled deterministically

Primary risks:

- race conditions around holds
- migration of existing appointments with simplified states

### Days 46-60: Payments spine

Deliverables:

- Stripe server-side checkout/session workflow
- verified webhook ingestion
- payment-linked state transitions
- refund/cancel mapping defined
- accounting separation between customer deposits and SaaS revenue

Verification gates:

- success URL alone cannot confirm a booking
- replayed webhook is idempotent
- price is derived from backend source-of-truth, not UI payload

Primary risks:

- webhook ordering and retries
- incorrect financial state transitions

### Days 61-75: Snapshot spine and public performance model

Deliverables:

- `public_snapshots/{businessId}` schema
- rebuild pipeline and manual rebuild operator path
- frontend migration from source collections to snapshot reads
- stale/error snapshot fallback UX

Verification gates:

- public booking page loads without fan-out across many source collections
- snapshot rebuild failure does not corrupt source data
- admin can observe snapshot revision state

Primary risks:

- stale read model serving invalid availability
- rebuild storms if invalidation is designed poorly

### Days 76-90: SaaS hardening, pilot readiness, and cutover buffer

Deliverables:

- observability pack: logging, alerting, runbooks
- tenant onboarding and subscription gating
- backup/restore and rollback procedures
- pilot checklist for first salon cohort
- explicit deprecation plan for legacy flows

Verification gates:

- pilot tenant can onboard without manual database surgery
- incident runbook exists for booking, payment, and email failures
- rollback path is rehearsed

Primary risks:

- support burden from partially migrated admin flows
- insufficient operational visibility during pilot rollout

## Suggested workstream split

### Workstream A: Platform

- Functions
- Firestore rules
- auth guards
- Secret Manager
- Stripe backend

### Workstream B: Data and migration

- state migration
- snapshot schema
- import/cutover tooling
- backfill scripts

### Workstream C: Product surface

- booking UI integration
- admin adjustments after backend changes
- degraded/fallback UX

### Workstream D: Quality and operations

- unit/integration/e2e coverage
- monitoring
- rollout playbooks
- environment validation

## What should not be prioritized before the spine work

- broad admin UI redesign
- visual polish-heavy refactors
- marketplace/discovery ideas
- native app packaging
- AI features
- multi-location expansion

## Immediate next actions

1. Create a clean branch for Pack 0 extraction.
2. Land only environment/database/region/business-id alignment changes.
3. Block merge of hardcoded test credentials and client bootstrap expansion.
4. Write the auth and booking ADRs before coding Pack 1 and Pack 2.
5. Get missing infra ownership and secret inventory from the project owner.

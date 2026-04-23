# Week 3: Tenantization And Canonical Booking Surface

## Objective
Reduce single-salon assumptions and define one canonical booking surface so the platform can move toward a real white-label path without polluting PAPI's production brand.

## Why This Week Exists
- Hardcoded single-salon defaults still block believable white-label expansion.
- Demo cleanup is not enough; bootstrap, business IDs, and role enforcement must stop assuming one salon.
- A buyer should see one product truth, not multiple booking realities.

## Scope
1. Hardcode cleanup stage 2
2. Canonical booking surface decision
3. Tenant-safe bootstrap direction
4. Neutral demo tenant prerequisites

## Deliverables
- Hardcode inventory reduced into an actionable refactor list
- Canonical booking surface decision memo
- Tenant-safe bootstrap design note
- Neutral demo tenant prerequisites checklist

## Execution Tasks
### Hardcodes Stage 2
- Target the next-risk files first:
  - business ID fallbacks
  - bootstrap flows
  - allowlists / role enforcement
  - email branding defaults
- Separate `brand config` from `tenant config`.
- Stop treating `papi-hair-design-main` as the silent platform truth.

### Canonical Booking Surface
- Decide and document one booking truth.
- Explicitly close the question of parallel surfaces like Bookio/Booqme vs internal booking flow.
- Keep PAPI production app free from demo or experimental surface noise.

### Bootstrap / Tenant Direction
- Define how a new tenant would be created without reusing PAPI internals.
- Clarify what stays manual in phase one.
- Clarify what must exist before self-serve onboarding is even discussed.

### Neutral Demo Tenant
- Define requirements only; do not reintroduce `/demo` into PAPI production.
- Separate neutral demo branding, users, and sample data from PAPI.

## Acceptance Criteria
- The next hardcode cleanup set is explicitly scoped.
- One canonical booking surface is documented.
- Tenant-safe bootstrap direction is understandable.
- Neutral demo tenant is treated as separate infrastructure, not a PAPI feature.

## Review Checklist
- Are we removing platform blockers, not just renaming strings?
- Is there exactly one product truth for booking?
- Does the plan protect PAPI's live brand surface?
- Is the demo tenant clearly separated from production identity?

## Copilot / Agent Brief
Use this brief if another AI agent or Copilot should continue the work:

"Create a tenantization execution blueprint for a currently single-salon booking platform. Focus on: (1) business ID and bootstrap hardcodes, (2) one canonical booking surface, (3) tenant-safe onboarding direction, and (4) prerequisites for a neutral demo tenant that must stay separate from the live PAPI production app."

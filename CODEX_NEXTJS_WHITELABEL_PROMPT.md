# Codex Build Prompt: Next.js White-label Booking Shell

## Start Here

You are working in:

- Repository: `https://github.com/youh4ck3dme/papi-hair-design`
- Working branch: `codex/nextjs-whitelabel-builder-brief`
- Protected PAPI branch: `otvarackapril2026`
- Local safety branch: `papialoklnazalohavjednom`

Your task is to prepare the future Next.js white-label booking and buyer-facing platform shell. Do not modify or deploy the protected PAPI production runtime.

## Non-Negotiable Rules

1. Do not migrate the PAPI production app just because Next.js is planned.
2. Keep `otvarackapril2026` as the clean, protected PAPI production truth.
3. Treat this branch as a builder brief and prototype direction branch.
4. Do not mix PAPI service pricing with platform software pricing.
5. Do not reintroduce public `/demo` under PAPI identity.
6. Do not build the color picker before tenant-safe onboarding and neutral demo tenant exist.
7. Do not add self-serve tenant provisioning before at least one external pilot proves demand.
8. Every implementation must include tests or a clear statement of what remains unverified.

## Product Goal

Build a premium managed booking platform for service businesses.

This is not "another booking app." It is a managed booking and operations layer sold as an outcome:

- clean booking
- operations/admin surface
- service categories
- launch setup
- diagnostics
- mobile-first PWA behavior
- repeatable pilot onboarding

## Inspiration Sources

Use these as pattern references, not as copy sources:

- Fresha: segment-specific salon/barber/beauty positioning
- SimplyBook.me: booking themes and wide industry template coverage
- Setmore: universal industry grid
- Acuity: service category logic
- GlossGenius: clear premium pricing tiers
- Mangomint: calm premium business software feel
- Mindbody: platform positioning, reporting, per-location pricing
- Vagaro: broad business-management positioning
- Booksy: practical service setup model
- Square Appointments: setup checklist and multi-location readiness

## Primary Output

Create a Next.js App Router shell for the white-label platform surface.

Recommended structure:

```text
src/app/
  (marketing)/
    layout.tsx
    page.tsx
    platform/
      page.tsx
    pricing/
      page.tsx
    verticals/
      page.tsx
      [slug]/
        page.tsx
    pilot/
      page.tsx
  api/
    lead/
      route.ts
src/components/marketing/
src/lib/platform/
```

If creating a new Next.js app inside this repo, prefer a clearly separated workspace such as:

```text
apps/whitelabel-next/
```

Do not overwrite the existing Vite/Firebase PAPI runtime.

## Landing Page Wireframe

### 1. Hero

Goal:
- sell the outcome, not the software

Content:
- eyebrow: `Managed booking OS for service businesses`
- headline: `A booking system sold as an outcome`
- subcopy: one sentence about configured booking, operations panel, launch process, diagnostics, and support
- CTA 1: `Request a pilot call`
- CTA 2: `View live location`

Visual:
- warm ivory background
- huge confident headline
- charcoal text
- champagne accent
- one premium dark signal card on the right

### 2. Proof Layer

Cards:
- Conversion intelligence
- Mobile-first reality
- Measurable proof layer

Purpose:
- show this is not a screenshot-only PWA
- show that funnel, mobile behavior, diagnostics, and update safety matter

### 3. Universal Vertical Matrix

Groups:
- Beauty and appearance
- Wellness and recovery
- Health-adjacent care
- Lifestyle and expertise

Verticals:
- Treatments
- All treatments
- Hair and styling
- Nails
- Hair removal
- Brows and lashes
- Face and skin care
- Massage salon
- Make-up
- Aesthetics
- Barbershop
- Spa and wellness
- Body and skin
- Tattoo and piercing
- Holistic health
- Dental care
- Medical
- Pets
- Fitness
- Physiotherapy
- Counselling and therapy
- Other

Each vertical should eventually have:
- slug
- label
- short benefit
- example services
- recommended booking logic
- staff/resource assignment logic
- compliance note

### 4. Managed Setup

Explain that the first pilots are not self-serve.

Steps:
1. Location audit
2. Template setup
3. Live pilot

### 5. Platform Pricing

Do not use salon service pricing.

Model:
- `€199-€490 setup`
- `€29-€79 monthly / location`
- scoped pilot offer

Add-ons later:
- SMS
- migration
- custom domain
- reporting pack
- advanced brand/theme setup

### 6. Conversion Radar

Show what gets measured:
- visit
- CTA click
- vertical interest
- pricing interest
- pilot form started
- pilot form submitted
- booking started
- booking completed

### 7. Theme Lab Teaser

Do not build full editor yet.

Show:
- primary color
- accent
- CTA
- surface
- background
- status colors
- contrast-safe text

Guardrail:
- theme editor comes after tenant-safe onboarding and neutral demo tenant.

### 8. Final CTA

Message:
- pilot first
- automation second
- sell proof and outcomes

## Data Model Draft

```ts
export type PlatformVerticalGroup =
  | "beauty"
  | "wellness"
  | "health"
  | "lifestyle";

export type PlatformVertical = {
  id: string;
  slug: string;
  group: PlatformVerticalGroup;
  label: string;
  shortBenefit: string;
  exampleServices: string[];
  recommendedBookingLogic: string;
  staffAssignmentLogic: string;
  complianceNote?: string;
};
```

Keep this static and typed first. Do not add a CMS until copy changes require non-developer editing.

## Analytics Events

Design the analytics plan first, implement only if safe and consent-aware:

- `platform_viewed`
- `platform_cta_clicked`
- `platform_verticals_viewed`
- `platform_vertical_group_viewed`
- `platform_pricing_viewed`
- `pilot_form_started`
- `pilot_form_submitted`

Rules:
- no raw personal data in analytics events
- consent-aware
- diagnostics separate from marketing analytics

## Pilot Lead Form

Fields:

- business name
- vertical
- city
- staff count
- service count
- current booking tool
- biggest pain
- email
- phone

First implementation can be non-production if clearly marked.

Production-ready version:

- validates payload
- rate limits
- stores in Firestore or sends email
- no raw secrets
- no analytics PII

## Visual Direction

Avoid:

- generic purple SaaS gradient
- cheap dashboard collage
- overstuffed card soup
- fake enterprise claims

Use:

- quiet luxury
- editorial spacing
- warm ivory
- charcoal ink
- champagne accent
- sage secondary accent
- terracotta warning/guardrail accent
- big confident type
- tactile cards
- precise microcopy

## Testing Expectations

Minimum for any implementation:

- component tests for vertical catalog rendering
- smoke test for landing route
- build
- lint
- no broken JSON/i18n
- no regressions to PAPI production branch

## Acceptance Criteria

The branch is successful when:

1. PAPI production remains untouched.
2. Next.js direction is isolated.
3. A buyer can understand the product in under one minute.
4. Platform pricing is separate from service pricing.
5. The 22 verticals are represented as reusable typed data.
6. The landing wireframe supports conversion, mobile, analytics, and trust sections.
7. Theme/color picker is only a teaser, not a premature editor.
8. The implementation is testable and does not depend on hidden chat history.

## Read These Files First

- `docs/NEXTJS-WHITELABEL-BLUEPRINT.md`
- `docs/PLATFORM-BLUEPRINT.md`
- `TODO.md`
- `src/lib/platformVerticals.ts`
- `src/pages/PlatformPage.tsx`
- `src/pages/PlatformPage.test.tsx`

## Final Instruction

Build carefully. Keep the PAPI production product sealed. Make the white-label direction beautiful, universal, measurable, and believable.

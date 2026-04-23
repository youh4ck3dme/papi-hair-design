# Next.js White-label Blueprint

## Purpose

This is the target architecture for a future white-label marketing and buyer-facing layer. It is not a request to migrate the protected PAPI production app immediately.

The current PAPI production system remains Firebase-first and protected on `otvarackapril2026`. Next.js is a candidate for the future platform shell because it is a better fit for:

- segment landing pages
- SEO and local-business content
- buyer/investor pages
- static pricing and sales materials
- future public docs or case studies
- route-level metadata and OG images

## Strategic Decision

Use Next.js for the white-label platform surface, not as an immediate replacement for the PAPI booking/admin runtime.

### Keep In The Current React/Vite/Firebase App

- PAPI production booking flow
- PAPI admin/staff surface
- Firebase callable flows
- Firestore-backed runtime operations
- existing PWA install/update behavior
- protected production deploy path

### Move Or Rebuild In A Future Next.js Shell

- `/platform`
- software pricing page
- vertical landing pages
- buyer materials
- pilot application page
- case-study pages
- public white-label documentation
- theme preview playground after tenant-safe onboarding exists

## Recommended Shape

Use Next.js App Router with route groups:

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
  (docs)/
    docs/
      page.tsx
  api/
    lead/
      route.ts
```

## Core Routes

### `/`

Public platform homepage.

Goal:
- explain the product as a managed booking operating layer
- avoid sounding like another self-serve app
- direct buyers to pilot inquiry

Sections:
- hero
- proof layer
- vertical grid
- managed setup
- pricing teaser
- mobile-first reality
- analytics and reporting promise
- final pilot CTA

### `/platform`

Buyer-facing product page.

Goal:
- show the complete platform story
- explain why this can become repeatable
- stay separate from PAPI production branding

Sections:
- investor signal
- conversion intelligence
- mobile-first PWA reality
- diagnostics and funnel tracking
- 22 vertical matrix
- managed launch system
- pricing model
- theme-lab teaser

### `/pricing`

Software pricing, not service pricing.

Pricing model:
- setup fee: `€199–€490`
- monthly retainer: `€29–€79 / location`
- pilot plan with fixed scope
- add-ons later: SMS, custom domain, migration, reporting, advanced branding

Do not mix this with salon service pricing.

### `/verticals`

Universal category overview.

Groups:
- beauty and appearance
- wellness and recovery
- health-adjacent care
- lifestyle and expertise

Verticals:
- treatments
- all treatments
- hair and styling
- nails
- hair removal
- brows and lashes
- face and skin care
- massage salon
- make-up
- aesthetics
- barbershop
- spa and wellness
- body and skin
- tattoo and piercing
- holistic health
- dental care
- medical
- pets
- fitness
- physiotherapy
- counselling and therapy
- other

### `/verticals/[slug]`

Segment-specific landing pages.

Each page should include:
- segment-specific hero
- example services
- recommended booking rules
- staff/resource assignment model
- risk/compliance note
- ideal pilot offer
- CTA

Do not generate these pages until the copy and category model are stable enough.

### `/pilot`

Lead capture for managed pilots.

Fields:
- business name
- vertical
- city
- service count estimate
- staff count estimate
- current booking tool
- main pain
- email / phone

Submission:
- first version can send email or create Firestore lead
- do not build complex CRM before validation

## Data Model

Keep platform vertical data as plain typed data first.

```ts
export type PlatformVertical = {
  id: string;
  slug: string;
  group: "beauty" | "wellness" | "health" | "lifestyle";
  label: string;
  shortBenefit: string;
  exampleServices: string[];
  recommendedBookingLogic: string;
  staffAssignmentLogic: string;
  complianceNote?: string;
};
```

Start with static data in `src/lib/platformVerticals.ts`. Move to CMS only when non-developers need to edit it.

## App Router Rules

- Prefer Server Components for marketing pages.
- Push `use client` only into interactive pieces such as lead forms, theme preview, or analytics consent widgets.
- Do not initialize Firebase, email SDKs, or payment SDKs at module scope in server files.
- Use lazy getter functions for runtime clients.
- Keep metadata per route explicit.

Example route metadata:

```ts
export const metadata = {
  title: "Managed booking system for service businesses",
  description: "White-label booking, operations, and managed launch for service businesses.",
  robots: {
    index: false,
    follow: false,
  },
};
```

When the platform becomes public, remove `noindex` only after:
- legal copy is ready
- pricing is reviewed
- lead flow works
- analytics consent is correct
- PAPI production identity is not mixed into the page

## Styling Direction

Visual language:
- quiet luxury
- warm editorial surfaces
- high contrast typography
- restrained motion
- no generic purple SaaS gradient
- no template-looking card soup

Recommended design primitives:
- oversized serif/sans hero headline
- warm ivory background
- charcoal ink
- champagne accent
- muted sage secondary accent
- terracotta warning/guardrail accent
- metric strips
- grouped vertical matrix
- tactile cards with soft borders and layered shadows

Color picker comes later. For now, show only theme direction and token previews.

## Analytics Plan

Track only privacy-safe events first.

Core events:
- `platform_viewed`
- `platform_verticals_viewed`
- `platform_vertical_group_viewed`
- `platform_pricing_viewed`
- `platform_cta_clicked`
- `pilot_form_started`
- `pilot_form_submitted`

Rules:
- consent-aware
- no raw personal data in analytics event payloads
- keep diagnostics separate from marketing analytics

## Lead Flow

First version:
- mailto CTA is acceptable for internal review
- pilot form is better before outreach

Production-ready pilot lead flow:
- route handler validates payload
- rate limit by IP hash
- stores lead in Firestore or sends email
- logs non-PII diagnostics only on failure
- sends confirmation email only after consent/legitimate basis is reviewed

## What Not To Do

Do not:
- migrate PAPI production booking/admin to Next.js just for fashion
- mix PAPI service pricing with platform pricing
- publish public demo pages under PAPI identity
- build self-serve tenant provisioning before one external pilot
- add a color picker before tenant-safe onboarding
- create 22 thin SEO pages with weak copy
- initialize Firebase/Admin SDKs at module scope in Next.js server files
- add tracking that bypasses consent
- make the platform look like a cheap SaaS template

## 14-Day Target

1. Keep PAPI sealed.
2. Finish the universal `/platform` story in the current branch.
3. Keep the 22 vertical catalog as typed data.
4. Add conversion event blueprint, not full analytics overbuild.
5. Prepare a Next.js shell blueprint only.
6. Do not migrate runtime flows.

## 30-Day Target

1. Build or prototype Next.js marketing shell.
2. Add `/platform`, `/pricing`, `/verticals`, `/pilot`.
3. Keep noindex until review.
4. Add one high-quality vertical page.
5. Add pilot form.
6. Start direct outreach with a clear managed offer.

## 90-Day Target

1. Validate one external pilot.
2. Add reporting proof.
3. Add compliance pack.
4. Add 3-5 carefully written vertical pages.
5. Decide whether Next.js shell becomes public canonical platform site.

## Definition Of Done

This blueprint is ready when:

- PAPI production remains untouched
- platform routes are separated from salon service pricing
- vertical catalog is reusable
- sales story is managed-outcome based
- analytics and lead capture have privacy guardrails
- theme picker is explicitly delayed until onboarding is tenant-safe

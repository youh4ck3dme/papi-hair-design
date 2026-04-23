# Platform Blueprint

## 1. Purpose

Tento dokument je prakticky execution blueprint pre dalsie kolo prace na projekte.
Nema opisovat sen o buducom SaaS. Ma pomoct rychlo rozhodovat:
- co je dnes silne
- co je este len skeleton
- co treba riesit v akom poradi
- co sa nesmie rozbit, kym sa projekt odtenantizuje

Nejde o marketing. Ide o roadmap pre rychlejsie a cistejsie vykonavanie dalsich zmien.

## 2. Current scorecard

### Branding a hardcody
- stav: slabe
- verdict: treba odtenantizovat

### Billing flow
- stav: zaklad existuje
- verdict: nie je ready

### Pricing page
- stav: hotova
- verdict: je to service pricing, nie platform pricing

### Onboarding
- stav: funkcny pre PAPI
- verdict: nie je tenant-safe

### Access model
- stav: silny
- verdict: chranit a rozsirovat, nie prerabat naslepo

### Demo tenant
- stav: este nie
- verdict: treba vytvorit oddelene od PAPI produkcie

### Buyer materials
- stav: technicke ano, sales nie
- verdict: treba doplnit komercny a buyer-facing layer

## 3. Strategic rule

Poradie je dolezite:
1. najprv odpojit PAPI-specific pravdu od product core
2. potom urobit tenant-safe onboarding a neutral demo tenant
3. az potom doplnat buyer materials a eventualne billing hardening

Ak sa toto poradie porusi, len obalime single-brand system do noveho slovnika bez realnej platformovej pripravy.

## 4. Workstream blueprint by category

### 4.1 Branding a hardcody

#### Current state
- v kode stale ziju PAPI-specific domeny, emaily, default business IDs a bootstrap allowlist
- cast frontendu, backendu aj legal/SEO textov stale hovori pravdu jednej konkretnej znacky

#### Root causes
- `DEFAULT_BUSINESS_ID = papi-hair-design-main`
- `booking.papihairdesign.sk` je stale canonical fallback
- bootstrap a role seeding su stale naviazane na konkretne emaily a jednu prevadzku
- email/calendar UID a public metadata stale nesu PAPI branding

#### Main file clusters
- `src/lib/businessIds.ts`
- `src/lib/seoStructuredData.ts`
- `src/lib/calendarExport.ts`
- `src/i18n/*.json`
- `src/pages/PrivacyPage.tsx`
- `src/pages/TermsPage.tsx`
- `functions/src/bootstrapAdminAccess.ts`
- `functions/src/enforceSalonRoles.ts`
- `functions/src/emailQueue.ts`
- `functions/src/calendarInvite.ts`
- `functions/src/publicBookingAccess.ts`

#### Target state
- brand config je oddelena od product core
- canonical host, contact metadata, booking base URL a calendar branding sa beru z config vrstvy
- bootstrap a allowlist logika nie su natvrdo PAPI-only

#### Definition of done
- ziadny production-critical flow sa nespolieha na PAPI hardcoded fallback, ak ma existovat tenant-aware config
- legal, email, calendar a booking metadata idu z centralnej config vrstvy
- ostanu len vedome PAPI-specific runtime data, nie hardcoded product assumptions

### 4.2 Billing flow

#### Current state
- existuje frontend aj backend skeleton pre checkout
- billing je produktovo odlozeny a nie je dokazany ako complete lifecycle

#### Root causes
- billing vznikol ako priprava, nie ako uzavrety commercial subsystem
- chyba plan governance, cancellation lifecycle, ownership model a support truth

#### Main file clusters
- `src/integrations/firebase/createCheckoutSession.ts`
- `functions/src/createCheckoutSession.ts`
- `src/pages/TermsPage.tsx`
- `docs/PRODUCT-SAAS.md`
- `TODO.md`

#### Target state
- jeden jasny billing model
- jasne price IDs, enable flagy, success/cancel pathy, owner expectations a support pravidla

#### Definition of done
- checkout session flow je dokazovo otestovany
- billing sa da zapnut bez improvizacie v env a docs
- terms, pricing a onboarding jazyk sedia s realnym commercial modelom

#### Important note
- toto nema byt najblizsi implementacny blok
- billing ma ist az po tenant-safe foundations a po prvom market signale

### 4.3 Pricing page

#### Current state
- public `/pricing` je hotove a dobre sluzi ako cennik sluzieb pre PAPI
- nie je to platform pricing page pre dalsich klientov

#### Main file clusters
- `src/pages/Pricing.tsx`
- `src/components/pricing/ServicePriceCatalog.tsx`
- `src/lib/pricingCatalog.ts`
- `src/components/public/PublicStickyHeader.tsx`

#### Target state
- oddelit dva svety:
  - salon service pricing
  - buduci platform pricing

#### Definition of done
- service pricing ostane cisty customer-facing cennik
- buduci commercial pricing pre dalsie prevadzky nebude miesat service menu s platform plans

### 4.4 Onboarding

#### Current state
- onboarding wizard existuje
- bootstrap route existuje
- pre PAPI je flow funkcny
- pre buduci tenant-safe onboarding este nie je pripraveny

#### Root causes
- onboarding aj bootstrap su stale previazané s default business a owner allowlist pravdou
- role activation a business creation nie su este oddelene ako neutral provisioning flow

#### Main file clusters
- `src/components/OnboardingWizard.tsx`
- `src/hooks/useOnboarding.ts`
- `src/pages/BootstrapPage.tsx`
- `functions/src/bootstrapAdminAccess.ts`
- `functions/src/normalizeMemberships.ts`

#### Target state
- onboarding vie zalozit a konfigurovat tenant-safe business bez PAPI assumptions
- bootstrap je len administrativna alebo support vrstva, nie trvale produktove barlicky

#### Definition of done
- onboarding ide cez tenant config, nie cez hardcoded brand truth
- owner/admin activation nevyzaduje PAPI-only allowlist pattern
- flow sa da opisat ako repeatable runbook pre novu prevadzku

### 4.5 Access model

#### Current state
- jedna z najsilnejsich vrstiev projektu
- membership model, `ProtectedRoute` a backend `requireMembership(...)` maju dobry zaklad

#### Why it matters
- tato vrstva je presne to, co drzi admin/public/staff hranice pokope
- pri tenantization ju netreba rozbijat, ale zachovat a rozsirit

#### Main file clusters
- `src/components/ProtectedRoute.tsx`
- `src/contexts/AuthContext.tsx`
- `firestore.rules`
- `functions/src/*membership*`

#### Target state
- zachovat membership-first pravdu
- tenantization stavat na nej, nie ju obchadzat novymi allowlist hackmi

#### Definition of done
- role/access truth ostane jednotna medzi:
  - frontend route gating
  - firestore rules
  - backend callable guards

### 4.6 Demo tenant

#### Current state
- verejna `/demo` route je spravne odstranena z produkcnej PAPI appky
- neutral demo tenant este neexistuje
- v kode stale zostali niektore `DEMO_BUSINESS_ID` zostatky

#### Root causes
- demo historicky sluzilo skor ako internal/public showcase, nie ako oddeleny neutral tenant

#### Main file clusters
- `src/App.tsx`
- `src/components/calendar/MobileCalendarShell.tsx`
- `src/lib/tenantResolver.ts`
- `TODO.md`

#### Target state
- samostatny neutral demo tenant
- bez PAPI brandingu
- bez konfliktu s produkcnou PAPI identitou
- idealne noindex / partner-sales / showcase use-case

#### Definition of done
- demo tenant ma vlastny nazov, data, users, business config a routing truth
- production PAPI surface nevyzera ako prototyp ani showcase

### 4.7 Buyer materials

#### Current state
- technicka dokumentacia je na slusnej urovni
- buyer-facing commercial materialy este nie su dokoncene

#### What already exists
- `docs/TECHNICAL-DUE-DILIGENCE.md`
- `docs/PRODUCT-SAAS.md`
- `docs/ASSET-INVENTORY.md`
- `docs/PROJECT-STATE.md`

#### What is missing
- one-pager sales deck
- neutral landing pre dalsie salony
- outreach copy
- demo video
- jednoduchy buyer narrative bez technickeho overloadu

#### Definition of done
- technicky reviewer aj buyer-side partner dostanu material primerany svojej urovni
- projekt sa vie odprezentovat bez toho, aby sa muselo vysvetlovat 20 minut improvizovane

## 5. Recommended execution order

### Phase A - Foundation cleanup
1. branding and hardcode audit to config extraction
2. onboarding hardening and tenant-safe business setup rules
3. remove or isolate remaining `DEMO_BUSINESS_ID` assumptions

### Phase B - Demo and packaging
1. neutral demo tenant
2. buyer one-pager
3. demo video
4. simple future-facing platform landing

### Phase C - Commercial readiness
1. platform pricing model
2. billing lifecycle hardening
3. support and cancellation truth

## 6. Fast decision framework

Ked si nebudeme isti, ci nieco patri do najblizsieho sprintu, polozit si 3 otazky:

1. Pomaha to oddelit product core od PAPI-specific vrstvy?
2. Pomaha to repeatable onboarding modelu?
3. Pomaha to buyer alebo operator clarity bez zbytocneho chaosu?

Ak odpoved nie je aspon na dve otazky `ano`, pravdepodobne to nie je top priorita.

## 7. Executive verdict

Projekt uz ma silne jadro.
To, co nas brzdi v dalsom raste, nie je nedostatok funkcionality, ale:
- prilis vela PAPI-specific truth v product core
- onboarding a demo vrstva este nie su tenant-safe
- buyer/commercial vrstva este nie je uzavreta

Presne preto ma ist dalsia praca v tomto poradi:
- najprv odtenantizovat
- potom pripravit neutral demo
- az potom finalizovat commercial layer

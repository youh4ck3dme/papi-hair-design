# Developer Handbook

## 1. Purpose

Tento dokument je onboarding mapa pre developera, ktory ma projekt realne rozvijat, fixovat alebo auditovat. Nesluzi ako marketingovy text. Sluzi na to, aby novy clovek pochopil:
- kde co zije
- co je kriticke pre produkciu
- ako robit zmeny bez regresii
- co je v kode platformovy zaklad a co je este stale single-brand specializacia

## 2. Repo layout

### Root
- `src/` - React aplikacia
- `functions/` - Firebase Cloud Functions backend
- `docs/` - dokumentacia a runbooky
- `public/` - staticke assety a PWA ikony
- `scripts/` - QA, budget, smoke a utility skripty
- `e2e/` - Playwright testy a helpers
- `.github/workflows/` - CI a manual test workflowy

### Frontend structure
- `src/pages/` - route-level pages
- `src/components/` - reusable UI a flow komponenty
- `src/contexts/` - auth a global state contexty
- `src/hooks/` - shared custom hooks
- `src/lib/` - helpery, business utils, export logic, SEO helpers
- `src/integrations/firebase/` - Firebase-specific client integration vrstva
- `src/styles/` - design system CSS a shared visual primitives

### Backend structure
- `functions/src/` - callable, HTTP a scheduled functions
- `functions/test/` - backend testy
- `functions/scripts/` - backend diagnostics a helpers

## 3. Mental model for the app

Ak chces chapat system spravne, nepozeraj sa na neho len ako na jeden web.

Je to kombinacia troch aplikacnych modeov:
- public booking app
- authenticated salon ops app
- backend orchestration layer

Najviac chyb vznika, ked niekto opravi len jeden z tychto svetov a zabudne na zvysne dva.

## 4. Most important runtime paths

### Public booking path
Najdolezitejsie subory:
- `src/pages/BookingPage.tsx`
- `src/integrations/firebase/useBookingDataFirebase.ts`
- `src/hooks/useBookingForm.ts`
- `functions/src/createPublicBooking.ts`
- `functions/src/confirmBooking.ts`

### Auth and role path
Najdolezitejsie subory:
- `src/pages/Auth.tsx`
- `src/contexts/AuthContext.tsx`
- `functions/src/normalizeMemberships.ts`
- `firestore.rules`

### Admin calendar path
Najdolezitejsie subory:
- `src/pages/admin/CalendarPage.tsx`
- `src/components/booking-calendar/`
- `functions/src/adminCalendarQuickAction.ts`
- `functions/src/adminUpdateBookingStatus.ts`

### Email and communication path
Najdolezitejsie subory:
- `functions/src/emailQueue.ts`
- `functions/src/calendarInvite.ts`
- `functions/src/queueRegistrationWelcomeEmail.ts`
- `firebase.json` rewrites pre `.ics`

## 5. How to make safe changes

### Rule 1
Najprv najdi root cause, nie len symptom.

### Rule 2
Zmena v bookingu casto znamena dopad na viac vrstiev:
- frontend UI
- backend mutation
- email wording alebo CTA
- test signal
- docs

### Rule 3
Pri auth, compliance, booking a admin calendar zmenach sa nespoliehaj len na unit test.
Vzdy rozmyslaj, ci netreba aj:
- functions test
- Playwright
- manual smoke

### Rule 4
Nerob dizajnove zmeny ako nahodny override chaos. Ak sa opakuje pattern, oprav shared vrstvu.

## 6. Common high-risk areas

Najnebezpecnejsie oblasti v tomto projekte su:
- auth hydration a redirecty
- service worker a asset version mismatch
- public snapshot consistency
- booking/history token flows
- email CTA logic
- admin calendar gesture a quick-action spravanie
- employee service assignment governance
- compliance retention side effects

## 7. Frontend coding expectations

Drz sa tychto zasad:
- route logic nechaj v route-level page alebo explicitnom hooku
- reusable UI davat do `components/`
- one-off business utility davat do `lib/`
- Firebase-specific fetch/write spravanie nech je v integration vrstve alebo v dobre pomenovanom hooku
- neplet do jedneho komponentu UI, routing, backend side effects aj analytics, ak sa to da rozumne oddelit

## 8. Backend coding expectations

Vo Functions casti drz:
- explicitne validacie vstupov
- jasne fail-safe spravanie
- fallbacky len tam, kde su premyslene
- ziadne tiche swallowing critical errors bez logiky
- idempotentny alebo aspon kontrolovatelny mutation pattern tam, kde hrozi retry

Pri HTTP a callable flows rozmyslaj:
- kto to vola
- co sa stane pri retry
- co sa stane pri stale tokene
- co sa stane pri role mismatchi

## 9. Data integrity expectations

Nikdy nerob zmenu bez rozmyslu nad tymto:
- ci sa nezmeni business scope query
- ci sa nerozbije booking history access
- ci stale sedi `memberships` model
- ci sa nezmeni relationship medzi employee, services a appointments
- ci snapshot rebuild stale odzrkadli produkcne data spravne

## 10. Testing expectations per change type

### UI-only polish
- relevant Vitest slice
- build
- pripadne preview-safe smoke

### Booking/auth logic
- full Vitest relevantnej oblasti
- functions tests, ak sa meni backend flow
- preview-safe Playwright
- authenticated E2E, ked sa meni protected flow

### Admin/calendar/employees
- Vitest
- build
- authenticated E2E alebo targeted smoke

### Email/compliance
- functions tests
- build
- manual runtime verification, ak sa meni endpoint alebo realny delivery flow

## 11. How to read the project as an evaluator

Ak si technicky hodnotitel, najskor si otvor v tomto poradi:
1. `README.md`
2. `docs/ARCHITECTURE.md`
3. `docs/TESTING-QUALITY.md`
4. `docs/OPERATIONS.md`
5. `functions/src/index.ts`
6. `src/App.tsx`
7. `firestore.rules`

To ti ukaze, ci je to len pekna fronta, alebo skutocne fungujuci system.

## 12. Good signals in this codebase

- product uz ma admin/public separation
- booking mutation flows nie su len priame client writes
- test maturity je vyssia nez pri beznom small-business side projecte
- docs, CI a release discipline uz nie su uplne zanedbane
- compliance a retention uz maju aspon zaklad v runtime, nie len v texte

## 13. Remaining realities and debt

Poctivo:
- nie vsetko je este platformovo generalizovane
- cast env modelu a deploy discipline stale odraza historiu iterativneho rastu
- full multi-tenant SaaS abstraction este nie je hotova
- plny admin audit trail este nie je kompletny

## 14. What a strong next engineer should do next

Ak ma niekto pokracovat po nas, najlepsie dalsie technicke smery su:
- dokoncit broader admin audit trail
- dorovnat service worker update safety a browser version mismatch story
- produktizovat tenant provisioning, ak sa ide do SaaS smeru
- posilnit deeper integration testing na compliance a offline edge cases

Tento dokument nema predstierat, ze je projekt bez chyb. Ma pomoct novemu developerovi vstupit do systemu bez zbytocneho chaosu.

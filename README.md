# PAPI HAIR DESIGN Platform

PAPI HAIR DESIGN Platform je produkcne nasadena booking a salon operations aplikacia postavena na Firebase. Dnes funguje ako silny single-brand salon system pre verejny booking, interny admin, recepciu, emailove notifikacie, kalendarove flows a role-based prevadzku timu.

Nie je to marketingova maketa. Je to realny operacny system pre salon s booking flowom, admin modulmi, emailovou vrstvou, audit vrstvou, testovacou pipeline a release procesom. Zaroven je architektonicky dost cisty na to, aby sa vedel posunut do SaaS smeru, ale realisticky este nie je hotovy ako plne self-serve multi-tenant SaaS.

## Co tento projekt realne robi dnes

### Public/customer vrstva
- landing page a brand presentation
- verejny booking flow na `/booking`
- customer auth a account linking na `/auth` a `/my-account`
- booking history access cez tokenizovane customer odkazy
- email confirmation, cancellation a registration flows
- Google Calendar a `.ics` export pre potvrdene rezervacie
- PWA install flow a offline page

### Internal salon vrstva
- owner/admin dashboard
- denny, tyzdenny a mesacny kalendar
- appointments management
- customers management
- employees management vratane `Iba vybrane sluzby`
- services a service subcategories
- settings, SMTP, booking policy, snapshot rebuild
- reception mode
- employee self-view cez `/admin/my`

### Platform/ops vrstva
- Firebase Auth + Firestore + Cloud Functions
- role-based access cez memberships
- public snapshot model pre rychly booking read path
- SMTP routing s fallbackom do `firestore-send-email`
- consent logging, retention cleanup, appointment audit
- preview-safe a authenticated Playwright suites
- GitHub Actions CI + manual test matrix workflow

## Aktualny realisticky status

Toto je dnes:
- production-ready salon platform pre jednu znacku a jednu prevadzkovu identitu
- solidny vertical product foundation
- testovany Firebase-first system s admin/public separaciou

Toto to dnes este nie je:
- plne multi-tenant SaaS s provisioningom novych klientov na 1 klik
- white-label platforma s tenant billingom, tenant onboardingom a tenant izolaciou na enterprise urovni
- kompletny ISO-ready governance shell s formalizovanou governance vrstvou

Inymi slovami: zaklad pre SaaS tu je, ale treba ho produktizovat, nie len prehlasit za SaaS.

## Kto ma co citat

### Developer alebo technicky collaborator
- [Documentation Hub](docs/README.md)
- [Developer Handbook](docs/DEVELOPER-HANDBOOK.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Operations](docs/OPERATIONS.md)
- [Testing & Quality](docs/TESTING-QUALITY.md)

### Technical reviewer, hiring reviewer alebo due diligence partner
- [Technical Due Diligence Brief](docs/TECHNICAL-DUE-DILIGENCE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Testing & Quality](docs/TESTING-QUALITY.md)
- [Security & Compliance Baseline](docs/SECURITY-COMPLIANCE.md)

### Produktovy alebo buyer-side pohlad
- [Product & SaaS Direction](docs/PRODUCT-SAAS.md)
- [Technical Due Diligence Brief](docs/TECHNICAL-DUE-DILIGENCE.md)
- [Owner Manual](OWNERMANUAL.md)

## Dokumentacna mapa

Canonical docs pre aktualny stav:
- [Documentation Hub](docs/README.md)
- [Project State and Handoff](docs/PROJECT-STATE.md)
- [Developer Handbook](docs/DEVELOPER-HANDBOOK.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Operations](docs/OPERATIONS.md)
- [Testing & Quality](docs/TESTING-QUALITY.md)
- [Security & Compliance Baseline](docs/SECURITY-COMPLIANCE.md)
- [Product & SaaS Direction](docs/PRODUCT-SAAS.md)
- [Asset Inventory](docs/ASSET-INVENTORY.md)
- [Technical Due Diligence Brief](docs/TECHNICAL-DUE-DILIGENCE.md)
- [Owner Manual](OWNERMANUAL.md)
- [Backlog / TODO](TODO.md)

Tactical docs, ktore ostavaju platne, ale nie su hlavny source of truth:
- `docs/DEVELOPMENT-SETUP.md`
- `docs/E2E-TESTING.md`
- `docs/ANALYTICS.md`
- `docs/ROLLBACK-RUNBOOK.md`
- `docs/POST-RELEASE-SMOKE-CHECKLIST.md`
- `docs/MONITORING-24H-CHECKLIST.md`

## Stack v skratke

### Frontend
- React 18
- Vite 7
- TypeScript
- React Router 6
- Tailwind CSS + Radix UI
- TanStack Query
- Framer Motion
- i18next
- vite-plugin-pwa

### Backend a infra
- Firebase Hosting
- Firebase Auth
- Firestore
- Cloud Functions for Firebase
- Firebase Storage
- Firestore Send Email extension
- Sentry
- Google Analytics (consent-aware)

### Quality a delivery
- Vitest
- Playwright
- ESLint
- GitHub Actions
- manual test matrix workflow

## Hlavne route skupiny

### Public routes
- `/`
- `/booking`
- `/my-account`
- `/auth`
- `/pricing`
- `/privacy`
- `/terms`

### Protected staff routes
- `/admin/calendar`
- `/admin/appointments`
- `/admin/employees`
- `/admin/customers`
- `/admin/settings`
- `/admin/my`
- `/reception`

## Lokalny start

### Predpoklady
- Node.js 22
- npm
- Firebase CLI

### Setup
```bash
npm ci
cd functions && npm ci && cd ..
cp .env.example .env
npm run dev
```

App standardne bezi na:
- `http://localhost:5678`

Ak treba, setup helper:
```bash
npm run setup
```

## Zakladne quality commandy

```bash
npm run lint
npm run typecheck
npm run test
npm --prefix functions test
npm run build
npm run test:e2e:preview
```

Authenticated E2E len s pripravenymi env/secrets:
```bash
npm run test:e2e:authenticated
```

## Deploy model

### Hosting
```bash
firebase deploy --only hosting
```

### Jednotlive functions alebo cieleny deploy
```bash
firebase deploy --only functions:confirmBooking
firebase deploy --only functions:createPublicBooking
firebase deploy --only functions:cleanupComplianceData
```

### Poznamka k full deployu
Projekt pouziva radsej cielene deploye, pretoze produkcia moze obsahovat starsie remote funkcie, ktore uz nie su v source code. To je operational caveat, nie chyba dokumentacie.

## Security a compliance baseline
- role-based access cez `memberships`
- Firestore rules rozdelene medzi public, customer a staff use-cases
- cookie consent je analytics-first opt-in, nie marketing slop
- retention cleanup existuje pre vybrane compliance kolekcie
- appointment status audit existuje, ale plny admin audit trail este nie je kompletne dotiahnuty

## Preco to ma zmysel aj ako buduca platforma

Tento projekt sa da dnes uprimne predavat ako:
- silny booking a salon operations system pre jednu znacku
- managed platform pre premium salon prevadzku
- vertical foundation, ktoru sa oplati dalej produktizovat

Ak sa ma posunut do skutocneho SaaS, dalsie klucove kroky su:
- tenant provisioning
- tenant-specific config isolation
- billing a plan management
- silnejsi audit trail
- tenant-aware support a reporting
- rollout model pre viac prevadzok bez manualneho bootstrapu

Viac detailov je v [docs/PRODUCT-SAAS.md](docs/PRODUCT-SAAS.md).

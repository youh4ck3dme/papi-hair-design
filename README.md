# PAPI HAIR DESIGN – Booking System

Moderný rezervačný systém pre salóny krásy. React 18 PWA + Firebase backend.

> **Repo:** https://github.com/youh4ck3dme/papi-hair-design
> **Deploy authority:** Firebase Hosting (GitHub Actions)
> **Produkčná doména (primary):** https://booking.papihairdesign.sk
> **Fallback URL:** https://hairchainger-main-876665-176e8.web.app

---

## CURRENT STATUS (2026-03-11)

Aktualny produkcny stav, hotove bloky a dalsie kroky:

- [docs/GRANDE-FINALE-STATUS-2026-03-11.md](./docs/GRANDE-FINALE-STATUS-2026-03-11.md)
- [docs/ANALYTICS.md](./docs/ANALYTICS.md)
- [docs/FIREBASE-DEPLOYMENT-AUTHORITY.md](./docs/FIREBASE-DEPLOYMENT-AUTHORITY.md)
- [OWNERMANUAL.md](./OWNERMANUAL.md)

`TODO.md` je historicky diagnosticky dokument a nie je uz primarny operativny plan.

---

## Obsah

- [Current Status](#current-status-2026-03-11)
- [Architektúra](#architektúra)
- [Rýchly štart](#rýchly-štart)
- [Premenné prostredia](#premenné-prostredia)
- [GitHub Secrets – povinné nastaviť](#github-secrets--povinné-nastaviť)
- [Firebase Deploy Secrets](#firebase-deploy-secrets)
- [Stránky a routy](#stránky-a-routy)
- [Firebase Cloud Functions](#firebase-cloud-functions)
- [Offline podpora](#offline-podpora)
- [Testy](#testy)
- [Deploy](#deploy)
- [Otváracie hodiny](#otváracie-hodiny)
- [AI Handoff Notes](#-ai-handoff-notes)

---

## Poznamka k starsim dokumentom

- `TODO.md` a cast starsich continuation dokumentov su archivny vstup z predchadzajucich auditov.
- Aktualna operativa je v `docs/GRANDE-FINALE-STATUS-2026-03-11.md`.

---

## Architektúra

```
React 18 + Vite 7 + TypeScript
├── shadcn/ui + Tailwind CSS 3.4   — UI komponenty
├── TanStack React Query           — Server state management
├── Dexie.js (IndexedDB)           — Offline-first lokálna DB
├── vite-plugin-pwa (Workbox)      — PWA + service worker
└── Firebase (100% backend)
    ├── Firestore                  — NoSQL databáza (real-time)
    ├── Firebase Auth              — Autentifikácia (Email / Google)
    └── Cloud Functions            — Business logika, emaily, sync
```

> Backend a runtime vrstva bežia cez Firebase.

### Tok dát

```
Zákazník → /booking → createPublicBooking (Cloud Fn) → Firestore → email
                                                              ↓
Admin    ← /admin/calendar ←────────────────────── real-time listener
```

---

## Rýchly štart

### Požiadavky

- **Node.js 20.19+ alebo 22.x** (Vite 7)
- `npm` (nie yarn ani pnpm)

```sh
node -v   # musí byť 20.19+ alebo 22+
```

### Inštalácia a spustenie

```sh
# Naklonuj repo
git clone https://github.com/youh4ck3dme/papi-hair-design.git
cd papi-hair-design

# Závislosti
npm install

# Skopíruj env šablónu a vyplň Firebase hodnoty
cp .env.example .env
# → uprav .env (pozri sekciu Premenné prostredia)

# Vývojový server
npm run dev
# → http://localhost:5678
```

### Všetky príkazy

| Príkaz | Popis |
|--------|-------|
| `npm run dev` | Vývojový server s HMR (port 5678) |
| `npm run build` | Produkčný build → `dist/` |
| `npm run preview` | Statický náhľad `dist/` (port 4173) |
| `npm run typecheck` | TypeScript kontrola |
| `npm run lint` | ESLint |
| `npm run test` | Vitest – jednorazový beh |
| `npm run test:watch` | Vitest – sledovací mód |
| `npm run test:coverage` | Testy + coverage report |

---

## Premenné prostredia

Skopíruj `.env.example` → `.env` a vyplň hodnoty z Firebase Console:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXX
VITE_FIREBASE_FUNCTIONS_REGION=europe-west1
```

Hodnoty nájdeš v:
**Firebase Console** → ⚙️ Project Settings → Your apps → Web app → `firebaseConfig`

---

## GitHub Secrets – povinné nastaviť

> **Kde:** https://github.com/youh4ck3dme/papi-hair-design/settings/secrets/actions → **New repository secret**

Bez týchto secrets CI build vždy failuje:

| Secret | Popis |
|--------|-------|
| `VITE_FIREBASE_API_KEY` | Firebase `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | napr. `hairchainger-main-876665-176e8.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | napr. `hairchainger-main-876665-176e8` |
| `VITE_FIREBASE_STORAGE_BUCKET` | napr. `hairchainger-main-876665-176e8.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | získate z Firebase Console |
| `VITE_FIREBASE_APP_ID` | získate z Firebase Console |
| `VITE_FIREBASE_MEASUREMENT_ID` | napr. `G-WKF7CKN6MN` |
| `FIREBASE_SERVICE_ACCOUNT_HAIRCHAINGER_MAIN_876665_176E8` | JSON service account pre deploy workflows |
| `VITE_FIREBASE_FUNCTIONS_REGION` | napr. `europe-west1` (voliteľné pre build/test) |

---

## Firebase Deploy Secrets

Používa sa iba Firebase deploy chain (`.github/workflows/deploy-hosting.yml`, `.github/workflows/firebase-hosting-preview.yml`, `.github/workflows/deploy-functions.yml`).

Dodatočné odporúčané secrets pre backend notifikácie:

| Premenná | Hodnota |
|----------|---------|
| `TWILIO_ACCOUNT_SID` | SID projektu na SMS |
| `TWILIO_AUTH_TOKEN` | Auth token z Twilio Console |
| `TWILIO_FROM_NUMBER` | Odosielateľ, napr. `+421900000000` |
| `ADMIN_NOTIFICATION_EMAIL` | E-mail pre admin notifikácie nových rezervácií |

---

## Stránky a routy

| Route | Popis | Prístup |
|-------|-------|---------|
| `/booking` | Rezervačný formulár pre zákazníkov | Verejná |
| `/papihairsalon2026` | Admin prihlásenie | Skrytá (nie linkovaná) |
| `/admin` | Admin dashboard | Len `owner` / `admin` |
| `/admin/calendar` | Kalendár rezervácií | Len `owner` / `admin` |
| `/admin/appointments` | Zoznam rezervácií | Len `owner` / `admin` |
| `/admin/employees` | Správa zamestnancov | Len `owner` / `admin` |
| `/admin/services` | Správa služieb | Len `owner` / `admin` |
| `/admin/settings` | Otváracie hodiny, SMTP | Len `owner` |
| `/reception` | Recepčný mód | Len `employee+` |

---

## Firebase Cloud Functions

Nasadené v regióne `europe-west1`:

| Funkcia | Popis |
|---------|-------|
| `createPublicBooking` | Vytvorenie rezervácie (zákazník) |
| `claimBooking` | Priradenie rezervácie k zamestnancovi |
| `listBookableProviders` | Zoznam dostupných zamestnancov |
| `saveSmtpConfig` | Uloženie SMTP nastavení (šifrované) |
| `syncOfflineData` | Synchronizácia offline dát |
| `consentEvent` | GDPR súhlas audit trail |

### Deploy funkcií

```sh
cd functions
npm install
npm run build
firebase deploy --only functions
```

---

## Offline podpora

```
Online  ──▶  Firebase Firestore (real-time)
               ↕  optimistic updates + sync
Offline ──▶  IndexedDB (Dexie)
               ├── appointments  (lokálna kópia)
               ├── queue         (čakajúce akcie)
               └── meta          (čas posledného syncu)
```

Offline sync logika: `src/lib/offline/sync.ts`

---

## Testy

```sh
npm run test              # Vitest – jednorazový beh
npm run test:watch        # sledovací mód
npm run test:coverage     # + coverage report
npm run typecheck         # TypeScript bez buildu
npm run lint              # ESLint
```

### Testovacie príkazy (Firebase & E2E)

Použite tieto príkazy na lokálne testovanie s emulátorom:

**1. Spustenie Firestore emulátora**
```bash
firebase emulators:start --only firestore --project demo-test --import=./emulator-data --export-on-exit=./emulator-data
```

**2. Spustenie testov Cloud Functions**
```bash
# Windows (PowerShell/CMD)
set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 && cd functions && npm test
```

**3. Spustenie komplexných E2E testov (Playwright)**
```bash
# Predpokladá spustený 'npm run dev' na porte 5678
$env:PLAYWRIGHT_BASE_URL="http://localhost:5678"; npx playwright test e2e/calendar-comprehensive.spec.ts --reporter=list
```

Framework: **Vitest** + `@testing-library/react` + `jsdom`

---

## Deploy

### Automatický (GitHub Actions → Firebase Hosting)

- PR na `main` → automatický Firebase Hosting preview channel (`Firebase Hosting PR Preview` workflow)
- Push do `main` → automatický live deploy (`Firebase Hosting Live Deploy` workflow)
- Zmeny vo `functions/**` na `main` → deploy funkcií + firestore (`Firebase Functions Deploy` workflow)

### Manuálny

```sh
npm run build
firebase hosting:channel:deploy preview-manual --project hairchainger-main-876665-176e8
firebase deploy --only hosting --project hairchainger-main-876665-176e8
```

### Pripojenie vlastnej domény `booking.papihairdesign.sk`

1. Firebase Console → Hosting → **Add custom domain** → `booking.papihairdesign.sk`
2. Firebase ukáže DNS záznamy
3. Nastaviť u registrátora (Websupport) podľa Firebase inštrukcie
4. Počkať na propagáciu (5–30 min)

---

## Otváracie hodiny

Uložené v Firestore (kolekcia `businesses`, dokument prevádzky).
Zmena: admin panel → `/admin/settings` → Pracovné hodiny.

| Deň | Stav | Čas |
|-----|------|-----|
| Pondelok – Piatok | Otvorené | 08:00 – 17:00 |
| Sobota | Podľa objednávok | 08:00 – 17:00 |
| Nedeľa | Zatvorené | — |

---

## Štruktúra projektu

```
papi-hair-design/
├── src/
│   ├── pages/                    # Stránky (BookingPage, CalendarPage...)
│   ├── components/               # UI komponenty
│   ├── contexts/AuthContext.tsx  # Firebase Auth context
│   ├── hooks/                    # useAvailability, useBookingForm...
│   ├── integrations/firebase/    # Firestore klient, hooks
│   └── lib/offline/sync.ts       # Offline sync logika
├── functions/src/                # Firebase Cloud Functions (TypeScript)
├── functions/lib/                # Skompilované Cloud Functions (JS)
├── docs/                         # Dokumentácia
├── e2e/                          # Playwright E2E testy
├── scripts/                      # check-env, budget-check, lockin-check
├── public/                       # Statické assety, PWA ikony
├── firebase.json                 # Firebase Hosting + Functions config
├── firestore.rules               # Firestore bezpečnostné pravidlá
├── firestore.indexes.json        # Firestore indexy
├── vite.config.ts                # Vite + PWA
└── .env.example                  # Šablóna env premenných
```

---

## Bezpečnosť

- **Firestore Rules** – každá kolekcia zabezpečená, dáta izolované podľa `business_id`
- **Multi-tenant** – každá prevádzka vidí iba svoje dáta
- **Role-based access** – 4 roly: `owner › admin › employee › customer`
- **Firebase Auth** – Email + Google prihlásenie
- **Zod validácia** – vstupy validované na FE aj v Cloud Functions

---

## Licencia

Proprietary – © EB-EU s.r.o. Všetky práva vyhradené.

---

## 🤖 AI Handoff Notes

**For continuation by AI agents:**

This project has been comprehensively audited and a repair blueprint created.

### Key Artifacts
- **`TODO.md`** – 12 action items, prioritized, with code examples
- **`docs/CURRENT_PROJECT_STATE.md`** – Project state snapshot
- **Diagnostic Report** – 7.2/10 score, 4 critical blockers

### Before Continuing
1. Read `TODO.md` fully (it's the source of truth)
2. Check "Status:" field in each section
3. Start with 🔴 CRITICAL items
4. Run validation checklist before launch

### Testing Commands
```bash
npm run lint                 # Code quality
npm run typecheck            # TypeScript check
npm run test:coverage        # Unit tests + coverage
npm run test:responsive      # E2E testy (responzivita)
npm run test:admin           # E2E testy (admin kalendár)
$env:PLAYWRIGHT_BASE_URL="http://localhost:5678"; npx playwright test e2e/calendar-comprehensive.spec.ts --reporter=list # Komplexný test
npm run build               # Production build
npm run preview             # Test prod build locally
```

### Critical Files to Review
- `firestore.rules` – Security (excellent)
- `functions/src/*.ts` – Cloud Functions (needs rate limiting)
- `src/components/ProtectedRoute.tsx` – Role authorization (has bypass)
- `src/pages/admin/*.tsx` – Admin pages (need query limits)
- `.env` & `.env.local` – ❌ Remove from git (in TODO.md)

### Deployment Workflow
1. Fix critical issues in TODO.md
2. Run validation checklist
3. `npm run build && firebase deploy` (all services)
4. Test in Firebase Hosting preview channel
5. Merge to main for auto-production deploy

---

### Questions?
- Architecture: See `docs/ARCHITECTURE.md`
- Setup: See `docs/DEVELOPMENT-SETUP.md`
- Firebase migration: See `docs/MIGRATION-FIREBASE.md`
- Troubleshooting: See `docs/` folder (10+ guides)

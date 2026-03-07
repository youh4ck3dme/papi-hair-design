# PAPI HAIR DESIGN – Booking System

Moderný rezervačný systém pre salóny krásy. React 18 PWA + Firebase backend.

> **Repo:** https://github.com/youh4ck3dme/papi-hair-design
> **Vercel:** https://vercel.com/yyys-projects-639e38fd/papi-hair-design
> **Produkcia:** https://papi-hair-design.vercel.app
> **Vlastná doména:** `booking.papihairdesign.sk` ⚠️ zatiaľ nepripojená

---

## Obsah

- [Architektúra](#architektúra)
- [Rýchly štart](#rýchly-štart)
- [Premenné prostredia](#premenné-prostredia)
- [GitHub Secrets – povinné nastaviť](#github-secrets--povinné-nastaviť)
- [Vercel env premenné](#vercel-env-premenné)
- [Stránky a routy](#stránky-a-routy)
- [Firebase Cloud Functions](#firebase-cloud-functions)
- [Offline podpora](#offline-podpora)
- [Testy](#testy)
- [Deploy](#deploy)
- [Otváracie hodiny](#otváracie-hodiny)

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

> Supabase bol kompletne odstránený (PR #1). Všetok backend bežia cez Firebase.

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
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXX
VITE_FIREBASE_FUNCTIONS_URL=https://europe-west1-your-project-id.cloudfunctions.net
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
| `VITE_FIREBASE_FUNCTIONS_URL` | napr. `https://europe-west1-hairchainger-main-876665-176e8.cloudfunctions.net` |

Voliteľné (CI krok preskočí ak chýbajú):

| Secret | Popis |
|--------|-------|
| `SENTRY_AUTH_TOKEN` | Sentry → Settings → Auth Tokens |
| `SENTRY_ORG` | slug Sentry organizácie |
| `SENTRY_PROJECT` | slug Sentry projektu |

---

## Vercel env premenné

> **Kde:** https://vercel.com/yyys-projects-639e38fd/papi-hair-design/settings/environment-variables

Nastav rovnaké Firebase hodnoty ako GitHub Secrets plus:

| Premenná | Hodnota |
|----------|---------|
| `VITE_FIREBASE_API_KEY` | rovnaká hodnota |
| `VITE_FIREBASE_AUTH_DOMAIN` | rovnaká hodnota |
| `VITE_FIREBASE_PROJECT_ID` | rovnaká hodnota |
| `VITE_FIREBASE_STORAGE_BUCKET` | rovnaká hodnota |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | rovnaká hodnota |
| `VITE_FIREBASE_APP_ID` | rovnaká hodnota |
| `VITE_FIREBASE_MEASUREMENT_ID` | rovnaká hodnota |
| `VITE_FIREBASE_FUNCTIONS_URL` | rovnaká hodnota |

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

Framework: **Vitest** + `@testing-library/react` + `jsdom`

---

## Deploy

### Automatický (GitHub → Vercel)

Každý push na `main` → automatický deploy na Vercel.
**Podmienka:** GitHub Secrets musia byť nastavené (pozri sekciu vyššie).

### Manuálny

```sh
npm run build
npx vercel --prod
```

### Pripojenie vlastnej domény `booking.papihairdesign.sk`

1. Vercel Dashboard → projekt → **Domains** → pridať `booking.papihairdesign.sk`
2. Vercel ukáže DNS záznamy
3. Nastaviť u registrátora (Websupport): `CNAME → cname.vercel-dns.com`
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
├── vite.config.ts                # Vite + PWA + Sentry
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

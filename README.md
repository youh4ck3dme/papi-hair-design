# PAPI HAIR DESIGN – Booking System

Firebase-first rezervačný systém pre salón.
Frontend beží na React + Vite, backend na Firebase Auth/Firestore/Functions.

## Source Of Truth

Aktuálne prevádzkové dokumenty:
- `README.md` (tento súbor)
- `docs/DEVELOPMENT-SETUP.md`
- `docs/GRANDE-FINALE-STATUS-2026-03-11.md` (release snapshot)
- `docs/E2E-TESTING.md`

Historické a migračné materiály sú v `docs/archive/2026-04-cleanup/`.

## Runtime Moduly

- `src/` – frontend aplikácia (React 18 + Vite + TypeScript)
- `functions/` – Firebase Cloud Functions (TypeScript)
- `e2e/` – Playwright E2E testy
- `scripts/` – pomocné build/test/deploy utility

## Aktívne Entrypointy

- `npm run dev` → Vite dev server na `http://localhost:5678`
- `npm run build` → produkčný build do `dist/`
- `firebase.json`:
  - hosting `public: dist`
  - functions `source: functions`
- `functions/src/index.ts` → export Firebase callable/trigger funkcií

## Architektúra (Aktuálny Stav)

### Primárny backend
- Firebase Auth
- Firestore
- Firebase Cloud Functions (`europe-west1`)

### Frontend
- React 18 + React Router 6
- TanStack Query
- PWA (`vite-plugin-pwa`)

### Runtime backend
- Booking/Admin/Billing runtime je Firebase.

## Rýchly Lokálny Setup

1. Požiadavky:
   - Node.js `>=20.19.0` (odporúčané 22.x)
   - npm

2. Inštalácia:

```bash
npm ci
cd functions && npm ci && cd ..
```

3. Env:

```bash
cp .env.example .env
```

Vyplň minimálne Firebase hodnoty:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_FIREBASE_FUNCTIONS_REGION` (default `europe-west1`)

4. Spustenie:

```bash
npm run dev
```

## Jeden Správny Dev Flow

1. `npm ci`
2. `cd functions && npm ci && cd ..`
3. `npm run lint`
4. `npm run typecheck`
5. `npm run test`
6. `npm run build`
7. `npm run dev`

## Testovanie a Validácia

Root projekt:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Functions:

```bash
cd functions
npm test
```

E2E:

```bash
npm run test:responsive
```

## Deploy

Primárny deploy target je Firebase:

```bash
firebase deploy --only functions,hosting
```

## Poznámky k bezpečnosti

- `.env` nikdy necommitovať.
- Service account kľúče nepatria do klienta ani do repozitára.
- Firestore/Storage pravidlá meniť iba s testom a review.

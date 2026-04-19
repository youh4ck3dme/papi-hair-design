# Development Setup (Firebase-first)

Tento dokument popisuje jediný podporovaný lokálny flow pre tento repozitár.

## Požiadavky

- Node.js `>=20.19.0` (odporúčané 22.x)
- npm
- Firebase CLI (pre emulátory/deploy)

Overenie:

```powershell
node -v
npm -v
firebase --version
```

## Prvotný Setup

V koreňovom adresári projektu:

```powershell
npm ci
cd functions
npm ci
cd ..
Copy-Item .env.example .env
```

Následne doplň `.env` minimálne o Firebase premenné:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_FIREBASE_FUNCTIONS_REGION` (`europe-west1`)

## Denný Dev Flow

1. Aktualizácia závislostí (po pull):

```powershell
npm ci
cd functions
npm ci
cd ..
```

2. Kvalita a build gate:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

3. Lokálny vývoj:

```powershell
npm run dev
```

Aplikácia: `http://localhost:5678`

## Firebase Emulátory (voliteľné)

```powershell
firebase emulators:start --project demo-test
```

## Functions testy

```powershell
cd functions
npm test
```

## E2E testy

```powershell
npm run test:responsive
```

## Dôležité obmedzenia

- Nepoužívaj mix package managerov (npm + pnpm) v jednom clone.
- Booking/Admin runtime je Firebase-first.
- Jediný podporovaný backend je Firebase (Auth, Firestore, Functions, Storage).

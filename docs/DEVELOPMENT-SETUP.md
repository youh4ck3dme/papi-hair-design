# Príprava prostredia a vývoj – Nimble Agenda

Aktuálny repo setup je `npm`-only. Produkčný runtime je Firebase-only. Tento dokument popisuje iba aktuálne podporovanú cestu.

## Požiadavky

- Node.js `20.19.0+`
- npm `10+`
- Git

## Rýchly setup

```powershell
git clone https://github.com/EB-EU-s-r-o/nimble-agenda.git
cd nimble-agenda
npm run setup
```

`npm run setup`:
- overí verziu Node.js,
- nainštaluje závislosti pre root app, `functions/` a `booking-papihairdesign-sk/`,
- vytvorí `.env` z `.env.example`, ak ešte neexistuje.

## Povinné prostredie

Vyplň aspoň tieto Firebase klientské premenné v `.env`:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_FIREBASE_FUNCTIONS_URL=
```

Voliteľné:

```env
VITE_RECAPTCHA_SITE_KEY=
VITE_SENTRY_DSN=
VITE_SENTRY_ENABLE_DEV=false
SENTRY_AUTH_TOKEN=
```

## Lokálny vývoj

Root app:

```powershell
npm run dev
```

Root app je dostupná na `http://localhost:5678`.

Firebase Functions build:

```powershell
npm --prefix functions run build
```

Nested Next app:

```powershell
npm --prefix booking-papihairdesign-sk run dev
```

## Overenie pred PR

Root app:

```powershell
npm run verify
```

Celý workspace:

```powershell
npm run verify:workspace
```

`verify:workspace` spúšťa:
- root lint,
- root typecheck,
- root unit tests,
- root build,
- Firebase Functions build,
- nested app lint,
- nested app build.

## Bežné problémy

### Chýbajúce binárky (`eslint`, `tsc`, `vitest`, `esbuild`)

Typický root cause je poškodený alebo prerušovaný install. Na Windows sa to často stane po prerušení `npm install` alebo po zamknutom `node.exe`.

Odporúčaný postup:

```powershell
Remove-Item -Recurse -Force node_modules
npm ci
```

Ak problém ostáva, ukonči visiace Node procesy a zopakuj install. Rovnaký postup platí aj pre `functions/` a `booking-papihairdesign-sk/`.

### Build zlyhá na chýbajúcich env premenných

Root build používa Firebase klientské premenné. Skontroluj `.env` alebo CI secrets. Lokálne build kontrola chýbajúce premenné blokuje; v CI len varuje.

### E2E testy

Playwright existuje, ale live E2E je závislé od funkčného Firebase prostredia a E2E credentialov. Bez nich sa nedá poctivo tvrdiť end-to-end korektnosť admin flow.

## Súvisiace dokumenty

- [README.md](../README.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [AUTH-BOOKING-DOMAIN.md](AUTH-BOOKING-DOMAIN.md)

# E2E a Release Gate (Firebase-first)

Jedna pravda pre testovanie a CI gate v tomto repozitári.

Poznamka:
- tento dokument je tactical E2E doplnok
- canonical quality obraz je v [Testing & Quality](TESTING-QUALITY.md)
- release a deploy kontext je v [Operations](OPERATIONS.md)

## Release Gate Poradie

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run test:coverage`
5. `npm run lockin:check`
6. `npm run build`
7. `npm run budget`
8. `npm run test:e2e:preview`

## Backend Realita

Primárny runtime backend:
- Firebase Auth
- Firestore
- Firebase Cloud Functions

Booking flow používa Firebase callable funkcie (`createPublicBooking`, `confirmBooking`, `syncOfflineData`, ...).

Billing flow používa Firebase Functions endpointy.

## E2E Stabilita

- Preferuj `data-testid` pre kritické flow kroky.
- Po akcii vždy čakaj na konkrétny cieľový stav (`expect(...).toBeVisible()`).
- Testy drž izolované (bez závislosti na stave predchádzajúceho testu).
- Na CI používaj retry + trace (`playwright.config.ts`).

## Kľúčové Príkazy

```bash
npm run test:e2e:preview
npm run test:responsive:preview
npm run test:e2e:authenticated
```

## Súvisiace súbory

- `e2e/playwright.config.ts`
- `e2e/playwright.config.preview.ts`
- `scripts/budget-check.mjs`
- `scripts/lockin-check.mjs`
- `.github/workflows/ci.yml`

# Grande Finale Status (2026-03-11)

Tento dokument je aktualny operativny stav projektu po poslednych produkcnych deployoch.
Pouzivajte ho ako hlavny zdroj pravdy pre dalsie kroky.

## Produkcia

- Primary: `https://booking.papihairdesign.sk`
- Firebase hosting: `https://hairchainger-main-876665-176e8.web.app`
- Project ID: `hairchainger-main-876665-176e8`

## Co je hotove

1. Booking flow stabilizovany (`booking.spec.ts` green).
2. Admin calendar flow stabilizovany (`admin-calendar.spec.ts` green).
3. Firestore indexy nasadene (`firestore.indexes.json` deploynute).
4. Firestore rules hardening:
   - `employee_services` upravy iba pre ownera.
   - `service_mode` na employee je owner-governed.
5. Owner-configurovatelny model sluzieb zamestnanca:
   - `all` (default, otvoreny rezim),
   - `restricted` (len vybrane sluzby).
6. Booking success UX:
   - registrovany user uz nevidi tlacidlo "Dokonci registraciu".
7. Accessibility cleanup:
   - doplneny `DialogTitle`/`DialogDescription` pre command dialog.
8. Google Search Console:
   - HTML meta verification je v `<head>`,
   - verification file je dostupny na oboch domenach.
9. Google Analytics:
   - `gtag.js` snippet je v `<head>`,
   - CSP je upravene pre GA endpointy,
   - consent update je naviazany na cookie preferences.

## Stav 90/60 planu (realny progress)

- Pack 0 (baseline alignment): `100%`
- Pack 1 (auth/security spine): `~85%`
- Pack 2 (booking spine): `~85%`
- Pack 3 (payments/Stripe): `defer` (vedome odlozene)
- Pack 4 (snapshot spine): `~70%`
- Pack 5 (ops/release hardening): `~60%`

Poznamka: Percenta su operacny odhad podla aktualneho kodu a nasadenia, nie marketingove KPI.

## Co ostava do release close

1. Finalny release tag + release notes.
2. Spustit rollback preparedness podla runbooku:
   - `docs/ROLLBACK-RUNBOOK.md`
3. Spustit manualny smoke po deployi:
   - `docs/POST-RELEASE-SMOKE-CHECKLIST.md`
4. Spustit 24h monitoring po release:
   - `docs/MONITORING-24H-CHECKLIST.md`

## Rychly verification bundle

```bash
npm run lint
npm run typecheck
cd functions && npm test
cd ..
npx playwright test e2e/admin-calendar.spec.ts --reporter=line --workers=1
npx playwright test e2e/booking.spec.ts --reporter=line --workers=1
firebase deploy --only firestore:indexes,firestore:rules --project hairchainger-main-876665-176e8
firebase deploy --only hosting --project hairchainger-main-876665-176e8
```

## Poznamka k starsim dokumentom

Niektore starsie dokumenty (`TODO.md`, cast `README.md`, starsie architecture docs) obsahuju historicke body zo starsich faz projektu.
Pri dalsom pokracovani sa riadte primarne tymto dokumentom a aktualnym kodom v `main`.

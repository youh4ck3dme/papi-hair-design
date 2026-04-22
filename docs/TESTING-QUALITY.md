# Testing and Quality

## 1. Quality strategy

Projekt nepouziva jednu testovaciu vrstvu ako alibi. Kombinuje:
- unit tests
- integration-like Vitest coverage
- functions tests
- Playwright preview-safe E2E
- gated authenticated mutation E2E
- manual smoke a release checklists

Ciel nie je mat pekne cislo coverage. Ciel je mat dokaz, ze kriticke flows drzia.

## 2. Test layers

### Frontend unit and integration-style tests
Bezia cez Vitest.

Typicky kryju:
- komponenty
- hooks
- route logic
- auth state spravanie
- booking logic
- admin screens
- SEO, consent a calendar export helpery

Spustenie:
```bash
npm run test
```

Coverage report-only run:
```bash
npm run test:coverage
```

### Firebase Functions tests
Bezia samostatne vo `functions/`.

Typicky kryju:
- booking mutation rules
- email queue logic
- calendar invite logic
- retention logic

Spustenie:
```bash
npm --prefix functions test
```

### Preview-safe Playwright suite
Tato vrstva je urcena pre scenare, ktore sa daju odbehnut bez nebezpecnych realnych mutacii alebo bez specialnych credentials.

Spustenie:
```bash
npm run test:e2e:preview
```

### Authenticated mutation Playwright suite
Tato vrstva je gated a sluzi pre realnejsie owner/admin scenare.

Typicky kryje:
- booking mutation flows
- admin calendar flows
- admin smoke scenare
- admin mutation scenare

Spustenie:
```bash
npm run test:e2e:authenticated
```

Potrebuje secrets/env:
- `PLAYWRIGHT_ADMIN_EMAIL`
- `PLAYWRIGHT_ADMIN_PASSWORD`
- `PLAYWRIGHT_FIREBASE_API_KEY`
- gating flags pre konkretne specy

## 3. CI enforcement

Hlavny workflow je `.github/workflows/ci.yml`.

Dnes enforceuje:
- Lint & Test
- Build
- E2E (Playwright Full Suite)
- E2E (Authenticated Mutations)
- Merge Readiness

To je dolezite, lebo maturity gap uz nie je len v unit testoch, ale aj v tom, ci su kriticke e2e flowy skutocne required pre merge.

### What CI really guarantees
- syntax, lint a type safety baseline
- frontend a functions test signal
- buildability
- preview-safe browser regression signal
- authenticated mutation signal, ked su dostupne potrebne secrets

## 4. Manual Test Matrix workflow

Manualny workflow `.github/workflows/test-matrix.yml` je prakticka QA vrstva pre pripady, ked nechces spustat vsetko naraz.

Vie spustit po castiach:
- lint + typecheck + full Vitest
- functions tests
- build
- Playwright preview-safe
- Playwright authenticated

To je lepsie nez jeden monoliticky megajob, lebo QA sa da pustat cielene.

## 4.1 Recommended use of the manual matrix

Pouzi ho najma ked:
- potrebujes rerun len jednu vrstvu bez celeho CI
- overujes riskantnu zmenu pred deployom
- chces delegovat QA kolegovi bez lokalneho setupu
- chces rychlo rozlisit, ci je problem vo Viteste, Functions alebo Playwrighte

## 5. Local commands cheat sheet

```bash
npm run lint
npm run typecheck
npm run test
npm --prefix functions test
npm run build
npm run test:e2e:preview
npm run test:e2e:authenticated
npm run test:booking-mobile-live
npm run test:admin-employees-live
npm run test:calendar-mobile-live
```

## 6. What the current test strategy does well

Silne stranky dnes:
- booking flow uz nie je pokryty len unit vrstvou
- admin ma read-only aj mutation smoke coverage
- CI uz enforceuje aj Playwright vrstvu
- functions vrstva ma vlastne testy a nespoleha sa len na frontend signal
- documentation a quality commands su uz sucast release discipline

## 6.1 Current maturity balance

Realisticky pomer dnes:
- unit a integration-like vrstva je najsilnejsia
- functions vrstva je slusna a uz nie je zanedbana
- E2E vrstva je vyrazne silnejsia nez historicky, ale stale je drahsia a uzsia nez unit vrstva
- manual smoke ma stale svoje miesto pri release, hlavne pre email, service worker a visual polish

## 7. What the current strategy still does not solve completely

Stale otvorene alebo len ciastocne pokryte oblasti:
- vizualne regresie na urovni plneho screenshot approval workflowu
- dlhodobe service worker upgrade scenare medzi verziami
- complex offline/PWA edge cases
- sirsi compliance-focused integration testing
- deep multi-actor concurrent booking races pod emulator loadom

## 8. Snapshot policy

Projekt by sa mal vyhybat snapshot abuse.

Pravidla:
- snapshot pouzit len tam, kde dava zmysel ako stabilny visual baseline
- nepouzivat snapshot ako nahradu za explicitne tvrdenie o spravani
- preferovat behavior assertions pred slepym HTML dump compare

## 9. Mocking policy

Mocky su potrebne, ale nemaju zakryvat realne produktove rizika.

Zdravy pattern:
- unit vrstva moze mockovat integration boundaries
- integration-like tests maju overit spravanie medzi modulmi
- E2E ma odhalit, co mocky nevidia

Ak sa chyba objavi len v browseri alebo live flowe, treba pridat signal aj do E2E alebo integration vrstvy, nie len do unit testu.

## 10. Recommended quality gates for significant changes

### Frontend-only polish
- lint
- typecheck
- relevant Vitest slices
- build
- pripadne preview-safe smoke

### Booking or auth change
- lint
- typecheck
- full Vitest batch
- functions tests, ak sa meni backend side booking logic
- preview-safe Playwright
- authenticated E2E, ak sa meni protected flow

### Admin mutation or calendar change
- full Vitest batch
- build
- authenticated Playwright
- targeted live smoke

### Email / compliance / retention change
- functions tests
- build
- targeted live validation, ak sa meni runtime endpoint alebo email content

## 10.1 Edge cases that deserve extra respect

Najzradnejsie oblasti, kde treba doplnit test signal skor nez neskoro:
- auth hydration a IAB login spravanie
- service worker update mismatch medzi verziami
- long press a mobile gesture flows v admin kalendari
- booking history token flows
- email CTA fallback logic
- compliance retention a scheduler side effects

## 11. Maturity verdict

Projekt uz nie je v stave, kde testy existuju len dekorativne.

Realisticky stav dnes:
- unit vrstva je silna
- functions vrstva je solidna
- E2E vrstva je uz serioznejsia nez predtym
- CI enforcement je vyrazne lepsi

Ale stale plati:
- kvalita nie je hotova navzdy
- pri kazdom novom vysokorizikovom flowe treba doplnit signal tam, kde chyba: unit, integration, e2e alebo live smoke

# Operations

## 1. Purpose

Tento dokument je prevadzkovy source of truth pre lokalny vyvoj, build, deploy, rollback, release safety a production hygiene.

## 2. Runtime environments

### Local development
- frontend: `localhost:5678`
- mozny emulator flow pre Firestore a Functions
- env values idu z `.env`

### GitHub CI
- lint, typecheck, vitest, functions tests, build a Playwright suite
- citlive hodnoty idu zo GitHub secrets

### Production
- hosting na Firebase Hosting
- backend na Cloud Functions for Firebase
- data na Firestore
- produkcna domena: `https://booking.papihairdesign.sk`

### Vercel preview layer
- repo je zaroven napojene na Vercel preview deploymenty
- aktualne existuju dva Vercel projekty pre to iste GitHub repo:
  - `papi-hair-design`
  - `papi-hair-design-69td`
- oba maju `productionBranch = main`, takze push na feature branch nespusta automaticky production promote
- Vercel je tu treba chapat ako preview and PR diagnostics vrstvu, nie ako canonical production release path
- stale plati, ze owner s pristupom do Vercel dashboardu vie manualne spravit promote, preto je vhodne drzat iba jeden preview source of truth

## 3. Local setup

### Prvy start
```bash
npm ci
cd functions && npm ci && cd ..
cp .env.example .env
npm run dev
```

### Uzitocne commandy
```bash
npm run lint
npm run typecheck
npm run test
npm --prefix functions test
npm run build
npm run test:e2e:preview
```

### Setup helper
Ak je treba bootstrap local workstation:
```bash
npm run setup
```

## 4. Environment model

### Frontend envs
Najdolezitejsie skupiny v `.env.example`:
- Firebase public config
- App Check config
- feature toggles
- salon quick-switch emails pre local QA
- optional billing placeholders
- historical or experimental local tooling envy, ktore nemaju byt zamienane za core production runtime

### Backend envs and secrets
Functions spoliehaju na:
- Firebase project runtime
- SMTP config
- Twilio config, ak je aktivny
- Sentry DSN
- pripadne dalsie tajne hodnoty ulozene cez Firebase alebo Google Cloud secret management

### Important rule
Dokumentacia a kod nesmu predstierat envy, ktore produkcia realne nema. Ak je nejaka feature behind env toggle, treba to priznat aj v docs.

## 5. Deploy model

### Hosting-only deploy
Pouzi, ked menis iba frontend alebo staticke assety:
```bash
firebase deploy --only hosting
```

### Specific function deploy
Pouzi, ked menis maly backend scope:
```bash
firebase deploy --only functions:confirmBooking
firebase deploy --only functions:createPublicBooking
firebase deploy --only functions:cleanupComplianceData
```

### Full functions deploy
Teoreticky:
```bash
firebase deploy --only functions
```

Prakticky caveat:
- projekt momentalne preferuje cielene deploye
- dovod je operational safety a existencia starsich remote functions, ktore uz nemusia byt v source tree

## 6. GitHub workflow map

### Required by CI
- `.github/workflows/ci.yml`
  - `Lint & Test`
  - `Build`
  - `E2E (Playwright Full Suite)`
  - `E2E (Authenticated Mutations)`
  - `Merge Readiness`

### Manual operator workflow
- `.github/workflows/test-matrix.yml`
  - selective run pre lint, unit, functions, build, preview-safe Playwright a authenticated Playwright

### Deployment workflows
- `.github/workflows/deploy-hosting.yml`
- `.github/workflows/deploy-functions.yml`

### Static analysis
- `.github/workflows/codeql.yml`

## 7. Release checklist

Pred release:
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm --prefix functions test`
- `npm run build`
- relevantny Playwright scope

Po release:
- homepage smoke
- booking smoke
- auth smoke
- admin smoke
- email CTA smoke, ak sa menila email vrstva
- service worker sanity check

## 8. Service worker and rollout safety

Pri kazdom release si daj pozor na:
- asset version mismatch
- stale HTML shell vs novy JS bundle
- service worker update behavior
- offline cache s nekompatibilnou verziou appky

Prakticke pravidla:
- nespoliehat sa na hard refresh ritual
- drzat hashovane assety a kontrolovany update flow
- po vacsom release spravit browser smoke aj na uz otvorenom klientovi
- pri rizikovom release zvazit staged overenie cez owner/admin smoke skor, nez sa release bude povazovat za hotovy
- pri Vercel preview projektoch neplietť preview health so skutocnym Firebase production deploy stavom

## 9. Monitoring and observability

Aktualny operational baseline:
- Sentry pre runtime chyby
- GitHub Actions pre CI signal
- manual smoke skripty pre production kriticke toky
- budget check pre dist size
- consent a audit data logovanie pre vybrane oblasti

Dolezite:
- monitoring nie je len o error countoch
- po vacsom deployi treba pozerat aj business-critical flows: booking, auth, admin mutations, email delivery

## 10. Rollback strategy

Najrychlejsi rollback pattern zalezi od scope:

### Frontend-only problem
- redeploy posledneho stabilneho buildu
- ak treba, vratit commit a pushnut fix branch

### Specific function problem
- redeploy konkretnu function na posledny stabilny source state
- nepanikarit full deployom, ak je problem izolovany

### Product rule problem
- najprv zastavit sirit dalsie zmeny
- spravit smoke na kritickych flowoch
- az potom rollout hotfixu

## 11. Compliance operations

Runtime compliance baseline dnes obsahuje:
- analytics consent gating
- consent event logging
- retention cleanup pre vybrane compliance kolekcie
- appointment status audit

Co este treba brat vazne:
- booking and customer master data retention sa nesmie menit bez business rozhodnutia
- sirsi admin audit trail je dalsi logicky krok
- Sentry legal basis a wording musi ostat zosuladene s privacy textom

## 12. Canary and staged rollout mindset

Projekt zatial nema formalny canary deploy system ako velke SaaS platformy, ale bezpecna disciplina vie mat podobny efekt:
- najprv preview and CI
- potom targeted deploy
- potom owner/admin smoke
- az potom release komunikovat ako hotovy

Pri vysokorizikovych zmenach je lepsie postupne overenie nez one-shot sebavedomie.

## 13. Known operational caveats

- full `firebase deploy --only functions` nemusi byt vzdy najlepsia prva volba
- authenticated Playwright suite je gated envmi a secrets
- production smoke pre admin flowy potrebuje owner/admin credentials
- PWA layer vyzaduje po release opatrnost, nie len build green status

## 14. Recommended release discipline

Najzdravsi release rytmus je:
1. local quality gates
2. CI green
3. targeted deploy
4. production smoke
5. az potom release povazovat za hotovy

Tento projekt uz je dost velky na to, aby release hygiene bola sucast produktu, nie vedlajsi detail.

# Firebase Deployment Authority Runbook

Tento runbook nastavuje Firebase Hosting ako jediný autoritatívny deploy chain pre repository.

## 1) GitHub Branch Protection Changes (main)

Použite GitHub UI:
- `Settings` → `Branches` → `Branch protection rules` (alebo `Rulesets`) → pravidlo pre `main`.

Nastavenia:
- `Require a pull request before merging`: ON
- `Require status checks to pass before merging`: ON
- `Require branches to be up to date before merging`: ON

Required checks:
- `CI / Lint & Test`
- `CI / Build`
- `CI / E2E (Playwright)`
- `Firebase Hosting PR Preview / Build and deploy preview channel`

Odstrániť z Required checks:
- `Vercel – papi-hair-design`
- `Vercel – papi-hair-design-69td`

Poznámka:
- Na private repo bez GitHub Pro/Team môže byť branch protection/rulesets obmedzené.
- Ak UI nepovolí required checks, používajte merge gate proces cez PR template + manuálny smoke gate nižšie.

## 2) Firebase Hosting Workflow Files

Autoritatívne workflow súbory:
- `.github/workflows/firebase-hosting-preview.yml`
- `.github/workflows/deploy-hosting.yml`
- `.github/workflows/deploy-functions.yml`

### Preview behavior
- Trigger: `pull_request` na `main` (opened/synchronize/reopened/closed)
- Build: `npm ci` + `npm run build`
- Deploy: `FirebaseExtended/action-hosting-deploy@v0` na preview channel
- PR comment s preview URL vytvára GitHub bot

### Live behavior
- Trigger: push do `main` (+ `workflow_dispatch`)
- Build: `npm ci` + `npm run build`
- Deploy: `FirebaseExtended/action-hosting-deploy@v0` s `channelId: live`

### Functions behavior
- Trigger: push do `main` pri zmenách vo `functions/**` alebo firestore rules/indexes
- Build/test funkcií
- Deploy: `firebase deploy --only functions,firestore`

## 3) Secrets / Env Requirements

GitHub Actions repository secrets (`Settings` → `Secrets and variables` → `Actions`):

Required (frontend build + deploy):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `FIREBASE_SERVICE_ACCOUNT_HAIRCHAINGER_MAIN_876665_176E8` (raw JSON service account)

Recommended:
- `VITE_FIREBASE_FUNCTIONS_REGION`

Optional backend notification secrets:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `ADMIN_NOTIFICATION_EMAIL`

Service account scope (minimum):
- Firebase Hosting Admin
- Cloud Functions Admin
- Cloud Datastore User (alebo rola pokrývajúca Firestore deploy)
- Service Account User

## 4) Final Smoke Gate Checklist

Pred merge:
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] PR preview workflow je green
- [ ] Preview URL otvorená a vizuálne overená (`/booking`, `/auth`, `/admin/calendar` login flow bez regressions)
- [ ] Bez nových critical console errors

Po merge (main):
- [ ] Live deploy workflow green
- [ ] Produkcia odpovedá (`https://booking.papihairdesign.sk/`)
- [ ] Smoke pass:
  - [ ] `/booking`
  - [ ] `/auth`
  - [ ] `/admin/services`
  - [ ] `/admin/settings`
  - [ ] `/admin/calendar`
  - [ ] `/admin/my`

## 5) Rollout Plan (Minimal Risk)

1. Commit workflow/config/docs zmeny do branchu.
2. Prvý test PR:
   - potvrdiť, že sa vytvorí Firebase preview URL.
3. Nastaviť/overiť Branch Protection required checks podľa sekcie 1.
4. Urobiť test merge do `main` mimo peak hodín.
5. Overiť live deploy + smoke gate.
6. Voliteľné cleanup:
   - odpojiť Vercel GitHub integration, alebo minimálne vypnúť Vercel checks v merge gate.
7. Stabilizačné okno:
   - 24h sledovať deploy históriu a alerty; rollback path: `firebase hosting:rollback`.

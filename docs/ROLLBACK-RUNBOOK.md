# Rollback Runbook (Firebase Hosting + Firestore Rules/Indexes)

Datum: 2026-03-11  
Projekt: `hairchainger-main-876665-176e8`

Tento runbook je urceny pre rychly a bezpecny rollback pri regresii po release.

## 1. Kedy rollbackovat

Rollback spustit, ak nastane aspon jedna z podmienok:

1. booking flow je nefunkcny v produkcii (`/booking` neprejde end-to-end),
2. admin flow je nefunkcny (`/admin/calendar` kriticky fail),
3. po release narastie chybovost na kritickych endpointoch a blokuje prevadzku.

## 2. Minimalny rollback (kodovy revert + redeploy)

Pouzi posledny stabilny commit hash (pred regresiou), nasledne redeploy.

```bash
git checkout main
git pull

# 1) vytvor rollback branch z posledneho stabilneho commitu
git checkout -b codex/rollback-<YYYYMMDD-HHMM> <STABLE_COMMIT_HASH>

# 2) build + deploy hosting
npm run build
firebase deploy --only hosting --project hairchainger-main-876665-176e8

# 3) deploy firestore policy layer (ak sa rollback tyka rules/indexov)
firebase deploy --only firestore:rules,firestore:indexes --project hairchainger-main-876665-176e8
```

## 3. Commity pouzite ako stabilne body (referencne)

Podla priebehu releasu:

- `37ff803` – GA/GSC + consent-aware analytics
- `585da4b` – authz/booking hardening
- `261f2a6` – app check warning cleanup + local export ignore

Ak regresia vznikla po tychto zmenach, rollback ciel nastav na posledny potvrdeny stabilny commit.

## 4. Smoke test po rollbacku

Po rollbacku okamzite over:

1. `GET /booking` vracia `200`,
2. rezervacia sa da dokoncit (manualny smoke),
3. `admin/calendar` sa nacita bez blocker chyby,
4. settings ulozenie funguje pre owner rolu.

## 5. Incident log

Po kazdom rollbacku zapis:

1. cas incidentu,
2. commit, na ktory sa rollbackovalo,
3. symptom (presna chyba),
4. potvrdenie smoke testu po rollbacku,
5. plan naslednej opravy.


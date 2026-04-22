# 24h Monitoring Checklist (Post-release)

Datum: 2026-03-11  
Projekt: `hairchainger-main-876665-176e8`

Tento checklist pokryva prvych 24 hodin po release.

Poznamka:
- toto je post-release monitoring doplnok
- sirsia operational logika je v [Operations](OPERATIONS.md)

## 1. Casove checkpointy

Skontroluj produkciu v tychto bodoch:

1. T+15 min
2. T+1h
3. T+4h
4. T+12h
5. T+24h

## 2. Cloud Functions health

1. `firebase functions:log --project hairchainger-main-876665-176e8 -n 100`
2. Sleduj najma:
   - `syncOfflineData`,
   - `createPublicBooking`,
   - `createBookingHold`,
   - `confirmBooking`,
   - `cleanupExpiredHolds`.
3. Gate:
   - ziadne opakovane 5xx stack traces,
   - ziadne `FAILED_PRECONDITION` na missing index.

## 3. Firestore signal

1. Over, ze nevyskakuju nove index links v browser konzole.
2. Over, ze booking/admin query bezia pod 1-2 sekundy pri beznom flow.
3. Ak je index error:
   - dopln index do `firestore.indexes.json`,
   - deployni `firestore:indexes`,
   - zapis incident do changelogu.

## 4. User-facing signal

1. Over min. 1 realny booking flow za checkpoint.
2. Over admin create/edit flow v kalendari.
3. Over save v settings (otvaracie hodiny + global settings).

## 5. Exit criteria po 24h

Release sa povazuje za stabilizovany, ak:

1. nebol potrebny rollback,
2. nie su otvorene P0/P1 incidenty,
3. booking/admin smoke je stale green.

Ak exit criteria nie su splnene, otvor hotfix branch a postupuj podla [Rollback Runbook](ROLLBACK-RUNBOOK.md).

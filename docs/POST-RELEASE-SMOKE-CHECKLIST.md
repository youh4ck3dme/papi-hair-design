# Post-release Smoke Checklist (10-15 min)

Datum: 2026-03-11  
Projekt: `hairchainger-main-876665-176e8`

Tento checklist spustite okamzite po deployi na produkciu.

Poznamka:
- toto je rychly tactical checklist
- sirsi release model je v [Operations](OPERATIONS.md)

## 1. Public booking smoke

1. Otvor `https://booking.papihairdesign.sk/booking`.
2. Vyber kategoriu sluzby (Damske/Panske), over expand/collapse.
3. Vyber sluzbu, zamestnanca a volny termin.
4. Dokonci rezervaciu:
   - neprihlaseny user: skontroluj registracny krok,
   - prihlaseny user: skontroluj, ze sa nezobrazi CTA "Dokonci registraciu".
5. Over uspesnu obrazovku a zapis rezervacie v admine.

## 2. Admin smoke

1. Prihlas sa ako owner (`/auth` -> `/admin`).
2. Otvor `/admin/calendar`:
   - musi sa nacitat bez index erroru,
   - klik na konkretny cas musi otvorit modal s korektnym datumom/casom.
3. Vytvor test rezervaciu z adminu a over zobrazenie v kalendari.
4. Otvor `/admin/settings`:
   - uloz zmenu otvaracich hodin,
   - uloz zmenu globalnych nastaveni.

## 3. Employee/service mode smoke

1. Otvor `/admin/employees`.
2. Pri jednom zamestnancovi nastav `service_mode=restricted`.
3. Prirad 1-2 sluzby a uloz.
4. Na booking stranke over, ze zamestnanec ponuka iba tieto sluzby.
5. Prepni naspat na `service_mode=all` a over, ze znovu vidi vsetky sluzby.

## 4. SEO/analytics sanity

1. Over `view-source` na root:
   - je pritomny GSC meta verification,
   - je pritomny `gtag.js` snippet.
2. Cookie consent:
   - reject => analytics storage denied,
   - accept => analytics storage granted.

## 5. Log severity gate (pass/fail)

Release sa povazuje za uspesny iba ak:

1. nevyskytne sa blocker (`P0`) v booking/admin flow,
2. neobjavi sa nova kriticka 5xx chyba v cloud functions,
3. Firestore query nehlasi missing index pre produkcne use-case.

Ak niektory bod zlyha, postupuj podla [Rollback Runbook](ROLLBACK-RUNBOOK.md).

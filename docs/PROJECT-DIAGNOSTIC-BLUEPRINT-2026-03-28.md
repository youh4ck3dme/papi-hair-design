# Project Diagnostic & Blueprint (2026-03-28)

Tento dokument je aktualny technicky audit projektu `PAPI HAIR DESIGN BOOKING`.
Je urceny ako jeden spolocny operativny plan od diagnostiky cez opravy az po finalny Firebase deploy.

## 1. Executive Summary

Projekt je funkcny salonny booking system postaveny na:

- React 18 + TypeScript + Vite 7
- Tailwind + shadcn/ui
- Firebase Auth + Firestore + Functions + Hosting + Storage
- PWA cez `vite-plugin-pwa`

Aktualny technicky stav je dobry, ale nie uplne release-clean.
Jadro aplikacie drzi, build a testy prechadzaju, no existuju oblasti, ktore treba dotiahnut pred finalnym ulozenim a produkcnym release close.

## 2. What Was Verified

Nasledujuce kontroly boli spustene a prebehli uspesne:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `node ./node_modules/vitest/vitest.mjs run src/pages/admin/__tests__/CalendarPage.test.tsx src/components/booking-calendar/BookingCalendar.test.tsx src/pages/admin/__tests__/AppointmentsPage.test.tsx src/pages/BootstrapPage.test.tsx`
- `npm --prefix functions test`

Vysledok:

- frontend lint: green
- frontend typecheck: green
- production build: green
- frontend kriticke testy: `78 passed`
- functions testy: `11 passed`, `1 skipped`

## 3. Architecture Snapshot

### Frontend

- Verejna cast:
  - `/` -> luxury homepage / landing
  - `/booking` -> booking flow
  - `/papihairsalon2026` -> salon/team login gate
- Admin cast:
  - `/admin`
  - `/admin/calendar`
  - `/admin/appointments`
  - `/admin/employees`
  - `/admin/services`
  - `/admin/customers`
  - `/admin/settings`
  - `/admin/my`
  - `/bootstrap`

### Backend

- Firebase project: `hairchainger-main-876665-176e8`
- Hosting z `dist/`
- Firestore rules + indexes su zapojene vo `firebase.json`
- Functions su v `functions/src`, buildia sa do `functions/lib`

### Functions coverage

Repo obsahuje okrem booking jadra aj:

- `createPublicBooking`
- `createBookingHold`
- `confirmBooking`
- `claimBooking`
- `adminUpdateBookingStatus`
- `adminCalendarQuickAction`
- `bootstrapAdminAccess`
- `normalizeMemberships`
- `saveSmtpConfig`
- `sendSms`
- `syncEmployeePhotoFromProfile`
- dalsie podpornne utility a guards

## 4. Current Strengths

### 4.1 Build and test health

Zakladny technicky spine projektu je stabilny:

- FE build prejde
- FE lint prejde
- TS typy su konzistentne
- admin calendar a appointments maju test coverage
- functions maju samostatnu test vrstvu

### 4.2 Firebase operational setup

- `firebase.json` ma nastavene:
  - Firestore rules
  - Firestore indexes
  - Functions predeploy build
  - Hosting security headers
  - SPA rewrite na `index.html`
- `storage.cors.json` uz existuje
- `firestore.indexes.json` uz obsahuje kriticke kombinacie pre `appointments` aj `time_blocks`

### 4.3 Admin calendar spine

Admin kalendar uz ma:

- role-aware loading
- quick actions
- CSV / print export
- search header ("lupa")
- month density prepinač
- testy na calendar shell a booking interactions

## 5. Main Risks and Gaps

## 5.1 Homepage / public presentation layer is not release-finished

Homepage je funkcna, ale vizualne a layoutovo este nie je finalne uzamknuta.

Pozorovane rizika:

- responsivita bola nedavno rozbita a opravovana
- layout logika sa prepina medzi mobile a desktop-like rezimom
- stale je to citliva oblast na viewport/zoom/safe-area spravanie
- cast verejnej landing vrstvy je viac technicky funkcna nez finalne premiovo stabilna

Dopad:

- najvacsie riziko pre prezentaciu majitelovi
- najvacsie riziko pre regressions po dalsich UI zasahoch

## 5.2 Documentation drift

Dokumentacia nie je plne zosynchronizovana s aktualnym kodom.

Priklady:

- `README.md` hovori, ze `/admin/settings` je len pre `owner`, ale aktualny routing pusta `owner`, `admin`, `employee`
- README oznacuje `TODO.md` ako historicky dokument, ale realne `todo.md` je aktualny operativny zoznam promptov
- `docs/GRANDE-FINALE-STATUS-2026-03-11.md` je starsi operativny snapshot a treba ho brat opatrne oproti aktualnemu kodu

Dopad:

- vysoky pri handoffe
- stredny pri release a supporte

## 5.3 Workspace / repo hygiene is weak

V workspace su pritomne:

- `dist/`
- `coverage/`
- `test-results/`
- `e2e-results/`
- mnozstvo `.png` screenshotov
- debug a output logy

To neznamena automaticky, ze vsetko je commitnute, ale release hygiene nie je cista.

Dopad:

- zhorseny prehlad
- vacsie riziko nechceneho commitu artefaktov
- horsi finalny release snapshot

## 5.4 Git workflow on this machine is fragile

V shelli nebol dostupny `git` executable cez PATH, hoci repo `.git` existuje a HEAD ukazuje na branch:

- `codex/firebaseostraverzia95`

Dopad:

- lokalne release prikazy zavisle od `git` mozu na tomto stroji zlyhat
- `package.json` obsahuje script `sync`, ktory pouziva `git`, no v tomto prostredi to nemusi byt spolahlive

Pred finalnym ulozenim treba toto explicitne overit.

## 5.5 PWA / service worker cache risk in dev and QA

Projekt generuje PWA assets a service worker.
To je dobre pre produkciu, ale pri rychlych UI zmenach to vie v dev/preview sposobovat:

- stale bundle
- zdanlivo "neopravene" UI
- nejasne smoke test vysledky

Toto uz bolo prakticky pozorovane pri homepage diagnostike.

## 5.6 Storage and browser-blocking concerns are only partially closed

Kod obsahuje hardening pre:

- `ERR_BLOCKED_BY_CLIENT`
- blocked Firestore cleanup requesty
- avatar upload error mapping

To je plus, ale realne produkcne uzavretie vyzaduje este:

- potvrdit realny Storage bucket
- potvrdit aplikovany CORS na bucket
- urobit manualny smoke na avatar upload
- preverit bootstrap/login flow bez adblock kolizii

## 5.7 Test coverage is good in critical places, but not full-system complete

Silne pokrytie:

- calendar
- appointments
- bootstrap
- booking-calendar
- functions unit tests

Slabsie alebo neuzavrete:

- full end-to-end release smoke
- homepage presentation flow
- salon login real-device smoke
- avatar upload end-to-end smoke
- final Firebase hosting smoke po deployi

## 6. Operational Readiness Verdict

### Verdikt

Projekt je:

- technicky funkcny
- buildable
- testovatelny
- nasaditelny

Ale este nie je v stave "blind deploy and forget".

Najsilnejsie oblasti:

- build/tooling
- admin calendar spine
- appointments spine
- functions spine
- firebase configuration skeleton

Najslabsie oblasti:

- homepage / responsive presentation polish
- dokumentacna konzistencia
- release hygiene a workspace cleanup
- finalny smoke pred deployom

## 7. One Blueprint to Finish the Project

Toto je odporucane jedine poradie prace.
Ciel: minimalizovat regresie a dostat projekt do cisteho release stavu.

### Phase 1 — Freeze and Clean Baseline

1. Zastavit dalsie "ad hoc" vizualne zasahy.
2. Urobit release hygiene audit:
   - rozlisit zdrojaky vs generated artefakty
   - upratat screenshoty, logy, build outputs, coverage outputs
   - skontrolovat `.gitignore`
3. Overit, ze lokalny git workflow na stroji realne funguje.
4. Zapisat finalny branch strategy:
   - pracovna branch
   - merge branch
   - release target

Exit criteria:

- cisty workspace plan
- potvrdene git prikazy
- ziadne nejasne artefakty pred commitom

### Phase 2 — Public UX Stabilization

Zamer:

- homepage
- salon/team entry page
- booking entry UX

Ulohy:

1. Finalne stabilizovat homepage layout na:
   - mobile
   - tablet
   - desktop
2. Zamknut viewport spravanie bez horizontal overflow.
3. Dokoncit "static vs live" audit verejnej casti:
   - otvaracie hodiny
   - kontakt
   - ceny
   - booking CTA
4. Skontrolovat PWA/cache spravanie pri aktualizacii UI.

Exit criteria:

- homepage je konzistentna na 3 viewport triedach
- ziadne stale layout regressie pri resize
- ziadne stale stale-cache symptomy pri QA

### Phase 3 — Booking Flow Close

Zamer:

- klientsky booking flow

Ulohy:

1. Overit flow:
   - vyber sluzby
   - vyber kadernika
   - dostupne sloty
   - odoslanie rezervacie
2. Dotiahnut mobilny booking UX:
   - menej scrollu
   - jasne poradie krokov
   - citatelne CTA
3. Manualne overit Firestore zapis + email/sms navaznosti tam, kde su aktivne.

Exit criteria:

- zakaznik vie bez trenia vytvorit rezervaciu na mobile aj desktop
- vsetky booking kroky su citatelne a jednoznacne

### Phase 4 — Admin Spine Close

Zamer:

- `/admin`
- `/admin/calendar`
- `/admin/appointments`
- `/admin/settings`
- `/papihairsalon2026`
- `/bootstrap`

Ulohy:

1. Calendar final smoke:
   - search/lupa
   - den/tyzden/mesiac
   - export
   - slot klik
   - quick actions
2. Appointments final smoke:
   - owner/admin scope
   - employee-only scope
   - status transitions
   - detail modal
3. Settings final smoke:
   - business save
   - avatar upload
   - SMTP save
4. Login/bootstrap smoke:
   - owner
   - employee
   - blocked-by-client friendly behavior

Exit criteria:

- admin core je funkcne uzavrety
- role based spravanie sedi
- settings a uploady su realne overene

### Phase 5 — Firebase Configuration Close

Zamer:

- config, security, infra correctness

Ulohy:

1. Potvrdit env hodnoty:
   - auth
   - firestore
   - storage bucket
   - functions region
   - analytics/app check podla potreby
2. Potvrdit Storage CORS:
   - localhost
   - LAN IP
   - production domain
   - fallback host
3. Potvrdit Firestore indexes a rules.
4. Potvrdit functions build + test + deployment readiness.

Exit criteria:

- ziadny znamy config blocker
- bucket/CORS/rules/indexes su zosuladene s aktualnym kodom

### Phase 6 — Documentation and Owner Handoff Close

Ulohy:

1. Zosynchronizovat:
   - `README.md`
   - `OWNERMANUAL.md`
   - aktualny release status dokument
2. Vyhodit alebo oznacit zastarane casti dokumentacie.
3. Pripravit jeden final owner/admin handoff dokument:
   - kde co bezi
   - ako sa prihlasit
   - ako spravit basic support ukony
   - co robit po deployi

Exit criteria:

- dokumentacia neprotireci kodu
- majitel a tim maju realne pouzitelny navod

### Phase 7 — Final Validation Gate

Povinne pred deployom:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- vybrana sada frontend vitestov
- `npm --prefix functions test`
- manualny smoke:
  - homepage
  - booking
  - team login
  - admin calendar
  - appointments
  - settings/avatar

Ak nieco z toho failne, deploy sa odklada a opravuje sa root cause.

### Phase 8 — Save, Tag, Deploy

Az po ukonceni predchadzajucich faz:

1. Urobit finalny cleanup commit.
2. Pushnut na cielovu branch.
3. Ak je merge policy, mergnut do release/main branch.
4. Nasadit v tomto poradi:
   - `firebase deploy --only firestore:indexes,firestore:rules`
   - `firebase deploy --only functions`
   - `npm run build`
   - `firebase deploy --only hosting`
5. Spravit post-deploy smoke na:
   - `https://booking.papihairdesign.sk`
   - fallback Firebase hosting URL

Exit criteria:

- deployment je potvrdeny
- smoke je green
- release snapshot je zapisany

## 8. Recommended Execution Order

Ak to chceme urobit co najefektivnejsie, poradie je:

1. Phase 1 — Freeze and Clean Baseline
2. Phase 2 — Public UX Stabilization
3. Phase 4 — Admin Spine Close
4. Phase 3 — Booking Flow Close
5. Phase 5 — Firebase Configuration Close
6. Phase 6 — Documentation and Owner Handoff Close
7. Phase 7 — Final Validation Gate
8. Phase 8 — Save, Tag, Deploy

Poznamka:
Booking a admin sa daju ciastocne robit paralelne, ale finalne validacie musia byt centralizovane.

## 9. Immediate Next Step

Ak chceme postupovat bez chaosu, dalsi krok ma byt:

- urobit `Phase 1 — Freeze and Clean Baseline`

To znamena:

- potvrdit aktualny working tree
- urcit co ostava v repozitari a co je len lokalny artefakt
- pripravit cisty release baseline

Bez toho je kazda dalsia oprava riskantnejsia a horsie sa potom robi finalny deploy.

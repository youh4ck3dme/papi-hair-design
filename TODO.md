# TODO

## Aktuálna priorita projektu
### Dokončiť pred monetizáciou
1. [x] Doriešiť `SonarCloud Code Analysis` blocker na `PR #44`
   - stav: security hotspots boli reviewed v SonarCloud a quality gate prešiel
2. [x] Potvrdiť finálnu merge readiness všetkých PR checkov
   - stav: `PR #44` bol úspešne zmergeovaný do `otvarackapril2026`
3. [x] Upratať `Firebase-first` vs `Vercel` governance chaos v repozitári
4. [x] Dokončiť release safety cleanup okolo Vercel preview vrstvy
   - stav: duplicitný projekt `papi-hair-design-69td` bol zmazaný
   - stav: ponechaný projekt `papi-hair-design` má `gitProviderOptions.createDeployments = disabled`
   - stav: Firebase ostáva jediný canonical production deploy path
5. [x] Dorobiť posledný veľký `premium states & feedback` polish pass a live smoke

### Post-merge safety
1. [x] Resetnúť lokálnu `otvarackapril2026` na presný stav `origin/otvarackapril2026`
   - stav: lokálna base vetva je po reset-e čistá a syncnutá s merge commitom `5a83bbb`
2. [x] Vytvoriť safety backup branch pred resetom lokálnej base vetvy
   - branch: `codex/backup-otvarackapril2026-pre-reset-2026-04-23`
3. [x] Zatiaľ nemaž feature ani backup branch
   - ponechať pre istotu:
     - `codex/otvarackapril2026-email-polish`
     - `codex/backup-otvarackapril2026-pre-reset-2026-04-23`
   - cleanup riešiť až po ďalšom stabilizačnom kole

### Až potom riešiť
1. [ ] Tenant-readiness audit
2. [ ] Demo tenant
3. [ ] Outreach / validation sprint
4. [ ] Monetizácia / Stripe

## Legacy TypeScript cleanup
1. [x] Pridať `strict: true` do `functions/tsconfig.json`
2. [x] Pridať `forceConsistentCasingInFileNames: true` do `functions/tsconfig.json`
3. [x] Overiť kompiláciu: `cd functions && npm run build`
4. [ ] Reštart TS server vo VSCode
5. [ ] Overiť zmiznutie chýb

## Release safety
1. [x] Overiť, či nehrozí nechcený production promote vo Vercel prepojení
   - zistenie: feature branch `codex/*` ide na Verceli do `preview`, nie automaticky do `production`
   - zistenie: oba Vercel projekty majú `productionBranch = main`
   - update: ponechaný projekt `papi-hair-design` má po cleanup-e `gitProviderOptions.createDeployments = disabled`, takže nové Git pushy už nespúšťajú automatické Vercel deploye
   - caveat: staré historické `vercel.app` aliasy môžu stále existovať pre už vytvorené deploye, ale nie sú canonical production path
2. [x] Upratať duplicitné Vercel preview projekty pre `youh4ck3dme/papi-hair-design`
   - zmazaný projekt: `papi-hair-design-69td`
   - ponechaný projekt: `papi-hair-design`
3. [x] Rozhodnúť, ktorý Vercel projekt má zostať ako preview-only source of truth
   - rozhodnutie: ponechať `papi-hair-design` ako manuálny diagnostics shell
   - dôvod: čistejší názov a menší operational surface po zmazaní duplikátu
   - hardening: automatic Git deploymenty sú vypnuté
4. [x] Po cleanup-e znova potvrdiť, že custom production domény ostávajú výhradne na Firebase deploy flowe
   - zistenie: pod Vercel accountom sa nenašli žiadne custom domény pre tieto preview projekty
5. [ ] Voliteľne: po ďalšom stabilizačnom kole zvážiť úplné zmazanie aj ponechaného manuálneho preview projektu, ak Vercel už netreba ani na diagnostics

## Repo governance cleanup
1. [x] Upratať `Firebase-first` vs. staré `Vercel` artefakty v repozitári
   - root cause: README, setup a lock-in guard hovoria Firebase-first, ale v repo stále ostali staré Vercel skripty a docs
2. [x] Rozhodnúť, ktoré Vercel skripty sú ešte legit preview-ops vrstva a ktoré už treba archivovať alebo zmazať
   - rozhodnutie: stare deploy/token/hobby skripty uz nie su canonical ops vrstva
   - stav: ostali v repo iba ako deprecated fail-fast legacy stuby
3. [x] Zharmonizovať staré docs, hlavne:
   - `docs/BRANCHES.md`
   - `docs/CUSTOM-DOMAIN.md`
4. [x] Zharmonizovať staré skripty, hlavne:
   - `scripts/deploy-vercel.ps1`
   - `scripts/set-vercel-token-env.ps1`
   - `scripts/test-deployment-setup.ps1`
   - `scripts/vercel-hobby-*.ps1`
5. [x] Po cleanup-e nechať len jednu jasnú pravdu:
   - Firebase = canonical production
   - Vercel = preview-only diagnostics vrstva, ak zostane

## PR #44 blockers
1. [x] Doriešiť `SonarCloud Code Analysis` blocker
2. [x] Po dobehnutí checkov znova potvrdiť merge readiness PR #44
3. [x] Zmergeovať `PR #44` do `otvarackapril2026`
   - merge commit: `5a83bbb486aed20323b7fe0919b09a6d2f853d3e`

## Sonar checklist
1. [x] Otvoriť SonarCloud PR analýzu pre `PR #44`
2. [x] Ísť do `Security Hotspots`
3. [x] Nastaviť filter na `Status: To review/Open`
4. [x] Nastaviť scope na `New Code`
5. [x] Overiť, či Sonar naozaj ukazuje presne `5` hotspotov
6. [x] Pri každom hotspot-e zapísať:
   - [x] rule name
   - [x] file + line
   - [x] severity
   - [x] či je v `New Code`
7. [x] Otvoriť `Quality Gate` summary a zistiť presnú failing podmienku
8. [x] Overiť `New Code` definíciu pre projekt/PR
9. [x] Zistiť, či sú hotspoty review-only alebo vyžadujú kódový zásah
10. [x] Ak sú review-only a technicky bezpečné, označiť ich v Sonare ako reviewed/safe
   - výsledok: SonarCloud quality gate pre `PR #44` prešiel

## Go-to-market decision
1. [ ] Neísť teraz do rýchleho asset sale rozhodnutia bez krátkeho validačného sprintu
2. [ ] Spraviť `30–45 dňový` validačný plán pre externé salóny namiesto slepého `90 dní build`
3. [ ] Oddeliť 3 reality:
   - code asset value
   - productized operating system value
   - skutočný micro-SaaS value s MRR
4. [ ] Pripraviť neutral demo tenant mimo `PAPI Hair Design`
5. [ ] Pripraviť onboarding SOP: nastavenie nového salónu do `30 min`
6. [ ] Spraviť outreach list prvých `10–20` salónov v Košiciach/SK
7. [ ] Validovať záujem ešte pred plným billing hardeningom:
   - discovery call
   - pilot
   - LOI alebo aspoň jasný trial commitment
8. [ ] Stripe robiť až po potvrdení, že onboarding a pilot flow dávajú zmysel
9. [ ] Po prvom validačnom cykle rozhodnúť:
   - škálovať ďalej
   - pivotnúť positioning
   - alebo to predať ako asset/product

## 30–45 dňový validation sprint
### Fáza 1: product readiness
1. [x] Auditnúť git históriu na únik credentials:
   - `git log --all --full-history -- .env`
   - skontrolovať aj staré `.env*`, service account JSON a exporty
   - výsledok: automatizovaný git history audit nenašiel žiadne tracked raw `.env`
   - výsledok: nenašli sa tracked `firebase-adminsdk` / service account JSON súbory
   - výsledok: `extensions/firestore-send-email.env` používa Secret Manager referenciu, nie raw SMTP heslo
2. [x] Znova potvrdiť auth/route bezpečnosť bez predpokladov:
   - owner/admin guardy
   - employee guardy
   - public callable flows
   - výsledok: `ProtectedRoute` už nepúšťa allowlisted employee email do employee/admin route bez membership dokumentu
   - výsledok: admin callable flowy zostávajú viazané na `requireAuth` + `requireMembership`
   - výsledok: public booking/history callable flowy zostávajú token/rate-limit based a nevyžadujú falošný auth bypass
3. [x] Spraviť tenant-readiness audit:
   - business isolation vo Firestore rules
   - business-aware queries
   - business-aware functions
   - business-aware email flows
   - výsledok: hlavné admin callable flowy sú business-scoped cez `requireMembership(...)`
   - výsledok: Firestore rules ostávajú vo väčšine jadrových kolekcií business-aware, vrátane canonical membership documentu `${uid}_${businessId}`
   - výsledok: `page_views` rules boli dotiahnuté, aby zápis šiel len za vlastného usera v rámci jeho business membershipu a čítanie ostalo len pre owner/admin
   - blocker: public booking a demo vrstva stále stoja na `DEFAULT_BUSINESS_ID` / `papi-hair-design-main`, takže onboarding nového tenanta ešte nie je self-serve
   - blocker: bootstrap, allowlist a role-enforcement flowy sú stále PAPI-specific
   - blocker: email branding, calendar export UID a public base URL sú stále brand-specific pre `papihairdesign.sk`
4. [x] Vytvoriť `asset inventory`:
   - čo sa predáva ako produkt
   - čo je špecifické len pre PAPI
   - čo treba odtenantizovať
   - výstup: [docs/ASSET-INVENTORY.md](docs/ASSET-INVENTORY.md)
5. [ ] Pripraviť neutral demo tenant:
   - názov bez väzby na PAPI
   - demo data
   - demo branding
   - demo users/roles
6. [ ] Nahrať krátke demo video:
   - landing
   - booking
   - my account
   - admin calendar
   - employees/settings

### Fáza 2: sales readiness
1. [ ] Pripraviť 1-stranový sales deck:
   - problém
   - riešenie
   - hlavné funkcie
   - cena/pilot návrh
   - onboarding model
2. [ ] Pripraviť jednoduchú landing page pre ďalšie salóny:
   - hero
   - features
   - pricing/pilot
   - CTA
3. [ ] Pripraviť outreach email/template:
   - krátky cold intro
   - ponuka pilotu
   - CTA na 15-min call
4. [ ] Pripraviť list prvých `10–20` salónov:
   - verejné kontakty
   - segmentácia
   - status outreachu

### Fáza 3: validation
1. [ ] Osloviť prvú vlnu `5` salónov
2. [ ] Zaznamenávať feedback štruktúrovane:
   - čo ich zaujalo
   - čo im chýba
   - čo bráni adopcii
   - či chcú pilot
3. [ ] Osloviť druhú vlnu `5–10` salónov
4. [ ] Získať aspoň jeden z týchto dôkazov:
   - pilot
   - trial commitment
   - LOI
   - jasne dohodnutý follow-up onboarding

### Fáza 4: monetizácia až po validácii
1. [ ] Navrhnúť pricing hypotézu:
   - pilot zdarma / zavádzacia cena
   - jeden jednoduchý plán
2. [ ] Stripe checkout riešiť až po potvrdení záujmu z trhu
3. [ ] Pred Stripe pripraviť:
   - billing ownership model
   - refund/cancel logiku
   - fakturačný text a podmienky

### Fáza 5: go / no-go decision
1. [ ] Po 30–45 dňoch zhodnotiť:
   - počet rozhovorov
   - počet silných leadov
   - počet pilotov
   - reálnu ochotu platiť
2. [ ] Ak máme aspoň `1 pilot + 1–2 silné leady`, pokračovať v škálovaní
3. [ ] Ak nemáme market signal, zvážiť:
   - repositioning
   - EN trh
   - asset/product sale

## Predaj vs. škálovanie
1. [ ] Držať si jednu pracovnú pravdu:
   - dnes je to silný vertical product / operating system
   - ešte nie plnohodnotný self-serve SaaS
2. [ ] Nepočítať s premium exit cenou bez:
   - externých tenantov
   - opakovateľného onboardingu
   - billing flow
   - MRR dôkazu
3. [ ] Rozlišovať 3 typy hodnoty pri každom rozhodnutí:
   - predaj kódu/assetov
   - predaj produktizovaného systému
   - predaj fungujúceho mikro-SaaS

## White-label expansion backlog
### Poznámka
- toto nie je aktualna implementacna priorita
- ide o buduci expansion shortlist, ked bude tenantization / white-label vrstva realne hotova

### Kandidátne vertikály
1. [ ] Osetrenie
2. [ ] Vsetky osetrenia
3. [ ] Vlasy a styling
4. [ ] Nechty
5. [ ] Odstranovanie chlpkov
6. [ ] Obočie a riasy
7. [ ] Starostlivost o tvar a plet
8. [ ] Masazny salon
9. [ ] Make-up
10. [ ] Estetika
11. [ ] Holicstvo
12. [ ] Kupele a wellness
13. [ ] Telo a plet
14. [ ] Tetovanie a piercing
15. [ ] Holisticke zdravie
16. [ ] Zubna starostlivost
17. [ ] Lekarske
18. [ ] Domaci milacikovia
19. [ ] Fitness
20. [ ] Fyzioterapia
21. [ ] Poradenstvo a terapia
22. [ ] Ostatne

### Pred rozšírením do ďalších vertikál vždy potvrdiť
1. [ ] ze booking domain model vie obsluzit inu logiku sluzieb, trvania a staff assignmentu bez hardcodov na hair salon flow
2. [ ] ze texty, emaily, metadata a onboarding flow nie su salon-specific
3. [ ] ze admin flow vie fungovat aj pre vertikaly bez klasickych casovych slotov alebo so specialnymi obmedzeniami
4. [ ] ze reporting, compliance a retention model sedia aj pre citlivejsie vertikaly ako lekarske, zubne alebo terapia

# TODO

## Aktuálna priorita projektu
### Dokončiť pred monetizáciou
1. [ ] Doriešiť `SonarCloud Code Analysis` blocker na `PR #44`
2. [ ] Potvrdiť finálnu merge readiness všetkých PR checkov
3. [x] Upratať `Firebase-first` vs `Vercel` governance chaos v repozitári
4. [ ] Dokončiť release safety cleanup okolo Vercel preview vrstvy
5. [x] Dorobiť posledný veľký `premium states & feedback` polish pass a live smoke

### Až potom riešiť
1. [ ] Tenant-readiness audit
2. [ ] Demo tenant
3. [ ] Outreach / validation sprint
4. [ ] Monetizácia / Stripe

## Legacy TypeScript cleanup
1. [x] Pridať `strict: true` do `functions/tsconfig.json`
2. [x] Pridať `forceConsistentCasingInFileNames: true` do `functions/tsconfig.json`
3. [ ] Overiť kompiláciu: `cd functions && npm run build`
4. [ ] Reštart TS server vo VSCode
5. [ ] Overiť zmiznutie chýb

## Release safety
1. [x] Overiť, či nehrozí nechcený production promote vo Vercel prepojení
   - zistenie: feature branch `codex/*` ide na Verceli do `preview`, nie automaticky do `production`
   - zistenie: oba Vercel projekty maju `productionBranch = main`
   - caveat: stale existuje manualny owner-level promote risk cez Vercel dashboard
2. [ ] Upratať duplicitné Vercel preview projekty pre `youh4ck3dme/papi-hair-design`
   - `papi-hair-design`
   - `papi-hair-design-69td`
3. [x] Rozhodnúť, ktorý Vercel projekt má zostať ako preview-only source of truth
   - odporucenie: ponechat `papi-hair-design` ako preview-only kandidat
   - dovod: cistejsi nazov, starsi projekt a rovnaky preview signal ako `papi-hair-design-69td`
4. [x] Po cleanup-e znova potvrdiť, že custom production domény ostávajú výhradne na Firebase deploy flowe
   - zistenie: pod Vercel accountom sa nenasli ziadne custom domény pre tieto preview projekty

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
1. [ ] Doriešiť `SonarCloud Code Analysis` blocker
2. [ ] Po dobehnutí checkov znova potvrdiť merge readiness PR #44

## Sonar checklist
1. [ ] Otvoriť SonarCloud PR analýzu pre `PR #44`
2. [ ] Ísť do `Security Hotspots`
3. [ ] Nastaviť filter na `Status: To review/Open`
4. [ ] Nastaviť scope na `New Code`
5. [ ] Overiť, či Sonar naozaj ukazuje presne `5` hotspotov
6. [ ] Pri každom hotspot-e zapísať:
   - [ ] rule name
   - [ ] file + line
   - [ ] severity
   - [ ] či je v `New Code`
7. [ ] Otvoriť `Quality Gate` summary a zistiť presnú failing podmienku
8. [ ] Overiť `New Code` definíciu pre projekt/PR
9. [ ] Zistiť, či sú hotspoty review-only alebo vyžadujú kódový zásah
10. [ ] Ak sú review-only a technicky bezpečné, označiť ich v Sonare ako reviewed/safe

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
1. [ ] Auditnúť git históriu na únik credentials:
   - `git log --all --full-history -- .env`
   - skontrolovať aj staré `.env*`, service account JSON a exporty
2. [ ] Znova potvrdiť auth/route bezpečnosť bez predpokladov:
   - owner/admin guardy
   - employee guardy
   - public callable flows
3. [ ] Spraviť tenant-readiness audit:
   - business isolation vo Firestore rules
   - business-aware queries
   - business-aware functions
   - business-aware email flows
4. [ ] Vytvoriť `asset inventory`:
   - čo sa predáva ako produkt
   - čo je špecifické len pre PAPI
   - čo treba odtenantizovať
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

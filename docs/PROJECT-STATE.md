# Project State and Handoff

## 1. Purpose

Tento dokument je kanonicky handoff snapshot projektu po stabilizacnom kole. Ma odpovedat na 4 prakticke otazky:
- kde je canonical repo a aka vetva je pravda
- v akom stave je produkt a release vrstva
- co je dnes hotove a co este nie
- na co netreba zabudnut, ked bude v projekte pokracovat dalsi clovek alebo buduce ja

Nejde o marketingovy text. Ide o operacne presny opis reality.

## 2. Canonical identity

### Git identity
- GitHub repo: `youh4ck3dme/papi-hair-design`
- canonical base branch: `otvarackapril2026`
- canonical production truth:
  - Firebase Hosting
  - Cloud Functions for Firebase

### Local identity
- lokalna cesta: `C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26`

### Safety branches, ktore zatial vedome ostavaju
- `codex/otvarackapril2026-email-polish`
- `codex/backup-otvarackapril2026-pre-reset-2026-04-23`

Tieto dve vetvy zatial nemazat. Su tam ako poistka po velkom stabilizacnom a merge kole.

## 3. Verified current state

### Product state
Projekt je dnes:
- produkcne relevantny salon operating system
- Firebase-first booking a admin platform
- po velkom quality, docs a release hygiene kole

Projekt dnes este nie je:
- self-serve multi-tenant SaaS
- plne generalizovany white-label engine
- billing-complete external tenant platform

### Merge and stabilization state
V tomto stabilizacnom kole boli dokoncene a uzavrete klucove body:
- SonarCloud blocker pre `PR #44`
- final merge readiness pre hlavny release balik
- merge `PR #44` do `otvarackapril2026`
- cleanup lokalnej base vetvy a backup branch disciplina
- TODO refresh po merge
- Vercel release safety cleanup
- white-label expansion backlog bol zapisany do `TODO.md` ako buduca vrstva, nie aktualna priorita

### Clean baseline truth
Ak chce niekto pokracovat od cisteho stavu, source of truth je:
- `origin/otvarackapril2026`

Ak ma niekto lokalny chaos, najprv si ma overit, ci nepracuje na starej feature vetve alebo na lokalnej vetve odchylenej od `origin/otvarackapril2026`.

## 4. Deployment and release truth

### Canonical production deploy path
Jedina canonical production cesta je:
- Firebase Hosting
- Cloud Functions for Firebase

Toto je najdolezitejsia release pravda v projekte.

### Vercel truth po cleanup-e
Vercel uz nie je aktivna Git-driven release pipeline.

Aktualna realita:
- duplicitny projekt `papi-hair-design-69td` bol zmazany
- ponechany projekt `papi-hair-design` zostal iba ako manualny diagnostics shell
- na ponechanom projekte je:
  - `gitProviderOptions.createDeployments = disabled`

Prakticky dosledok:
- nove Git pushy uz nespustaju automaticke Vercel preview deploymenty
- nove Git pushy uz nespustaju automaticky ani Vercel production deployment
- Vercel uz nema byt chapaný ako releasovacia pravda

Stale vsak plati:
- owner s pristupom do Vercel dashboardu vie manualne vytvorit alebo promotnut deployment
- historicke `vercel.app` aliasy pre stare deploymenty mozu stale existovat

Preto treba Vercel chapat ako:
- optional diagnostics surface
- nie aktivnu release pipeline

## 5. Quality and testing truth

### Co bolo v tomto kole realne dokazovo uzavrete
- SonarCloud quality gate pre hlavny release balik presiel
- GitHub checks pre klucovy merge balik presli
- authenticated aj preview-safe E2E vrstva bola dorovnana
- docs, TODO a operations vrstva boli zosuladene s realitou

### Dolezita poctiva hranica
Tento dokument neznamena, ze pri kazdej buducej zmene bude vsetko automaticky stale zelene. Znamena len, ze po tomto stabilizacnom kole je baseline vyrazne cistejsi a realistickejsi.

## 6. Active backlog truth

Aktivny backlog source of truth je:
- [../TODO.md](../TODO.md)

`TODO.md` sa ma brat ako zivy pracovny backlog, nie ako archiv.

### Najdolezitejsie dalsie otvorene body dnes
1. `Legacy TypeScript cleanup`
   - restart TS server vo VS Code
   - potvrdit, ze editor-only TypeScript chyby zmizli
2. `Tenant-readiness audit`
3. `Demo tenant`
4. `Outreach / validation sprint`
5. `Monetizacia / Stripe` az neskor, nie teraz

### White-label expansion backlog
Zoznam moznych dalsich vertikal je uz zapisany v `TODO.md`, ale:
- nie je to aktualna implementacna priorita
- je to strategicky shortlist pre cas, ked bude tenantization naozaj hotova

## 7. Notes not to forget

Na tieto veci netreba zabudnut:

1. `TODO.md` ma ostat aktualny
- po kazdom vacsom merge alebo infra zasahu aktualizovat `TODO.md`
- nenechat backlog odpojit od reality

2. `README.md`, `docs/README.md` a `docs/OPERATIONS.md` maju byt v sulade
- ked sa meni deploy truth, release truth alebo repo governance, tieto subory maju byt zosuladene spolu

3. `Firebase` je stale prva pravda
- nevracat do projektu tichy dual-deploy mindset
- ak by sa Vercel niekedy vracal, musi to byt explicitne rozhodnutie, nie nahoda

4. `Safety branches` zatial nechat zit
- `codex/otvarackapril2026-email-polish`
- `codex/backup-otvarackapril2026-pre-reset-2026-04-23`

5. `White-label` neriesit skor, nez bude hotovy tenant-readiness audit
- inak len premenujeme hair-salon appku bez realnej platformovej pripravy

6. `Compliance` nenechat uspat
- pri white-label alebo citlivejsich vertikalach bude compliance uroven omnoho dolezitejsia
- najma pre lekarske, zubne alebo terapeuticke use-cases

7. `Targeted deploy discipline` drzat dalej
- nesiahat po full deployoch bez dovodu
- production hygiene je uz sucast produktu

## 8. Recommended next moves

Ak ma projekt dalej pokracovat rozumne, poradie by malo byt:

1. merge docs cleanup vetvy do `otvarackapril2026`
2. dorobit `Legacy TypeScript cleanup`
3. spravit `Tenant-readiness audit`
4. az potom sa rozhodovat, ci sa ide do demo tenantu, outreachu alebo white-label smeru

## 9. Universal continuation note

Ak bude niekto pokracovat v inom editore alebo na inom PC, bezpecny start je:

```bash
git clone https://github.com/youh4ck3dme/papi-hair-design.git
cd papi-hair-design
git switch otvarackapril2026
git pull origin otvarackapril2026
```

Ak chce niekto pokracovat na aktualnej docs cleanup vetve:

```bash
git clone https://github.com/youh4ck3dme/papi-hair-design.git
cd papi-hair-design
git switch codex/vercel-release-safety-cleanup
git pull origin codex/vercel-release-safety-cleanup
```

## 10. Honest closing verdict

Repo je po tomto kole vyrazne cistejsie, dokumentacne poctivejsie a releaseovo bezpecnejsie.

Najdolezitejsia zmena nie je len to, co sme pridali do kodu. Najdolezitejsie je, ze dnes uz mame:
- jednu jasnu production pravdu
- cistejsiu branch a merge hygienu
- zosuladenu docs vrstvu
- backlog, ktory hovori realitu a nie len ambicie

To je presne stav, z ktoreho sa da dalej stavane bez zbytocneho chaosu.

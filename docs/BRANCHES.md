# Vetvy a release flow

Tento dokument je tactical branch/reference vrstva.
Kanonicky deploy a operations kontext je v [OPERATIONS.md](OPERATIONS.md).

## Aktualna pravda

- `main`
  - hlavna integracna vetva repozitara
  - PR preview buildy a branch automatizacia sa mozu na nu viazat podla platformy
- `codex/*`
  - pracovné feature vetvy
  - typicky idu cez PR a preview checky
- release do produkcie
  - canonical production path je **Firebase Hosting + Cloud Functions for Firebase**
  - nie Vercel production branch flow

## Co uz neplati

Historicky tento repo niesol Vercel-oriented branch model s oddelenou production branch.
To uz dnes nie je source of truth.

Ak v starsich poznamkach alebo skriptoch narazis na:
- `papihairstudiobooking`
- Vercel production branch routing
- branch-specific Vercel production deploy disciplinu

ber to ako legacy operational residue, nie ako aktualny release model.

## Aktualny bezpecny workflow

1. Pracovat na feature vetve:
   ```bash
   git switch codex/nazov-zmeny
   ```
2. Pustit lokalne quality gates:
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   npm --prefix functions test
   npm run build
   ```
3. Otvorit alebo aktualizovat PR.
4. Pockat na CI a preview checky.
5. Produkcny release robit cez Firebase deploy flow, nie cez branch push do Vercel production.

## Preview vrstva

Vercel moze v tomto repo stale existovat ako:
- PR preview
- branch diagnostics
- doplnkova browser/build signal vrstva

Ale:
- nie je to canonical production deploy path
- nema to byt dokumentacne zamienane s Firebase release flow

## Ked potrebujes release detail

Pouzi:
- [OPERATIONS.md](OPERATIONS.md)
- [ROLLBACK-RUNBOOK.md](ROLLBACK-RUNBOOK.md)
- [POST-RELEASE-SMOKE-CHECKLIST.md](POST-RELEASE-SMOKE-CHECKLIST.md)

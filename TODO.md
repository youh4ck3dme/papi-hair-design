# TODO

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
3. [ ] Rozhodnúť, ktorý Vercel projekt má zostať ako preview-only source of truth
4. [ ] Po cleanup-e znova potvrdiť, že custom production domény ostávajú výhradne na Firebase deploy flowe

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

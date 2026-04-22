# TODO

## Legacy TypeScript cleanup
1. [x] Pridať `strict: true` do `functions/tsconfig.json`
2. [x] Pridať `forceConsistentCasingInFileNames: true` do `functions/tsconfig.json`
3. [ ] Overiť kompiláciu: `cd functions && npm run build`
4. [ ] Reštart TS server vo VSCode
5. [ ] Overiť zmiznutie chýb

## Release safety
1. [ ] Overiť, či nehrozí nechcený production promote vo Vercel prepojení

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

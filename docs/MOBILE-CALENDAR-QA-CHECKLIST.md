# Mobile/Tablet QA Checklist - Admin Kalendár

Tento checklist je určený pre majiteľa a zamestnancov pred každým release/deployom.
Zameranie: pixel-perfect rozloženie, čitateľnosť, sloty a ovládanie bez horizontálneho scrollu.

## 1) Automatický gate (musí byť zelený)

Spusť v repozitári:

```powershell
npm run typecheck
npm run test:e2e:preview
$env:PLAYWRIGHT_ENABLE_ADMIN_E2E='1'; $env:PLAYWRIGHT_ADMIN_EMAIL='papi@papihairdesign.sk'; $env:PLAYWRIGHT_ADMIN_PASSWORD='88888888'; npm run test:admin
$env:PLAYWRIGHT_ADMIN_EMAIL='papi@papihairdesign.sk'; $env:PLAYWRIGHT_ADMIN_PASSWORD='88888888'; npm run test:calendar-mobile-live
```

Výstupy auditu:
- `e2e/e2e-results/calendar-mobile-audit-live/results.json`
- `e2e/e2e-results/calendar-mobile-audit-live/*.png`

Pass kritériá auditu:
- `docOverflowX = 0` a `bodyOverflowX = 0`
- kalendár root výška sedí na viewport (`100vh/100dvh`)
- sloty sú renderované (`slotButtons > 0`)

## 2) Manuálna kontrola na reálnych zariadeniach

Minimálny set:
- Android 360x640 (Tomato/low-end trieda)
- iPhone SE 375x667
- iPhone 14 Pro Max 430x932
- iPad Mini 768x1024 (tablet)

## 3) Manuálny flow (na každom zariadení)

1. Otvor `https://booking.papihairdesign.sk/auth` a prihlás sa ako admin.
2. Prejdi na `Admin -> Kalendár`.
3. Over, že nikde nie je posun doľava/doprava (horizontálny scroll).
4. Over, že filtre (stavy, zamestnanci, reset) sú čitateľné a nepretláčajú layout.
5. Prepnúť `Deň / Týždeň / Mesiac`:
   - aktívny tab je jasný,
   - nič sa neodreže mimo obrazovky,
   - text ostáva čitateľný.
6. V `Deň` režime:
   - klik na prázdny slot otvorí `Nová rezervácia`,
   - klik na existujúcu rezerváciu otvorí detail,
   - vertikálny scroll kalendára funguje plynulo.
7. Over CTA `+ Nová rezervácia`:
   - je viditeľné bez horizontálneho scrollu,
   - modal sa otvára a dá sa zavrieť.
8. Over cookie lištu:
   - nezablokuje login tlačidlo,
   - neprekryje kritické ovládanie kalendára po prihlásení.

## 4) Pixel-perfect acceptance criteria

Release je OK len ak platí:
- Bez horizontálneho scrollu na celom admin kalendári.
- Zamestnanci a hlavné ovládanie sú viditeľné aj na malom mobile.
- Sloty sú klikateľné a modal detail/nová rezervácia sa otvára konzistentne.
- Kontrast textu a tlačidiel je čitateľný vo všetkých testovaných viewportocha.
- Automatický gate je komplet zelený.

## 5) Ak niečo zlyhá

1. Urob screenshot + krátky popis zariadenia a kroku.
2. Ulož artefakt do `e2e/e2e-results/calendar-mobile-audit-live/`.
3. Nedeployovať, kým nie je fix + opakovaný zelený gate.
Poznamka:
- toto je tactical mobile QA checklist
- sirsi quality kontext je v [Testing & Quality](TESTING-QUALITY.md)

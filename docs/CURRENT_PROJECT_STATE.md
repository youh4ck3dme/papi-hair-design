# Prieskum a Diagnostika Projektu (Current State)

> STATUS: historicky auditny dokument.
> Aktualny operativny stav: `docs/GRANDE-FINALE-STATUS-2026-03-11.md`.

Dátum: 4. Marec 2026
Meno projektu: **nimble-agenda** (pôvodne loveable-PHDbooking)

Tento dokument sumarizuje aktuálny technický stav projektu po prečistení repozitára a analýze jeho zložiek.

## 1. Technologický Stack
- **Frontend Framework**: React 18 s TypeScriptom.
- **Build Nástroj**: Vite (pomalšie nahrádzajúci Webpack v moderných appkách).
- **Štýlovanie**: Tailwind CSS (plus `tailwindcss-animate`, `@tailwindcss/typography`).
- **NUI / Komponenty**: Radix UI (rozsiahle použitie primitive komponentov), Lucide React (ikony).
- **Správa stavu & Dáta**: `@tanstack/react-query` pre asynchrónne sťahovanie/kešovanie dát, `react-hook-form` pre formuláre.
- **Routing**: `react-router-dom` v6.

## 2. Backend & Infraštruktúra
- **Databáza a Autentifikácia**: **Supabase**. Kód explicitne používa `@supabase/supabase-js`. Súbor `src/integrations/supabase/client.ts` potvrdzuje "purely Supabase Auth", rovnako tak existujú powershell/shell skripty a .toml konfigy pre manipuláciu so Supabase databázou a jej pushovanie (`npm run supabase:push`).
- **Hosting / Deploy**: **Firebase Hosting**. Konfigurácia sa nachádza vo `firebase.json` (smeruje do public priečinka `dist`). Repozitár bol vyčistený od starých Vercel dokumentov a `.gitignore` i `firebase.json` potvrdzujú toto nasadenie. Firebase sa pravdepodobne aktuálne využíva len na statický web hosting, hoci repozitár obsahuje aj Firestore rules.
- **E2E Testovanie**: Playwright (konfigurácia e2e/playwright.config.ts), Vitest na unit testy.

## 3. Architektúra Aplikácie (Hlavné URL Cesty)
Aplikácia má viacero oddelených sekcií s ochranou podľa rolí zamestnancov a zákazníkov:
- `/booking` – Hlavná rezervačná stránka pre zákazníkov.
- `/admin/*` – Zabezpečená oblasť (Dashboard, Kalendár, Zamestnanci, Služby, Zákazníci, Nastavenia atď.) dostupná iba pre vlastníka ("owner"), a administrátora ("admin"). Niektoré len pre zamestnancov ("employee" – My Schedule, Appointments).
- `/reception` – Recepčný pohľad.
- `/offline` & Service Worker – Aplikácia je pripravená na offline zážitok (PWA a IndexedDB kontrola `ensureStorageAndServiceWorker`).
- Rôzne utilitky a info stránky (`/diagnostics`, `/install`, `/privacy`, `/demo`).

## 4. Diagnostika repozitára
- **Čistota**: Odstránené prebytočné (staré) diagnostické a setup súbory, ktoré sa vzťahovali na migráciu z Vercelu a staré Supabase prechody. `.gitignore` správne ignoruje `.env`, `dist`, `node_modules` a privátne certifikáty.
- **Linting & Stabilita**: Projektom prešiel príkaz `npm run lint` s `exit code 0`, t.j. bez chýb typografie alebo porušenia pravidiel, čo značí veľmi dobrú základnú stabilitu kódu.
- **Aktuálnosť štruktúry**: Zložka `src/lib/` obsahuje kvalitné menšie oddelené služby pre logiku dostupnosti, manipuláciu s časovými zónami a utility.

## Záver
Projekt sa nachádza vo flexibilnom, plne funkčnom stave (finálna verzia). Prechod na Firebase Hosting je etablovaný, zatiaľ čo jadro dát zostáva na Supabase. Ďalší vývoj by mal byť jednoduchý bez blokátorov v rámci mŕtveho alebo duplicitného dokumentačného kódu.

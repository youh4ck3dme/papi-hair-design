# PAPI HAIR DESIGN – Booking System

## Lovable Sync
Tento projekt je synchronizovaný s [Lovable](https://lovable.dev).

### Späť do Lovable
Lovable má bidirectional sync s GitHubom. Po pushnutí do main:
1. Otvor tento projekt v Lovable editore.
2. Zmeny sa automaticky synchronizujú (do ~1 minúty).
3. Ak sa neaktualizuje, klikni na meno projektu (vľavo hore) → **Settings** → **GitHub** → overiť že sync je aktívny.

### Prompt pre Lovable po návrate
Po synchronizácii pošli v Lovable chate:
> Skontroluj či sa všetky zmeny z GitHubu správne synchronizovali. Spusti build a over že aplikácia funguje bez chýb. Ak nájdeš problémy, oprav ich.

### Zhrnutie flow
1. **VS Code**: lint + tsc → oprav chyby → build → commit → push main
2. **GitHub**: main vetva aktualizovaná
3. **Lovable**: automatický sync ← zmeny sa objavia v editore

---

> **Rezervačný systém:** [booking.papihairdesign.sk](https://booking.papihairdesign.sk)
> **Cenník:** [papihairdesign.sk/cennik](https://papihairdesign.sk/cennik)

Moderný rezervačný systém pre salóny krásy. React 18 PWA + Firebase backend.

> **Aktívny stav:** Projekt bol kompletne migrovaný zo Supabase na Firebase (Firestore + Cloud Functions). Všetky pôvodné Supabase funkcie boli nahradené Firebase ekvivalentmi.

---

## Obsah

- [Rýchly štart – príkazy](#rýchly-štart--príkazy)
- [Architektúra](#architektúra)
- [Premenné prostredia](#premenné-prostredia)
- [Stránky a routy](#stránky-a-routy)
- [Štruktúra projektu](#štruktúra-projektu)
- [Databáza a migrácie](#databáza-a-migrácie)
- [Edge Functions](#edge-functions)
- [Offline podpora](#offline-podpora)
- [PWA inštalácia](#pwa-inštalácia)
- [Bezpečnosť](#bezpečnosť)
- [Testy](#testy)
- [Vendor code splitting](#vendor-code-splitting)
- [Vercel / deploy](#vercel--deploy)
- [Changelog](#changelog)

---

## Rýchly štart – príkazy

### Cesta k projektu

```
c:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26
```

> Všetky príkazy spúšťaj z tohto adresára. V termináli:
> ```sh
> cd "c:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26"
> ```

---

### Node.js požiadavka

Projekt vyžaduje **Node.js 20.19+ alebo 22.12+** (Vite 7).

```sh
# Skontrolovať verziu:
node -v

# Ak máš starú verziu, stiahni nvm-windows a:
nvm install 22
nvm use 22
```

---

### Inštalácia závislostí

```sh
cd "c:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26"
npm install
```

---

### Vývojový server

```sh
cd "c:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26"
npm run dev
```

App beží na → **http://localhost:5678**

HMR (hot reload) je aktívny. Zmeny v `.tsx/.ts/.css` sa prejavia okamžite bez reštartu.

---

### Produkčný build

```sh
cd "c:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26"
npm run build
```

Výstup: `dist/` — statické súbory pripravené na deploy (Vercel / Nginx / Firebase Hosting).

---

### Náhľad buildu lokálne

```sh
cd "c:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26"
npm run preview
```

Spustí statický server nad `dist/` → http://localhost:4173

---

### Všetky dostupné príkazy

| Príkaz | Popis |
|--------|-------|
| `npm run dev` | Vývojový server s HMR (port 5678) |
| `npm run build` | Produkčný build → `dist/` |
| `npm run build:dev` | Build v dev móde (so source maps) |
| `npm run preview` | Statický náhľad `dist/` lokálne |
| `npm run typecheck` | TypeScript kontrola bez buildu |
| `npm run lint` | ESLint kontrola kódu |
| `npm run test` | Vitest – jednorazový beh |
| `npm run test:watch` | Vitest – sledovací mód |
| `npm run test:coverage` | Testy + coverage report |
| `npm run setup` | Automatická príprava prostredia (PowerShell) |

---

### Príprava na nový vývoj (checklist)

```sh
cd "c:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26"

# 1. Stiahnuť zmeny
git pull origin main

# 2. Závislosti
npm install

# 3. Skontrolovať .env (Firebase API Key + Projekt ID)
# (pozri sekciu Premenné prostredia)

# 4. Overiť že build prechádza
npm run typecheck
npm run build

# 5. Spustiť
npm run dev
```
```

---

## Otváracie hodiny

| Deň | Stav | Čas |
|-----|------|-----|
| Pondelok | Otvorené | 08:00 – 17:00 |
| Utorok | Otvorené | 08:00 – 17:00 |
| Streda | Otvorené | 08:00 – 17:00 |
| Štvrtok | Otvorené | 08:00 – 17:00 |
| Piatok | Otvorené | 08:00 – 17:00 |
| Sobota | Podľa objednávok | 08:00 – 17:00 |
| Nedeľa | Zavreté | — |

## Architektúra

```
React 18 + Vite 7 + TypeScript
├── shadcn/ui + Tailwind CSS 3.4   — UI komponenty
├── TanStack React Query           — Server state
├── Dexie.js (IndexedDB)           — Offline-first lokálna DB
├── vite-plugin-pwa (Workbox)      — PWA + service worker
└── Firebase (100% backend)
    ├── Firestore                   — NoSQL Databáza
    ├── Firebase Auth               — Autentifikácia
    └── Cloud Functions             — Business logika
```

> Supabase bol kompletne odstránený. Všetok pôvodný Supabase kód bol nahradený Firebase ekvivalentmi.

### Tok dát

```
┌─────────────┐     ┌──────────────┐     ┌───────────────────┐
│  Zákazník   │────▶│  /booking    │────▶│  createPublic-    │
│  (telefón)  │     │  výber slot  │     │  Booking (Cloud Fn)│
└─────────────┘     └──────────────┘     └────────┬──────────┘
                                                   │ e-mail
                                                   ▼
┌─────────────┐     ┌──────────────┐     ┌───────────────────┐
│  Admin      │◀────│  /admin      │◀────│  Nová rezervácia  │
│  (dashboard)│     │  kalendár    │     │  v Firestore DB   │
└─────────────┘     └──────────────┘     └───────────────────┘
```

---

## Štruktúra projektu

```
loveable-PHDbooking-finale-3-3-26/
├── src/
│   ├── App.tsx                        # Routing
│   ├── main.tsx                       # Entry point
│   ├── pages/                         # Stránky aplikácie
│   ├── components/                    # UI komponenty
│   ├── contexts/                      # Auth a iné contexty
│   ├── hooks/                         # Custom hooks
│   ├── integrations/
│   │   └── firebase/                  # Firebase klient a functions
│   └── lib/                           # Utility a offline sync
├── functions/                         # Firebase Cloud Functions
├── docs/                              # Dokumentácia
├── public/                            # Statické assety
├── .env                               # Lokálne premenné
├── vite.config.ts
└── package.json
```

---

## Otváracie hodiny

Hodiny sú uložené v kolekcii `businesses` (v dokumente danej prevádzky) v Firestore a sú **jediným zdrojom pravdy** pre celý systém.
- Zobrazenie "Otvorené / Zatvorené" na stránke `/booking`
- Generovanie dostupných termínov (slot generation v `BookingPage.tsx`)
**Zmena hodín** — prebieha cez admin panel: `/admin/settings` → sekcia Pracovné hodiny (ukladá sa do Firestore).

---

---

## PWA inštalácia

## Offline podpora

```
```
Online  ──▶  Firebase (Firestore)
               ↕  real-time sync / optimistic updates
Offline ──▶  IndexedDB (Dexie)
               ├── appointments  (lokálna kópia)
               ├── queue         (čakajúce akcie)
               └── meta          (čas posledného syncu)
```
```

---

## PWA inštalácia

| Vlastnosť | Hodnota |
|-----------|---------|
| Start URL | `/booking` |
| Display | `standalone` |
| Theme color | `#0b0b0b` |
| Icons | 192×192 a 512×512 |
| Caching | Workbox (NetworkFirst pre API, CacheFirst pre assety) |

---

## Bezpečnosť

- **Firestore Rules** – každá kolekcia zabezpečená, dáta izolované podľa `business_id`
- **Multi-tenant** – každá prevádzka vidí iba svoje dáta
- **Passkeys (WebAuthn)** – passwordless biometrické prihlásenie
- **Role-based access** – 4 roly: `owner › admin › employee › customer`
- **Zod validácia** – vstupy validované na FE aj v cloud functions
- **Firebase Security Rules** – detailné pravidlá pre Firestore (firestore.rules)
- **Firebase Auth** – bezpečná autentifikácia cez Google/Email
- **Client-side encryption** – (ak je implementované) pre citlivé dáta
- **SalonLoginPage** – route `/papihairsalon2026` nie je verejne linkovaná

---

## Testy

```sh
cd "c:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26"

npm run test              # jednorazový beh (85+ testov)
npm run test:watch        # sledovací mód
npm run test:coverage     # + coverage report
npm run typecheck         # TS kontrola bez buildu
npm run lint              # ESLint
```

Framework: **Vitest** + `@testing-library/react` + `jsdom`

---

## Vendor code splitting

| Chunk | Obsah | Gzip |
|-------|-------|------|
| `vendor-react` | React, ReactDOM, React Router | ~8 kB |
| `vendor-firebase` | firebase/app, auth, firestore, functions | ~110 kB |
| `vendor-query` | @tanstack/react-query | ~7 kB |
| `vendor-ui` | Sonner, Recharts, Lucide | ~75 kB |

---

## Vercel / deploy

### Aktuálny stav nasadenia

| | |
|---|---|
| **Platform** | Vercel (Hobby) |
| **GitHub repo** | https://github.com/youh4ck3dme/papi-hair-design (private) |
| **Vercel projekt** | `papi-hair-design` (tím: `yyys-projects-639e38fd`) |
| **Vercel dashboard** | https://vercel.com/yyys-projects-639e38fd/papi-hair-design |
| **Aktívny deployment** | https://papi-hair-design-99ruydqcl-yyys-projects-639e38fd.vercel.app ✅ |
| **Produkčná doména** | https://papi-hair-design.vercel.app |
| **Vlastná doména** | `booking.papihairdesign.sk` — ⚠️ zatiaľ nepripojená k Vercel |
| **Auto-deploy** | ✅ každý push na `main` → automatický deploy |

> **Poznámka:** Vercel Hobby nepodporuje deploy zo súkromného org repozitára — repo musí byť pod osobným účtom (`youh4ck3dme`). ✅

### Manuálny deploy

```sh
npx vercel --prod
```

### Env premenné na Vercel

Nastav v: https://vercel.com/yyys-projects-639e38fd/papi-hair-design/settings/environment-variables

| Premenná | Hodnota |
|----------|---------|
| `VITE_FIREBASE_API_KEY` | tvoj-api-key |
| `VITE_FIREBASE_PROJECT_ID` | tvoj-project-id |
| `VITE_FIREBASE_AUTH_DOMAIN` | tvoj-project.firebaseapp.com |
| `VITE_FIREBASE_STORAGE_BUCKET` | tvoj-project.appspot.com |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | tvoj-sender-id |
| `VITE_FIREBASE_APP_ID` | tvoj-app-id |
| `VITE_PAPI_EMAIL` | `papi@papihairdesign.sk` |
| `VITE_VERCEL` | `true` |

### Pripojenie vlastnej domény `booking.papihairdesign.sk`

1. Vercel Dashboard → projekt → **Domains** → pridať `booking.papihairdesign.sk`
2. Vercel ukáže DNS záznamy (CNAME alebo A record)
3. Nastaviť DNS u registrátora (Websupport): CNAME → `cname.vercel-dns.com`
4. Počkať na propagáciu (5–30 min)

---

## Changelog

### 2026-03-04 – Cenník seednutý do DB + sort_order + Vercel env

- **34 služieb** seednutých do `services` tabuľky (migrácia `20260304120000_seed_papi_services.sql`)
  - 21 dámskych: Strih & Styling, Farbenie, Balayage & Melír, Odfarbovanie & Regenerácia, Predlžovanie & Účesy
  - 13 pánskych: Vlasy, Brada & Kombinácie, Farbenie, Doplnkové Služby
  - Aktualizované ceny: Pánsky strih 24 €, Kombinácia vlasy a brada 29 €
  - Nová služba: Strihanie len strojčekom 19 €
  - Strih Junior premenovaný na "do 10r."
- **`services.sort_order`** – nový stĺpec, zoradenie podľa cenníka (nie abecedne)
- **BookingPage** – query zmenená na `.order("sort_order").order("name_sk")`
- **employee_services** – auto-assign všetkých 34 služieb všetkým aktívnym zamestnancom
- **Vercel env** – doplnená tabuľka všetkých potrebných env premenných vrátane `VITE_VERCEL=true`
- **.env.example** – opravený project_ref (bol `hrkwqdvfeudxkqttpgls`, správny: `zcbklrgrawjsshpoyolr`)

### 2026-03-03 – SalonLoginPage vyladenie + build fix

- **SalonLoginPage** (`/papihairsalon2026`):
  - Responzívny layout `h-[100dvh]` – presne 100% výšky viewportu na všetkých zariadeniach
  - Logo blur-reveal animácia (`phd-logo-in`) → WebGL electric canvas → gold VSTÚPIŤ button
  - Responsive logo: `h-32 xs:h-36 sm:h-44 md:h-52 lg:h-64 xl:h-72`
  - Avatar karty vždy horizontálne, JS-responsive veľkosť (88–178px)
  - WebGL canvas výška: `h-12 sm:h-16 lg:h-20`
  - Touch targets ≥ 44px, `prefers-reduced-motion` podpora
  - Safe area (`safe-y`) pre iPhone notch + home indicator
- **Auth.tsx**: Opravené git diff znaky (`-/+`) ktoré spôsobovali build chybu
- **Build**: Prechádza čisto, 3472 modulov, ~15s

### 2026-03-03 – Supabase migrácia + testy

- Supabase prepojený na `zcbklrgrawjsshpoyolr`
- Migrácia `nova-migracia` pushnutá (employee_services, business_hours, business_date_overrides, RLS)
- 97 unit testov prechádza (19 test súborov)
- Firebase kompletne odstránený z produkčného bundlu
- `createPublicBooking.test.ts` – 8 testov pre Edge Function wrapper
- `useBusinessInfoSupabase.test.ts` – 13 testov pre business info hook
- `.env` opravený (odstránený neplatný riadok `prisma/schema.prisma`)
- `prisma/schema.prisma` vytvorený pre Supabase PostgreSQL

### Staršie záznamy

Kompletná história zmien: [CHANGELOG.md](CHANGELOG.md)

---

## Licencia

Proprietary – © EB-EU s.r.o. Všetky práva vyhradené.

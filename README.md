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

> Poznámka: Časti README so starými Supabase postupmi sú legacy dokumentácia technického dlhu. Aktívny runtime flow aplikácie je Firebase-only (read aj write).

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

# 3. Skontrolovať .env (Supabase URL + anon key)
# (pozri sekciu Premenné prostredia)

# 4. Overiť že build prechádza
npm run typecheck
npm run build

# 5. Spustiť
npm run dev
```

---

## Architektúra

```
React 18 + Vite 7 + TypeScript
├── shadcn/ui + Tailwind CSS 4    — UI komponenty
├── TanStack React Query           — Server state
├── Dexie.js (IndexedDB)           — Offline-first lokálna DB
├── vite-plugin-pwa (Workbox)      — PWA + service worker
└── Supabase (100% backend)
    ├── PostgreSQL + RLS            — Databáza
    ├── Supabase Auth               — Autentifikácia (email/heslo)
    └── Edge Functions (Deno)       — Serverless logika
```

> Firebase bol kompletne odstránený. Všetok kód v `src/integrations/firebase/` je dead code a nie je importovaný v produkcii.

### Tok dát

```
┌─────────────┐     ┌──────────────┐     ┌───────────────────┐
│  Zákazník   │────▶│  /booking    │────▶│  create-public-   │
│  (telefón)  │     │  výber slot  │     │  booking (edge fn)│
└─────────────┘     └──────────────┘     └────────┬──────────┘
                                                   │ e-mail
                                                   ▼
┌─────────────┐     ┌──────────────┐     ┌───────────────────┐
│  Admin      │◀────│  /admin      │◀────│  Nová rezervácia  │
│  (dashboard)│     │  kalendár    │     │  v Supabase DB    │
└─────────────┘     └──────────────┘     └───────────────────┘
```

---

## Premenné prostredia

Skopíruj `.env.example` do `.env`:

```sh
# Windows:
copy .env.example .env
# Unix/Mac:
cp .env.example .env
```

Vyplň v `.env`:

```env
# ── Supabase ──────────────────────────────────────────────────────────────────
VITE_SUPABASE_URL=https://zcbklrgrawjsshpoyolr.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tvoj-anon-key

# ── Prihlásenie personálu (/papihairsalon2026) ─────────────────────────────────
VITE_PAPI_EMAIL=papi@papihairdesign.sk
VITE_MISKA_EMAIL=miska@papihairdesign.sk
VITE_MATO_EMAIL=mato@papihairdesign.sk

# ── Prisma (voliteľné – len ak používaš Prisma CLI) ───────────────────────────
DATABASE_URL="postgresql://postgres.zcbklrgrawjsshpoyolr:[HESLO]@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.zcbklrgrawjsshpoyolr:[HESLO]@aws-1-eu-central-1.pooler.supabase.com:5432/postgres"
```

> Anon key nájdeš v Supabase Dashboard → **Settings → API → Project API keys → anon public**.

### Supabase projekt

| | |
|---|---|
| Project ID | `zcbklrgrawjsshpoyolr` |
| Account | `you@h4dk3d.me` (you640's Org) |
| Region | EU Central (Frankfurt) |
| Dashboard | https://supabase.com/dashboard/project/zcbklrgrawjsshpoyolr |
| Tabuľky (SQL editor) | https://supabase.com/dashboard/project/zcbklrgrawjsshpoyolr/editor/42124?schema=public |
| Auth providers | https://supabase.com/dashboard/project/zcbklrgrawjsshpoyolr/auth/providers |

---

## Stránky a routy

Produkčná doména: **`https://papi-hair-design.vercel.app`**

| Route | Plná URL (Vercel) | Auth | Popis |
|-------|-------------------|:----:|-------|
| `/` | https://papi-hair-design.vercel.app/ | — | Landing / luxusná úvodná stránka |
| `/booking` | https://papi-hair-design.vercel.app/booking | — | Verejná rezervácia zákazníka |
| `/demo` | https://papi-hair-design.vercel.app/demo | — | Feature showcase |
| `/auth` | https://papi-hair-design.vercel.app/auth | — | Štandardné prihlásenie / registrácia |
| `/papihairsalon2026` | https://papi-hair-design.vercel.app/papihairsalon2026 | — | Prihlásenie personálu (skryté) |
| `/reception` | https://papi-hair-design.vercel.app/reception | 🔒 employee+ | Recepcia — denný prehľad |
| `/admin` | https://papi-hair-design.vercel.app/admin | 🔒 admin+ | Admin dashboard |
| `/admin/calendar` | https://papi-hair-design.vercel.app/admin/calendar | 🔒 admin+ | Kalendár rezervácií |
| `/admin/appointments` | https://papi-hair-design.vercel.app/admin/appointments | 🔒 employee+ | Správa rezervácií |
| `/admin/employees` | https://papi-hair-design.vercel.app/admin/employees | 🔒 admin+ | Správa zamestnancov |
| `/admin/services` | https://papi-hair-design.vercel.app/admin/services | 🔒 admin+ | Správa služieb |
| `/admin/customers` | https://papi-hair-design.vercel.app/admin/customers | 🔒 admin+ | Správa zákazníkov |
| `/admin/settings` | https://papi-hair-design.vercel.app/admin/settings | 🔒 admin+ | Nastavenia salóna |
| `/admin/my` | https://papi-hair-design.vercel.app/admin/my | 🔒 employee+ | Môj profil / zmena hesla |
| `/privacy` | https://papi-hair-design.vercel.app/privacy | — | Ochrana osobných údajov |
| `/privacy-policy` | https://papi-hair-design.vercel.app/privacy-policy | — | Podmienky (alias) |
| `/terms` | https://papi-hair-design.vercel.app/terms | — | Obchodné podmienky |
| `/diagnostics` | https://papi-hair-design.vercel.app/diagnostics | — | Diagnostika (dev) |
| `/install` | https://papi-hair-design.vercel.app/install | — | PWA inštalačný sprievodca |
| `/offline` | https://papi-hair-design.vercel.app/offline | — | Offline fallback |
| `*` | https://papi-hair-design.vercel.app/čokoľvek | — | 404 Not Found |
### 7. Deployment Preparedness (F10)
- **Routing Support**: Added `public/.htaccess` (for Apache servers like Websupport) and `public/_redirects` (for Netlify/Vercel) to ensure React Router client-side routes (like `/booking` and `/admin`) work out-of-the-box upon direct hits without returning 404 errors.

## Verification Done

- **Linting**: PASSED (`npm run lint` clean).
- **Type-checking**: PASSED (`npx tsc --noEmit` clean).
- **Responsive E2E Tests**: PASSED (80/80 tests on all certified viewports).
- **Production Build**: SUCCESSFUL (`npm run build`).
- **Role-Based Access**: Verified that employees see only their own data and owners see everything.
- **Node.js Environment**: Upgraded to v22.22.0 to support Vite 7 requirements.

- Checked RLS policies in the migration script.
- Verified filtering logic for employees in `CalendarPage.tsx` and `BookingPage.tsx`.
- Confirmed the multi-column day view implementation in `CalendarBodyDay.tsx`.
- Ensured color mapping in `BookingCalendarEvent.tsx` supports dynamic HEX values.
- Validated role-based route protection in `App.tsx`.
- Confirmed the Secret Salon profile picker functions correctly.

No active Firebase references were found in the critical paths (fetching businesses, services, appointments).
| `/diagnostics` | DiagnosticsPage | — | Test Supabase pripojenia |
| `/privacy` | PrivacyPage | — | Zásady ochrany súkromia |
| `/reception` | ReceptionPage | ✅ | Recepcia / front desk |
| `/admin` | DashboardPage | ✅ Admin | Dashboard |
| `/admin/calendar` | CalendarPage | ✅ Admin | Kalendár termínov |
| `/admin/appointments` | AppointmentsPage | ✅ Admin | Zoznam termínov |
| `/admin/employees` | EmployeesPage | ✅ Admin | Správa zamestnancov |
| `/admin/services` | ServicesPage | ✅ Admin | Katalóg služieb |
| `/admin/customers` | CustomersPage | ✅ Admin | Databáza zákazníkov |
| `/admin/settings` | SettingsPage | ✅ Admin | Nastavenia prevádzky |
| `/admin/my` | MySchedulePage | ✅ Employee | Osobný rozvrh |

> `/papihairsalon2026` nie je nikde verejne linkovaná. Prihlasovacie emaile sa čítajú z `VITE_PAPI_EMAIL`, `VITE_MISKA_EMAIL`, `VITE_MATO_EMAIL`.

---

## Štruktúra projektu

```
loveable-PHDbooking-finale-3-3-26/
├── src/
│   ├── App.tsx                        # Routing
│   ├── main.tsx                       # Entry point
│   ├── pages/
│   │   ├── SalonLoginPage.tsx         # /papihairsalon2026 – personál login (WebGL)
│   │   ├── BookingPage.tsx            # Verejná rezervácia
│   │   ├── DiagnosticsPage.tsx        # Supabase diagnostika
│   │   ├── Auth.tsx                   # Štandardné prihlásenie
│   │   ├── LiquidPlayground.tsx       # Landing page
│   │   └── admin/                     # Admin stránky
│   ├── components/
│   │   ├── AdminLayout.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── booking/
│   │   ├── booking-calendar/          # WebGL-enhanced kalendár
│   │   └── ui/                        # shadcn/ui (70+ komponentov)
│   ├── contexts/
│   │   └── AuthContext.tsx            # Globálny auth stav (Supabase)
│   ├── hooks/
│   │   ├── useBusinessInfo.ts
│   │   └── useWebAuthn.ts
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts              # Supabase klient
│   │       ├── types.ts               # Auto-generované DB typy
│   │       └── createPublicBooking.ts # Edge function wrapper
│   └── lib/
│       ├── availability.ts
│       ├── timezone.ts
│       └── offline/                   # Dexie IndexedDB
├── supabase/
│   ├── config.toml                    # project_id = zcbklrgrawjsshpoyolr
│   ├── functions/                     # Edge Functions (Deno)
│   └── migrations/                    # SQL migrácie
├── prisma/
│   └── schema.prisma                  # Prisma schéma (Supabase PostgreSQL)
├── docs/                              # Dokumentácia
├── public/
│   ├── papi.webp                      # Foto – Papi
│   ├── miska.webp                     # Foto – Miska
│   └── mato.webp                      # Foto – Mato
├── .env                               # Lokálne premenné (nekopíruj do gitu!)
├── .env.example                       # Vzor premenných
├── vite.config.ts
├── tailwind.config.ts
└── package.json
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

Hodiny sú uložené v tabuľke `business_hours` (Supabase) a sú **jediným zdrojom pravdy** pre celý systém:

- Zobrazenie "Otvorené / Zatvorené" na stránke `/booking`
- Generovanie dostupných termínov (slot generation v `BookingPage.tsx`)
- Hook `useBusinessInfoSupabase.ts` → `computeOpenStatus()` + `computeNextOpening()`

**Zmena hodín** — spusti v Supabase SQL Editore:
```sql
UPDATE business_hours
SET start_time = '09:00', end_time = '18:00'
WHERE business_id = 'a1b2c3d4-0000-0000-0000-000000000001'
  AND day_of_week = 'monday';
```

Alebo cez admin panel: `/admin/settings` → sekcia Pracovné hodiny.

---

## Databáza a migrácie

### Hlavné tabuľky

| Tabuľka | Popis |
|---------|-------|
| `profiles` | Profily užívateľov |
| `businesses` | Prevádzky s nastaveniami |
| `memberships` | Vzťah profil ↔ prevádzka ↔ rola |
| `employees` | Zamestnanci (farba, kalendár, bookable flag) |
| `employee_services` | Prepojenie zamestnanec ↔ služba |
| `services` | Katalóg služieb |
| `appointments` | Rezervácie |
| `customers` | Zákazníci |
| `business_hours` | Pracovné hodiny po dňoch |
| `business_date_overrides` | Výnimky (sviatky) |
| `passkeys` | WebAuthn credentials |

### RLS pomocné funkcie

```sql
is_business_admin(user_id uuid, business_id uuid)    → boolean
is_business_employee(user_id uuid, business_id uuid) → boolean
get_employee_id(user_id uuid, business_id uuid)      → uuid
rpc_get_public_business_info(_business_id uuid)      → json
```

### Migrácie (Supabase CLI)

```sh
cd "c:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26"

# Prepojiť na produkčný projekt
supabase link --project-ref zcbklrgrawjsshpoyolr

# Vytvoriť novú migráciu
supabase migration new nazov-migracie

# Pushnúť migrácie na produkciu
supabase db push

# Lokálny stack (Docker)
supabase start
supabase db reset
```

---

## Edge Functions

| Funkcia | Popis |
|---------|-------|
| `create-public-booking` | Vytvorenie rezervácie, validácia, e-mail |
| `claim-booking` | Priradenie rezervácie k účtu |
| `sync-push` | Offline → server (idempotentné) |
| `sync-pull` | Server → offline DB |
| `send-booking-email` | SMTP e-mailové potvrdenie |
| `webauthn-register` | Registrácia passkey |
| `webauthn-authenticate` | Prihlásenie passkey |
| `seed-demo-accounts` | Demo dáta (len dev) |

---

## Offline podpora

```
Online  ──▶  Supabase Cloud
               ↕  sync každých 30s
Offline ──▶  IndexedDB (Dexie)
               ├── appointments  (lokálna kópia)
               ├── queue         (čakajúce akcie)
               └── meta          (čas posledného syncu)
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

- **RLS** – každá tabuľka, dáta izolované podľa `business_id`
- **Multi-tenant** – každá prevádzka vidí iba svoje dáta
- **Passkeys (WebAuthn)** – passwordless biometrické prihlásenie
- **Role-based access** – 4 roly: `owner › admin › employee › customer`
- **Zod validácia** – vstupy validované na FE aj v edge functions
- **SMTP secrets** – v Supabase edge function secrets (nie v kóde)
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
| `vendor-supabase` | @supabase/supabase-js | ~46 kB |
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
| `VITE_SUPABASE_URL` | `https://zcbklrgrawjsshpoyolr.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon key zo Supabase Dashboard → Settings → API |
| `VITE_PAPI_EMAIL` | `papi@papihairdesign.sk` |
| `VITE_MISKA_EMAIL` | `miske@papihairdesign.sk` |
| `VITE_MATO_EMAIL` | `mato@papihairdesign.sk` |
| `VITE_VERCEL` | `true` |
| `VITE_RECAPTCHA_SITE_KEY` | voliteľné — reCAPTCHA v3 site key |

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

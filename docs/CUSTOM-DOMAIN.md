# Vlastná doména: booking.papihairdesign.sk

Poznamka:
- toto je tactical domain setup dokument
- pre sirsi deploy a operations kontext pozri [Operations](OPERATIONS.md)

V projekte je nastavená produkčná doména **https://booking.papihairdesign.sk**.

## Čo je v kóde

- **index.html:** `canonical` URL, `og:url` a `twitter:url` s `https://booking.papihairdesign.sk/`
- **PWA manifest:** `start_url: "/booking"` (relatívna – na tejto doméne bude `/booking`)

## Pripojenie domény v hostingu

### Firebase Hosting

1. [Firebase Console](https://console.firebase.google.com/) → projekt **hairchainger-main-876665-176e8** → **Hosting** → **Vlastné domény**.
2. **Pridať vlastnú doménu** → zadať `booking.papihairdesign.sk` → dokončiť (Support email už nastavený).
3. **DNS u poskytovateľa** (Websupport, Cloudflare, atď.) – pridať záznam podľa toho, čo Firebase zobrazí. Typický prípad (overenie / nasmerovanie na Firebase):

   | Typ záznamu | Názov (host) | Hodnota (cieľ) |
   |-------------|--------------|----------------|
   | **CNAME**   | `booking` alebo `booking.papihairdesign.sk` | `hairchainger-main-876665-176e8.web.app` |

   - **Názov:** Podľa poskytovateľa buď len `booking` (subdoména), alebo celé `booking.papihairdesign.sk`.
   - **Hodnota:** `hairchainger-main-876665-176e8.web.app` (bez `https://`).
4. Po uložení DNS počkať na propagáciu (minúty až hodiny). V Firebase Console → Hosting → Vlastné domény skontrolovať stav; po overení Firebase doménu aktivuje a vydá SSL.

### Vercel preview caveat

Repo je stale napojene aj na Vercel preview deploymenty, ale:
- Vercel tu nie je canonical production hosting
- custom production domena ma ostat naviazana na Firebase Hosting flow
- ak sa na Verceli zobrazi preview deployment URL, nema sa zamienat s produkcnou domenou `booking.papihairdesign.sk`

Preto:
- production custom domain ries cez Firebase
- Vercel domain settings ber len ako preview-layer diagnostiku, nie ako source of truth

## Firebase Auth (redirecty)

Ak používate prihlásenie (email link, OAuth), v **Firebase Console** → **Authentication** → **Settings** → **Authorized domains** pridajte `booking.papihairdesign.sk`.

## Premenné prostredia

Pri deployi môžete nastaviť napr.:

- `VITE_APP_URL=https://booking.papihairdesign.sk` (ak ho niekde v kóde používate)

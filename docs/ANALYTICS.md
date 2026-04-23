# Analytics – čo máte a kde to nájdete

Poznamka:
- tento dokument je prakticky analytics-specific doplnok
- canonical product, operations a compliance kontext najdes v [README.md](../README.md), [Operations](OPERATIONS.md) a [Security & Compliance Baseline](SECURITY-COMPLIANCE.md)

Máte **jednu** Google Analytics 4 (GA4) vlastnosť. Je rovnaká či ju otvoríte z **Firebase** alebo z **Google Analytics**.

---

## Váš Measurement ID

| Hodnota | Kde sa používa |
|--------|-----------------|
| **G-RQR6XKDKT4** | index.html (gtag.js), Firebase config (`measurementId`) |

---

## Kde overiť / spravovať Analytics

### 1. Firebase (ak ste pridali web app do projektu hairchainger-main-876665-176e8)

- **URL:** https://console.firebase.google.com/
- **Krok:** Projekt **hairchainger-main-876665-176e8** → ozubené koleso (**Project settings**) → sekcia **Your apps** → vyberte webovú aplikáciu.
- **Nájdete:** `measurementId: G-RQR6XKDKT4` (a možnosť „Open in Google Analytics“).

### 2. Google Analytics 4 (priamo)

- **URL:** https://analytics.google.com/
- **Krok:** **Admin** (ľavý dolný roh) → **Data streams** → vyberte web stream (napr. **hairchainger-main-876665-176e82026**).
- **Nájdete:** **Measurement ID** = `G-RQR6XKDKT4`.

Oba prístupy ukazujú na **tú istú** GA4 vlastnosť; Firebase len odkazuje na ňu.

---

## Čo v projekte posiela dáta do GA4

1. **Google tag / Firebase Analytics** cez `src/lib/analytics.ts` – consent-aware GA4 baseline pre page analytics.
2. **Sentry** v `src/main.tsx` – runtime error tracking, tracing a replay pre produkciu.
3. **App diagnostics callable** – lightweight produkčná diagnostics vrstva pre kritické klientské chyby (`runtime_error`, `unhandled_rejection`, `bootstrap_error`), zapisovaná do kolekcie `app_diagnostics` s retenčným cleanupom.

GA4 stále používa **G-RQR6XKDKT4**, takže máte jednu GA4 vlastnosť, nie dve.
Diagnostická vrstva (`Sentry` + `app_diagnostics`) je od GA4 oddelená a slúži skôr na debugging a incident review než na marketing analytics.

---

## Rýchle linky

| Čo | URL |
|----|-----|
| Firebase Console (projekt) | https://console.firebase.google.com/project/hairchainger-main-876665-176e8/settings/general |
| Google Analytics – Admin | https://analytics.google.com/ |
| Pridať vlastnosť (Search Console) | https://search.google.com/search-console/welcome |

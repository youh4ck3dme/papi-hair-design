# Asset Inventory

## 1. Purpose

Tento dokument rozdeluje projekt na tri prakticke vrstvy:
- co je uz dnes prenositelne ako produktove jadro
- co je stale PAPI-specific a teda nie je tenant-neutral
- co treba odtenantizovat pred white-label alebo multi-tenant smerom

Nie je to marketingovy zoznam. Je to pracovny inventory pre:
- demo tenant
- white-label readiness
- buyer / due diligence diskusie
- realisticke rozhodnutia o tom, co sa da predat ako asset a co este nie

## 2. Reusable product core

Toto su casti, ktore uz dnes vyzeraju ako produktove jadro, nie ako jednorazovy salon hack.

### Public booking core
- public booking flow na `/booking`
- service, employee a slot selection
- booking hold + confirm flow
- booking history access cez tokenized links
- Google Calendar a `.ics` export
- auth/account claim flow pre customera

### Staff and operations core
- admin dashboard
- admin calendar
- appointments management
- customers management
- employees management
- services + subcategories
- reception mode
- employee self schedule view

### Platform and safety core
- Firebase Auth + Firestore + Functions model
- business-scoped membership model
- backend-controlled booking mutations
- public snapshot read path
- CI, Vitest, Playwright, merge discipline
- consent logging, retention cleanup, partial audit trail

## 3. PAPI-specific assets that are not tenant-neutral

Toto su casti, ktore stale hovoria pravdu o jednej konkretnej znacke alebo jednej konkretnej prevadzke.

### Branding and domain
- `booking.papihairdesign.sk`
- `papihairdesign.sk`
- `Papi Hair Design`
- brand logo, brand copy a contact metadata

Najviditelnejsie miesta:
- [C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\src\lib\seoStructuredData.ts](C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\src\lib\seoStructuredData.ts)
- [C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\src\pages\PrivacyPage.tsx](C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\src\pages\PrivacyPage.tsx)
- [C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\src\i18n\sk.json](C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\src\i18n\sk.json)
- [C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\src\i18n\en.json](C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\src\i18n\en.json)

### Default business assumptions
- default business fallback `papi-hair-design-main`
- legacy business fallback list
- demo/public booking surfaces naviazane na default tenant

Najdolezitejsie miesta:
- [C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\src\lib\businessIds.ts](C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\src\lib\businessIds.ts)
- [C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\src\integrations\firebase\useBookingDataFirebase.ts](C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\src\integrations\firebase\useBookingDataFirebase.ts)
- [C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\src\components\calendar\MobileCalendarShell.tsx](C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\src\components\calendar\MobileCalendarShell.tsx)

### Bootstrap and role seeding
- bootstrap owner email allowlist
- bootstrap default business id
- forced salon role seeding for named staff accounts

Najdolezitejsie miesta:
- [C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\functions\src\bootstrapAdminAccess.ts](C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\functions\src\bootstrapAdminAccess.ts)
- [C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\functions\src\enforceSalonRoles.ts](C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\functions\src\enforceSalonRoles.ts)
- [C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\src\lib\adminAllowlist.ts](C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\src\lib\adminAllowlist.ts)

### Email and calendar branding
- customer/admin email copy stale via PAPI brand
- calendar export UID suffix via `@papihairdesign.sk`
- public booking base URL fallback via canonical PAPI domain

Najdolezitejsie miesta:
- [C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\functions\src\emailQueue.ts](C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\functions\src\emailQueue.ts)
- [C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\functions\src\calendarInvite.ts](C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\functions\src\calendarInvite.ts)
- [C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\functions\src\publicBookingAccess.ts](C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\functions\src\publicBookingAccess.ts)
- [C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\src\lib\calendarExport.ts](C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26\src\lib\calendarExport.ts)

## 4. What is already tenant-safe enough

Tieto vrstvy maju dobry zaklad aj pre buduci multi-tenant model.

### Access model
- canonical membership document `${uid}_${businessId}`
- business-scoped `requireMembership(...)` helper na backend strane
- route gating oddelene od raw auth session

### Rules and write discipline
- jadrove kolekcie pouzivaju business-aware Firestore rules
- booking claim/history/consent/access kolekcie su server-only
- `page_views` su po poslednom hardeningu business-scoped a owner/admin-readable

### Booking mutation discipline
- create / confirm / cancel / claim flow nejde cez naivny klientsky write
- backend overuje business, slot collisions a token identity

## 5. Tenant blockers that still matter

Toto su hlavne veci, ktore dnes blokuju realny white-label alebo self-serve onboarding.

1. Default business fallback
- public a demo flowy stale rátajú s jednym hlavnym business ID

2. Brand-specific bootstrap
- onboarding admina a role enforcement je stale naviazany na konkretne emaily a jednu znacku

3. Brand-specific public metadata
- domain, emaily, legal texty, SEO a calendar UID su stale PAPI-specific

4. Manual tenant operating model
- novy tenant by dnes este vyzadoval manualny bootstrap, seed a konfiguraciu

5. Single-brand copy debt
- cast public, email a docs vrstvy stale hovori o jednom salone, nie o generickej platforme

## 6. Honest packaging truth today

### What can be honestly described as the product
- booking engine
- admin and reception operations shell
- role-based staff surface
- backend mutation discipline
- testing and release setup

### What is still partly tenant-specific implementation
- branding
- domain and contact metadata
- bootstrap flows
- some public defaults
- demo content

## 7. Recommended next moves from this inventory

1. oddelit brand config od product core
2. nahradit default business fallback realnym tenant resolver modelom
3. prekopat bootstrap a role seeding na tenant-safe provisioning
4. pripravit neutral demo tenant
5. az potom vazne hovorit o white-label alebo self-serve onboarding

## 8. Executive verdict

Produktove jadro uz dnes existuje a je hodnotne. To, co este chyba, nie je “dopisat zopar stringov”, ale odpojit prevadzkovu pravdu jednej znacky od platformovej pravdy systemu.

To je dolezity rozdiel:
- jadro je predajne a pouzitelne uz dnes
- white-label / multi-tenant vrstva este nie je hotova

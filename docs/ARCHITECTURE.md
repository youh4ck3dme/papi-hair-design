# Architecture

## 1. System overview

Projekt je Firebase-first webova aplikacia s jednou React SPA frontend vrstvou a jednou Cloud Functions backend vrstvou. Dizajnovo vyzera ako jeden produkt, ale architektonicky ma tri jasne casti:
- public booking surface
- authenticated staff surface
- backend orchestration a automation vrstva

## 2. Runtime topology

### Frontend
- React 18 + Vite 7 + TypeScript
- React Router 6 route tree v `src/App.tsx`
- UI vrstva postavena na Tailwinde, Radix komponentoch a vlastnom `phd-design-system.css`
- PWA spravanie cez `vite-plugin-pwa`

### Backend
- Firebase Auth pre identity
- Firestore pre operational data
- Cloud Functions pre booking mutacie, audit, emaily a cleanup schedulery
- Firebase Hosting pre SPA deploy a rewrite routing
- Firestore Send Email extension ako fallback email delivery vrstva

### Supporting systems
- Sentry pre error telemetry
- Google Analytics s consent-aware gatingom
- Google Calendar a `.ics` export cez frontend helper a backend invite endpoint

## 3. Application surfaces

### Public surface
Hlavne routes:
- `/`
- `/booking`
- `/auth`
- `/my-account`
- `/pricing`
- `/privacy`
- `/terms`

Hlavna zodpovednost:
- first impression a trust layer
- booking conversion
- account claim a history access
- calendar export pre potvrdene rezervacie

### Staff surface
Hlavne routes:
- `/admin/calendar`
- `/admin/appointments`
- `/admin/employees`
- `/admin/customers`
- `/admin/settings`
- `/admin/my`
- `/reception`

Hlavna zodpovednost:
- salon operations
- planovanie a zasahy do rezervacii
- sprava sluzieb, zamestnancov a policy
- staff self-service a reception workflows

## 4. Route architecture

### App shell patterns
`src/App.tsx` kombinuje tieto vrstvy:
- `PublicChromeLayout` pre public look and feel
- `AuthShell` pre auth-aware routes
- `ProtectedRoute` pre role gating
- lazy-loaded pages pre performance a mensi public initial bundle

### Auth boundaries
- signed-out public user vie fungovat na public routes
- booking read path vie pouzit anonymous auth, ked to Firestore rules vyzaduju
- owner, admin, employee a customer role sa odvodzuju z `memberships`

### Current route map

#### Public and semi-public
- `/`
- `/demo`
- `/offline`
- `/install`
- `/papihairsalon2026`
- `/privacy`
- `/privacy-policy`
- `/terms`
- `/booking`
- `/pricing`
- `/my-account`
- `/auth`
- `/bootstrap`
- `/diagnostics`
- `/dashboard/history`

#### Protected staff and ops
- `/reception`
- `/admin`
- `/admin/calendar`
- `/admin/appointments`
- `/admin/employees`
- `/admin/services`
- `/admin/customers`
- `/admin/settings`
- `/admin/my`

## 5. Identity and role model

### Identity sources
- Firebase Auth user
- Firestore `profiles/{uid}`
- Firestore `memberships/{membershipId}`

### Primary roles
- `owner`
- `admin`
- `employee`
- `customer`

### Important behavior
- po prihlaseni sa spusta membership normalization cez backend callable `normalizeMemberships`
- auth context potom sklada effective user state z Auth + profile + memberships
- route access a feature availability sa neriesi len podla `auth.currentUser`, ale podla role mappingu

## 6. Data model

### Publicly relevant collections
- `public_snapshots`
- `businesses`
- `services`
- `service_subcategories`
- `employees`
- `business_hours`
- `business_date_overrides`

### Booking and customer domain
- `appointments`
- `customers`
- `booking_claims`
- `booking_history_access`
- `booking_holds`

### Staff and organization domain
- `profiles`
- `memberships`
- `employee_services`
- `schedules`
- `time_blocks`
- `business_quick_links`
- `onboarding_answers`

### Audit and compliance domain
- `consent_events`
- `appointment_status_audit`
- `calendar_action_audit`
- `_ratelimits`
- `ops_health`
- `page_views`

## 7. Firestore access model

High-level security model v `firestore.rules`:
- public anonymous flows necitaju vsetko nazivo, ale preferuju `public_snapshots`
- customer data nie su otvorene verejne; pristup ide cez auth a tokenized history access flow
- staff kolekcie su chranene cez business-scoped membership checks
- viacere citlive kolekcie su server-only a klient na ne nema write access

Silna stranka:
- rules nie su flat a naivne; su zamerne business-scoped

Caveat:
- pri buducom multi-tenant SaaS bude treba dotiahnut role helpers, auditability a tenant provisioning este systemovejsie

## 8. Public booking read path

Frontend hook `useBookingDataFirebase` robi toto:
1. zabezpeci auth-compatible session, ak treba aj anonymne
2. pokusi sa nacitat `public_snapshots/{businessId}`
3. ak snapshot chyba, fallbackne na live read z kolekcii
4. posklada business, services, subcategories, employees, business hours a overrides

Preco to existuje:
- rychlejsi booking page first load
- mensi tlak na live multi-query read path
- lepsi operational control cez snapshot rebuild

## 9. Booking mutation flows

Klucove backend functions:
- `createBookingHold`
- `confirmBooking`
- `createPublicBooking`
- `claimBooking`
- `resolveBookingAccountState`
- `cancelCustomerBooking`
- `adminUpdateBookingStatus`
- `adminCalendarQuickAction`
- `lookupBookingHistory`
- `downloadBookingIcs`

Pattern:
- klient neposiela vsetko naslepo do Firestore
- kriticke mutacie idu cez backend validation a business rules
- history access, email sending a calendar export sa riesia na backend strane alebo cez backend-generated links

## 10. Cloud Functions map

### Booking and customer flows
- `claimBooking`
- `resolveBookingAccountState`
- `createPublicBooking`
- `createBookingHold`
- `confirmBooking`
- `getPublicAvailabilityConflicts`
- `lookupBookingHistory`
- `cancelCustomerBooking`
- `downloadBookingIcs`

### Staff and admin flows
- `adminUpdateBookingStatus`
- `adminCalendarQuickAction`
- `listBookableProviders`
- `bootstrapAdminAccess`
- `enforceSalonRoles`

### Email and messaging
- `queueRegistrationWelcomeEmail`
- `saveSmtpConfig`

### Data maintenance and sync
- `syncOfflineData`
- `importMigrationData`
- `normalizeMemberships`
- `cleanupExpiredHolds`
- `cleanupComplianceData`
- `rebuildPublicSnapshot`

### Payments and commercial hooks
- `createCheckoutSession`

### Event-driven rebuild and sync hooks
- `onProfileWriteSyncEmployeePhoto`
- `onBusinessWrite`
- `onServiceWrite`
- `onServiceSubcategoryWrite`
- `onEmployeeWrite`
- `onBusinessHoursWrite`
- `onDateOverrideWrite`
- `onEmployeeServiceWrite`

## 11. Email architecture

Email vrstva je centralizovana hlavne v `functions/src/emailQueue.ts`.

Aktualne pokryva:
- customer booking confirmation
- customer cancellation variants
- admin notifications
- registration welcome flow
- calendar CTA pre potvrdene rezervacie

Dolezite principy:
- absolute production URLs
- contact CTA fallbacky
- history access link logic
- Google Calendar + `.ics` len tam, kde dava zmysel, teda pre potvrdeny termin

## 12. Calendar export architecture

Existuju dve vrstvy:
- frontend success page helper pre okamzity export po rezervacii
- backend `.ics` endpoint `/calendar/invite.ics` pre email CTA a shareable calendar download

Ciel:
- rovnaky event title, description a filename napriec frontendom aj emailom
- ziadne rozdielne wordingy pre ten isty booking event

## 13. Write-path discipline

Projekt zamerne nefunguje tak, ze klientsky frontend moze zapisovat vsetko vsade.

Pouzity model:
- public read flows idu prednostne cez snapshot
- citlive booking mutacie idu cez backend functions
- staff operations maju bud klientsky write na explicitne povolene kolekcie, alebo backend quick-action flows
- server-only kolekcie su rezervovane pre backend a scheduler logiku

Toto je jeden z hlavnych dovodov, preco sa z toho da casom robit serioznejsia platforma.

## 14. Admin calendar architecture

Admin kalendar je high-value operational surface.

Dnes pokryva:
- denny, tyzdenny a mesacny pohlad
- reservations a time blocks
- long press behavior na mobile
- quick actions pre volny slot vs obsadeny event

Strategicky vyznam:
- je to najlepsi priklad toho, ze produkt uz nie je len booking landing, ale realny ops tool

## 15. Compliance and retention architecture

Aktualny baseline:
- cookie consent pre analytics
- consent logging do backendu
- retention scheduler `cleanupComplianceData`
- appointment status audit
- ciastocny calendar action audit

Co je dobre:
- compliance uz nie je len text v privacy page, ale existuje aj runtime enforcement pre cast dat

Co este nie je kompletne:
- plny admin audit trail napriec employees, settings a customers
- formalny DSAR/export workflow ako samostatny production feature shell

## 16. PWA and service worker considerations

Projekt ma PWA vrstvu, ale release hygiene je dolezita:
- nove deploye maju spoliehat na hashovane assety, nie na hard refresh ritual
- service worker flow treba vzdy overit po release
- agresivne update forcing bez kontroly by mohlo rozbit session alebo stale asset references

## 17. SaaS readiness - architectural truth

Tento system je architektonicky vhodny kandidat pre vertical SaaS, pretoze uz ma:
- role model
- business-scoped data
- backend-controlled mutacie
- audit a compliance zaklad
- testovaciu pipeline
- operational admin surface

Ale este nema plne dotiahnute:
- tenant provisioning lifecycle
- tenant-specific secrets a config isolation
- billing a subscription orchestration
- tenant-aware support tooling
- formalnu migration story pre viac samostatnych klientov

## 18. Known architectural constraints

- produkt je dnes optimalizovany primarne pre jednu brand identitu
- cast operations je stale manualnejsia, nez by bolo idealne pre self-serve SaaS
- niektore release paths su cielene deploye, nie one-click universal deploy
- public snapshot model treba udrziavat konzistentny cez rebuild hooks a operational discipline

# Security and Compliance Baseline

## 1. Purpose

Toto nie je pravnicka nahrada za formalny audit. Je to technicky a operacny prehlad toho, ako je projekt dnes postaveny z pohladu security, privacy, compliance a governance.

## 2. Security model in practice

### Identity and access
- identity ide cez Firebase Auth
- aplikacna autorizacia sa nerobi len podla toho, ci user existuje, ale podla `memberships`
- roly su minimalne: `owner`, `admin`, `employee`, `customer`

### Firestore security
- Firestore rules su business-scoped, nie flat open model
- citlive kolekcie ako `booking_claims`, `booking_history_access`, `consent_events` a `_ratelimits` su server-only write paths
- public booking read flow preferuje `public_snapshots`, nie nekontrolovany priamy read celeho modelu

### Backend mutation discipline
- kriticke booking a admin akcie idu cez Cloud Functions
- to znizuje riziko, ze klient obide business logic len priamym write requestom

## 3. Current compliance baseline

### GDPR-related foundations
- privacy page existuje a je realne udrziavana
- consent logging existuje runtime, nie len ako UI checkbox
- retention cleanup scheduler existuje pre vybrane compliance kolekcie
- appointment status audit existuje

### Cookie law baseline
- analytics su consent-gated
- marketing cookies sa netvaria ako aktivne, ked produkt ich realne nepouziva

### Data minimization direction
- produkt sa snazi rozlisovat public snapshot data od citlivejsich operational dat
- history access ide cez tokenizovany flow, nie otvoreny listing osobnych dat

## 4. What is good today

Silne stranky dnes:
- rules a backend writes maju realnu disciplinu
- compliance uz nie je len text v footeri
- consent events a retention maju runtime oporu
- targeted deploy a release hygiene znizuju chaos pri produkcnych zmenach

## 5. What is not yet fully complete

Poctivo, nie je este hotove:
- plny admin audit trail napriec employees, settings a customers
- formaly DSAR self-service/export workflow ako samostatny produktovy modul
- uplne formalizovana retention governance pre vsetky business data vrstvy
- pravne finalne rozhodnutie a wording okolo Sentry legal basis, ak sa ma brat ako necessary telemetry

## 6. Logging and audit stance

### What exists
- consent events
- appointment status audit
- cast calendar action audit logiky
- CI a deploy signal cez GitHub Actions

### What still needs work
- sirsi admin change log
- jasnejsie operational review rytmy pre audit a retention data
- mozno samostatna internal admin activity trail vrstva

## 7. ISO-readiness reality check

Toto dnes nie je ISO-ready produkt v formalnom zmysle. Ale uz ma niektore dobre zaklady:
- roles a access separation
- audit and retention foundations
- CI discipline
- release process
- docs and operational runbooks

Na vyssiu governance uroven by este trebalo:
- formalne ownership a change management recordy
- incident handling process
- access review rytmus
- explicitne retention register decisions
- silnejsiu evidence story pre support a auditability

## 8. Buyer and evaluator interpretation

Ak to cita buyer alebo technicky evaluator, spravna interpretacia je:
- produkt nie je security naivny
- uz existuje premysleny baseline
- ale este nie je hotovy enterprise governance shell

To je dolezity rozdiel. Je lepsie to pomenovat presne, ako predstierat certifikovanu zrelost, ktoru sme este formalne nepresli.

## 9. Safe public claims versus unsafe claims

### Safe claims today
- role-based salon operations platform
- Firebase-backed product with protected admin surfaces
- consent-aware analytics baseline
- retention cleanup for selected compliance collections

### Unsafe claims today
- fully enterprise compliant platform
- ISO-ready by certification
- complete GDPR automation suite
- complete audit trail across every staff action

## 10. Recommended next compliance steps

Najlepsie dalsie prakticke kroky:
1. dokoncit broader admin audit trail
2. formalizovat retention matrix pre business data
3. ujasnit Sentry legal basis a wording
4. doplnit jasnejsi internal governance checklist pre support a operations

Tento dokument ma pomoct hovorit o security a compliance poctivo, nie nafuknuto.

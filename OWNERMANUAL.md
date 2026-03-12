# PAPI HAIR DESIGN - Owner Manual

Prakticky navod pre majitela salonu, adminov a zamestnancov po nasadeni systemu na novy pocitac.

## Dolezite adresy

- Verejna rezervacia: `https://booking.papihairdesign.sk/booking`
- Prihlasenie: `https://booking.papihairdesign.sk/auth`
- Admin dashboard: `https://booking.papihairdesign.sk/admin`
- Admin kalendar: `https://booking.papihairdesign.sk/admin/calendar`
- Rezervacie: `https://booking.papihairdesign.sk/admin/appointments`
- Nastavenia: `https://booking.papihairdesign.sk/admin/settings`
- Recepcia: `https://booking.papihairdesign.sk/reception`
- Instalacia PWA appky: `https://booking.papihairdesign.sk/install`
- Salon login obrazovka: `https://booking.papihairdesign.sk/papihairsalon2026`

Poznamka: `papihairsalon2026` moze byt na niektorych deploymentoch vypnute. Ked je vypnute, system vas presmeruje na bezne `/auth`.

## Co nainstalovat na novy PC

Pre bezne pouzivanie systemu staci:

1. `Google Chrome` alebo `Microsoft Edge`
2. pristup na internet
3. prihlasovacie udaje kazdeho clena timu

Odporucanie:

- na recepcii alebo na hlavnom PC otvorte `/install` a nainstalujte aplikaciu ako PWA na plochu
- pouzivajte samostatne konta, nezdielajte jedno heslo pre cely tim
- na zdielanom pocitaci vypnite automaticke ukladanie hesiel do browsera

## Prvy den - checklist pre majitela

### 1. Prihlasenie a kontrola pristupu

1. Otvorte `/auth`.
2. Prihlaste sa vlastnym owner emailom.
3. Ak vas system presmeruje na `/bootstrap`, kliknite na aktivaciu admin pristupu.
4. Po uspesnom prihlaseni otvorte `/admin`.

Poznamka:

- bootstrap je jednorazova aktivacia owner/admin membershipu
- tato aktivacia funguje len pre povolene owner/admin emaily

### 2. Dokoncite uvodne nastavenie salonu

Ak sa po prvom prihlaseni zobrazi onboarding wizard, vyplnte v tomto poradi:

1. nazov salonu, telefon, email, adresa
2. otvaracie hodiny
3. sluzby a ceny
4. zamestnancov
5. pravidla rezervacii

### 3. Skontrolujte admin nastavenia

V `/admin/settings` skontrolujte:

1. `Vseobecne`
2. `Booking`
3. `Otváracie hodiny`
4. `SMTP Email`
5. `Snapshot`
6. `Profil`

Minimalne co treba urobit hned:

1. doplnit telefon a email salonu
2. potvrdit lead time, max dni dopredu a storno lehotu
3. ak chcete emailove notifikacie, doplnit SMTP
4. ulozit profil majitela

### 4. Nastavte tim

V `/admin/employees` pre kazdeho clena timu:

1. vytvorte profil
2. doplnte realny email, ak sa ma zamestnanec prihlasovat sam
3. nastavte pracovny rozvrh
4. nastavte farbu v kalendari
5. ak treba, obmedzte sluzby len na vybrane polozky

### 5. Urobte povinny smoke test

Po prvotnom nastaveni urobte hned tento test:

1. otvorte verejny booking `/booking`
2. vytvorte testovaciu rezervaciu
3. skontrolujte, ze sa ukaze v `/admin/appointments`
4. skontrolujte, ze sa ukaze v `/admin/calendar`
5. ak sa verejne data neobnovili, v `/admin/settings` spustite `Snapshot -> Rebuild`

## Prvy den - checklist pre zamestnanca

### 1. Prihlasenie

1. zamestnanec dostane vlastny email a heslo
2. prihlasi sa cez `/auth`
3. ak po prihlaseni skonci na `/booking`, manualne otvori:
   - `/admin/my` pre svoj rozvrh
   - `/admin/appointments` pre rezervacie
   - `/reception` ak pracuje na recepcii

Toto spravanie nie je chyba pouzivatela. Employee konto nema rovnaky redirect ako owner/admin konto.

### 2. Prve veci po prihlaseni

1. v `/admin/settings` doplnit meno, telefon a profilovu fotku
2. skontrolovat pracovny rozvrh
3. skontrolovat zoznam rezervacii
4. odhlasit sa a znovu prihlasit, aby sa overilo ze pristup funguje stabilne

## Dolezita technicka poznamka k zamestnancom

Samotne vytvorenie zamestnanca v `/admin/employees` neznamena automaticky admin pristup do internej casti.

Pred prvym realnym loginom zamestnanca musi byt pre jeho Firebase konto vytvoreny membership s:

- `business_id = papi-hair-design-main`
- `role = employee`

Odporucany postup v praxi:

1. owner vytvori zamestnanca v `/admin/employees`
2. zamestnanec si vytvori alebo dostane vlastne prihlasenie
3. technik alebo admin doplni membership pre dane konto

Ak membership chyba:

- zamestnanec sa sice moze prihlasit
- ale nema plny pristup do internych stranok

Ak owner/admin konto nema membership, system ho presmeruje na `/bootstrap`.

## Starší Mac - odporucany postup pre macOS Catalina

Zo zaslaneho obrazka:

- zariadenie: `iMac 21.5-inch, Late 2013`
- system: `macOS Catalina`
- RAM: `8 GB`

Prakticky zaver:

- tento Mac je vhodny skor ako browser/admin workstation
- na dlhe buildy, testy a deploy je lepsi novsi Windows PC alebo novsi Mac
- podla Apple je `macOS Big Sur` oficialne pre `iMac (2014 or later)`, takze pre `Late 2013` je Catalina hranicny oficialny strop

## Co nainstalovat najprv na tomto starom Macu

Pred Node a browserom nainstalujte:

1. Apple Command Line Tools
2. `nvm`
3. `Node.js 20 LTS`
4. `Firefox ESR`

### Baliky a prikazy

#### 1. Apple Command Line Tools

```bash
xcode-select --install
```

Po instalacii overte:

```bash
xcode-select -p
git --version
```

#### 2. nvm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

Potom restart Terminalu alebo:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```

#### 3. Node 20 LTS

```bash
nvm install 20
nvm use 20
nvm alias default 20
node -v
npm -v
```

#### 4. Firefox ESR

Stiahnite z:

- `https://www.mozilla.org/en-US/firefox/all/#product-desktop-esr`

Pre tento Mac odporucam Firefox ESR ako stabilny pracovny browser.

## Riesenie c. 2 - bez reinstalacie OS: nvm + Firefox ESR

Pouzite tento postup, ked nechcete menit macOS:

```bash
# 1. Nainstaluj nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# 2. Pouzi Node 20 LTS
nvm install 20
nvm use 20
nvm alias default 20

# 3. Browser pre dev/admin pracu
# Firefox ESR:
# https://www.mozilla.org/en-US/firefox/all/#product-desktop-esr
```

## Nahradny navod, ak nvm zlyha

Ak `nvm` zlyha alebo sa po restarte shellu nenasita, pouzite jednoduchsi fallback bez `nvm`:

### Riesenie c. 3 - oficialny Node installer + Firefox ESR

1. nainstalujte `xcode-select --install`
2. stiahnite oficialny `node-v20.pkg` z Node.js download archive
3. nainstalujte Node cez `.pkg`
4. overte:

```bash
node -v
npm -v
git --version
```

5. nainstalujte Firefox ESR

Oficialne odkazy:

- Node 20 archive: `https://nodejs.org/en/download/archive/v20`
- priamy listing latest v20.x: `https://nodejs.org/download/release/latest-v20.x/`
- Firefox ESR: `https://www.mozilla.org/en-US/firefox/all/#product-desktop-esr`

Tento fallback je vhodny, ked:

- `nvm` robi problemy v shell profile
- stary Mac ma nestabilny Terminal setup
- chcete len rychlo rozbehat browser/admin pracu a zakladny servis

## Kedy tento stary Mac nepouzivat na build/deploy

Presunte build alebo deploy na novsi stroj, ak:

1. `npm install` pada alebo trva neprimerane dlho
2. browser sa pri admin kalendari zasekava
3. pocas prace mate plnu RAM a system swapuje
4. Playwright alebo Firebase CLI su nestabilne

V takom pripade nechajte tento iMac len na:

- recepciu
- admin dashboard
- kontrolu rezervacii
- zakaznicke rezervacie v browseri

## Kratky operacny standard pre tim

Kazdy den rano:

1. otvorit appku alebo browser
2. skontrolovat `/admin/calendar`
3. skontrolovat `/admin/appointments`
4. potvrdit alebo upravit nove rezervacie
5. na konci smeny sa odhlasit

## Oficialne zdroje

- Apple Command Line Tools: `https://developer.apple.com/library/archive/technotes/tn2339/_index.html`
- Apple Big Sur compatibility: `https://support.apple.com/en-us/111980`
- Node.js v20 archive: `https://nodejs.org/en/download/archive/v20`
- Node.js latest v20.x files: `https://nodejs.org/download/release/latest-v20.x/`
- Mozilla Firefox ESR download: `https://www.mozilla.org/en-US/firefox/all/#product-desktop-esr`
- Mozilla note ze novy Firefox vyzaduje macOS 10.15 alebo vyssie: `https://support.mozilla.org/en-US/kb/firefox-users-macos-1012-1013-and-1014-users-moving-to-extended-support`

import type { ReactNode } from "react";
import {
  ArrowLeft,
  BadgeInfo,
  ChevronRight,
  Clock3,
  Cookie,
  Database,
  Globe,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { LogoIcon } from "@/components/LogoIcon";

const LAST_UPDATED = "19. apríla 2026";

type Highlight = {
  label: string;
  value: string;
  note: string;
};

type SectionLink = {
  id: string;
  label: string;
};

type Bullet = {
  title: string;
  body: string;
};

type ProviderCard = {
  label: string;
  body: string;
};

const highlights: Highlight[] = [
  {
    label: "Prevádzkovateľ",
    value: "PAPI Hair Design",
    note: "booking.papihairdesign.sk",
  },
  {
    label: "Spracúvané údaje",
    value: "Rezervácia, kontakt a technické logy",
    note: "len čo je potrebné na službu",
  },
  {
    label: "Používané systémy",
    value: "Firebase, Websupport SMTP, Sentry",
    note: "prevádzka, e-mail a monitoring",
  },
];

const sectionLinks: SectionLink[] = [
  { id: "spravca", label: "Kto spracúva údaje" },
  { id: "udaje", label: "Aké údaje zbierame" },
  { id: "ucel", label: "Na čo ich používame" },
  { id: "partnery", label: "S kým ich zdieľame" },
  { id: "cookies", label: "Cookies a úložisko" },
  { id: "bezpecnost", label: "Uchovávanie a práva" },
  { id: "kontakt", label: "Kontakt" },
];

const collectedData: Bullet[] = [
  {
    title: "Identifikačné a kontaktné údaje",
    body: "meno, priezvisko, e-mailová adresa, telefónne číslo a prípadne poznámka k rezervácii.",
  },
  {
    title: "Rezervačné údaje",
    body: "vybraná služba, dátum, čas, priradený zamestnanec, stav rezervácie a história zmien.",
  },
  {
    title: "Technické údaje",
    body: "IP adresa, typ zariadenia, prehliadač, základné logy a údaje potrebné na diagnostiku a bezpečnosť.",
  },
  {
    title: "Bezpečnostné údaje",
    body: "signály a kontroly, ktoré pomáhajú chrániť formuláre pred spamom, zneužitím a automatizovanými útokmi.",
  },
];

const purposes: Bullet[] = [
  {
    title: "Vytvorenie a správa rezervácie",
    body: "údaje používame na uloženie termínu, jeho potvrdenie a prípadnú úpravu alebo zrušenie.",
  },
  {
    title: "Komunikácia so zákazníkom",
    body: "na e-mail alebo telefón odosielame potvrdenia, pripomienky a dôležité informácie k rezervácii.",
  },
  {
    title: "Prevádzka administrácie salónu",
    body: "oprávnený personál vidí len údaje, ktoré potrebuje na vybavenie termínov a organizáciu práce.",
  },
  {
    title: "Bezpečnosť a diagnostika",
    body: "technické logy a monitorovanie používame na odhaľovanie chýb, výkonové problémy a zneužitie systému.",
  },
];

const providers: ProviderCard[] = [
  {
    label: "Firebase / Google Cloud",
    body: "hosting, databáza, autentifikácia, cloud funkcie a technická infraštruktúra rezervácií.",
  },
  {
    label: "Websupport SMTP",
    body: "doručovanie potvrdení rezervácií a ďalších e-mailov z adresy salónu.",
  },
  {
    label: "Google Analytics",
    body: "základné meranie návštevnosti a používania webu, ak je analytika povolená.",
  },
  {
    label: "Sentry",
    body: "monitorovanie chýb, výkonnostných problémov a stability aplikácie.",
  },
];

const cookies: Bullet[] = [
  {
    title: "Nevyhnutné cookies",
    body: "používame ich na prihlásenie, prevádzku rezervácie, udržanie relácie a základné bezpečnostné funkcie.",
  },
  {
    title: "Analytické cookies",
    body: "zapínajú sa len podľa nastavenia súhlasu a slúžia na lepšie pochopenie návštevnosti a správania používateľov.",
  },
  {
    title: "Reklamné cookies",
    body: "nepoužívame reklamné ani remarketingové cookies tretích strán.",
  },
];

const rights: Bullet[] = [
  {
    title: "Právo na prístup",
    body: "môžete si vyžiadať informáciu, aké údaje o vás spracúvame.",
  },
  {
    title: "Právo na opravu a výmaz",
    body: "môžete požiadať o opravu nepresných údajov alebo o vymazanie údajov, ktoré už nepotrebujeme.",
  },
  {
    title: "Právo na obmedzenie, prenosnosť a námietku",
    body: "môžete namietať spracúvanie alebo žiadať obmedzenie a prenos údajov v zákonnom rozsahu.",
  },
  {
    title: "Právo podať sťažnosť",
    body: "ak nie ste spokojní so spracúvaním, môžete sa obrátiť na dozorný orgán pre ochranu osobných údajov.",
  },
];

function SectionCard({
  id,
  icon: Icon,
  eyebrow,
  title,
  intro,
  children,
}: {
  id: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] shadow-[0_24px_60px_-42px_rgba(0,0,0,0.9)] backdrop-blur-xl"
    >
      <div className="border-b border-white/8 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary/80">
              {eyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">
              {title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-white/66 sm:text-[15px]">
              {intro}
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-4 px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

function BulletList({
  items,
  accentClass = "bg-primary",
}: {
  items: Bullet[];
  accentClass?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.title}
          className="rounded-2xl border border-white/8 bg-black/20 p-4 shadow-[0_12px_30px_-24px_rgba(0,0,0,0.85)]"
        >
          <div className="flex items-start gap-3">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${accentClass}`} />
            <div>
              <h3 className="text-sm font-semibold text-white">{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-white/65">{item.body}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white selection:bg-primary/70 selection:text-black">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(218,165,32,0.12),transparent_30%),radial-gradient(circle_at_80%_18%,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_bottom,rgba(218,165,32,0.06),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black via-black/70 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/78 transition-all hover:border-primary/25 hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowLeft size={16} />
            Späť
          </button>

          <Link
            to="/booking"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[linear-gradient(135deg,#b8860b,#daa520,#f2cf60)] px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-black shadow-[0_16px_34px_-22px_rgba(218,165,32,0.9)] transition-transform hover:scale-[1.01]"
          >
            Rezervovať
            <ChevronRight size={16} />
          </Link>
        </div>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
          <div className="overflow-hidden rounded-[2.25rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-[0_32px_80px_-52px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 rounded-full border border-primary/18 bg-primary/[0.08] px-3 py-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/85">
                  Právne informácie
                </span>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/66">
                Aktualizované {LAST_UPDATED}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-5 sm:gap-6">
              <div className="flex items-center gap-3">
                <LogoIcon size="lg" className="h-12 w-12 rounded-full border border-white/10 shadow-[0_16px_32px_-22px_rgba(0,0,0,0.95)]" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
                    PAPI HAIR DESIGN
                  </p>
                  <p className="mt-1 text-sm text-white/62">
                    booking.papihairdesign.sk
                  </p>
                </div>
              </div>

              <div className="max-w-3xl space-y-3">
                <h1 className="text-[2.6rem] font-semibold tracking-tight text-white sm:text-[3.6rem] sm:leading-[0.95]">
                  Ochrana súkromia
                </h1>
                <p className="max-w-2xl text-base leading-8 text-white/72 sm:text-lg">
                  Keď si rezervujete termín, spracúvame iba údaje potrebné na vytvorenie rezervácie,
                  doručenie potvrdenia a bezpečnú prevádzku booking systému.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                  rezervácie
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                  e-mail a telefón
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                  bezpečnosť a monitoring
                </span>
                <span className="rounded-full border border-primary/18 bg-primary/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/85">
                  bez zbytočných údajov
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[2.25rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 shadow-[0_32px_80px_-52px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/18 bg-primary/[0.08]">
                <BadgeInfo className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary/75">
                  Rýchly prehľad
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">Čo je dôležité vedieť</h2>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {highlights.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/8 bg-black/20 p-4 shadow-[0_12px_32px_-26px_rgba(0,0,0,0.9)]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white">
                    {item.value}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-white/62">
                    {item.note}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-primary/18 bg-[linear-gradient(180deg,rgba(218,165,32,0.12),rgba(218,165,32,0.04))] p-4">
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-white">Aktualizované dnes</p>
                  <p className="mt-1 text-sm leading-6 text-white/65">
                    Táto verzia odráža aktuálny booking flow, e-mailové potvrdenia a používané bezpečnostné nástroje.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
            <div className="overflow-hidden rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-5 shadow-[0_24px_58px_-40px_rgba(0,0,0,0.95)] backdrop-blur-xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary/75">
                Obsah
              </p>
              <nav className="mt-4 space-y-2">
                {sectionLinks.map((link) => (
                  <a
                    key={link.id}
                    href={`#${link.id}`}
                    className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-left text-sm font-medium text-white/72 transition-all hover:border-primary/20 hover:bg-white/[0.05] hover:text-white"
                  >
                    <span>{link.label}</span>
                    <ChevronRight className="h-4 w-4 text-white/35" />
                  </a>
                ))}
              </nav>
            </div>

            <div className="overflow-hidden rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-5 shadow-[0_24px_58px_-40px_rgba(0,0,0,0.95)] backdrop-blur-xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary/75">
                Kontakt
              </p>
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/8 bg-black/20 p-4">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-white">booking@papihairdesign.sk</p>
                  <p className="mt-1 text-sm leading-6 text-white/62">
                    Napíšte nám, ak chcete uplatniť svoje práva alebo skontrolovať údaje k rezervácii.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <main className="space-y-5">
            <SectionCard
              id="spravca"
              icon={ShieldCheck}
              eyebrow="1. Správca údajov"
              title="Kto spracúva údaje"
              intro="Správcom osobných údajov je PAPI Hair Design. Táto stránka sa týka online rezervácie, potvrdení termínov a súvisiacich administratívnych procesov salónu."
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-sm font-semibold text-white">Čo to znamená v praxi</p>
                  <p className="mt-2 text-sm leading-7 text-white/65">
                    Keď si vytvoríte rezerváciu, údaje sa použijú na jej uloženie, potvrdenie a prípadnú
                    komunikáciu o zmene termínu. Prístup k nim má len tím, ktorý rezervácie reálne spravuje.
                  </p>
                </div>
                <div className="rounded-2xl border border-primary/18 bg-[linear-gradient(180deg,rgba(218,165,32,0.12),rgba(218,165,32,0.04))] p-4">
                  <p className="text-sm font-semibold text-white">Rozsah stránky</p>
                  <p className="mt-2 text-sm leading-7 text-white/65">
                    Nejde o marketingovú stránku. Údaje spracúvame len v súvislosti s rezerváciou,
                    komunikáciou so zákazníkom a bezpečnou prevádzkou systému.
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              id="udaje"
              icon={Database}
              eyebrow="2. Dáta"
              title="Aké údaje zbierame"
              intro="Spracúvame iba údaje, ktoré sú nevyhnutné na rezerváciu, potvrdenie termínu a bezproblémovú prevádzku webu."
            >
              <BulletList items={collectedData} />
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="text-sm leading-7 text-white/65">
                  Nezbierame platobné údaje z kariet. Ak niektorý údaj nie je potrebný na rezerváciu,
                  nežiadame ho.
                </p>
              </div>
            </SectionCard>

            <SectionCard
              id="ucel"
              icon={Sparkles}
              eyebrow="3. Účel"
              title="Na čo údaje používame"
              intro="Údaje používame výlučne na rezerváciu, komunikáciu a prevádzku salónneho systému."
            >
              <BulletList items={purposes} accentClass="bg-primary/90" />
              <div className="rounded-2xl border border-primary/18 bg-[linear-gradient(180deg,rgba(218,165,32,0.12),rgba(218,165,32,0.04))] p-4">
                <p className="text-sm leading-7 text-white/65">
                  Potvrdenia rezervácií a dôležité e-maily odchádzajú cez SMTP server salónu, aby všetko
                  zostalo pod jednou doménou a komunikácia bola spoľahlivá.
                </p>
              </div>
            </SectionCard>

            <SectionCard
              id="partnery"
              icon={Globe}
              eyebrow="4. Poskytovatelia"
              title="S kým údaje zdieľame"
              intro="Dáta neposkytujeme tretím stranám na marketingové účely. Používame však technických poskytovateľov, ktorí zabezpečujú fungovanie služby."
            >
              <div className="grid gap-3 md:grid-cols-2">
                {providers.map((provider) => (
                  <div
                    key={provider.label}
                    className="rounded-2xl border border-white/8 bg-black/20 p-4 shadow-[0_12px_30px_-24px_rgba(0,0,0,0.85)]"
                  >
                    <p className="text-sm font-semibold text-white">{provider.label}</p>
                    <p className="mt-2 text-sm leading-7 text-white/65">{provider.body}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="text-sm leading-7 text-white/65">
                  Každý z týchto nástrojov spracúva len tie údaje, ktoré sú potrebné na jeho úlohu.
                </p>
              </div>
            </SectionCard>

            <SectionCard
              id="cookies"
              icon={Cookie}
              eyebrow="5. Súhlas"
              title="Cookies a lokálne úložisko"
              intro="Na fungovanie webu používame len to, čo je potrebné pre rezerváciu, prihlásenie a bezpečnosť."
            >
              <BulletList items={cookies} accentClass="bg-amber-400" />
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="text-sm leading-7 text-white/65">
                  Analytika sa zapína iba podľa nastavenia súhlasu. Reklamné alebo remarketingové cookies
                  nepoužívame.
                </p>
              </div>
            </SectionCard>

            <SectionCard
              id="bezpecnost"
              icon={LockKeyhole}
              eyebrow="6. Bezpečnosť"
              title="Uchovávanie a vaše práva"
              intro="Údaje uchovávame len po dobu nevyhnutnú na vybavenie rezervácie, históriu a splnenie zákonných povinností."
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-sm font-semibold text-white">Ako chránime údaje</p>
                  <p className="mt-2 text-sm leading-7 text-white/65">
                    Komunikácia prebieha cez zabezpečené spojenie, k údajom majú prístup len oprávnené osoby
                    a bezpečnostné nástroje pomáhajú odhaliť zneužitie alebo chyby systému.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-sm font-semibold text-white">Ako dlho ich držíme</p>
                  <p className="mt-2 text-sm leading-7 text-white/65">
                    Rezervačné údaje uchovávame tak dlho, ako je potrebné pre správu termínov a pre zákonné
                    alebo prevádzkové dôvody. Technické logy držíme kratšie, len na diagnostiku a ochranu služby.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <h3 className="text-sm font-semibold text-white">Vaše práva (GDPR)</h3>
                <div className="mt-3">
                  <BulletList items={rights} accentClass="bg-primary/90" />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              id="kontakt"
              icon={Mail}
              eyebrow="7. Kontakt"
              title="Kontaktujte nás"
              intro="Ak chcete uplatniť svoje práva, overiť údaje alebo máte otázku k tejto politike, ozvite sa nám priamo."
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="rounded-2xl border border-primary/18 bg-[linear-gradient(180deg,rgba(218,165,32,0.12),rgba(218,165,32,0.04))] p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/80">
                    E-mail
                  </p>
                  <a
                    href="mailto:booking@papihairdesign.sk"
                    className="mt-3 inline-flex text-xl font-semibold text-white transition-colors hover:text-primary"
                  >
                    booking@papihairdesign.sk
                  </a>
                  <p className="mt-3 text-sm leading-7 text-white/65">
                    Odpovieme vám čo najskôr a pomôžeme s prístupom, opravou alebo vymazaním údajov,
                    ktoré už nie sú potrebné.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/8 bg-black/20 p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                    Ďalší krok
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white/65">
                    Ak chcete rovno pokračovať k rezervácii, presmerujeme vás späť do booking flow.
                  </p>
                  <Link
                    to="/booking"
                    className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#b8860b,#daa520,#f2cf60)] px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-black transition-transform hover:scale-[1.01]"
                  >
                    Rezervovať termín
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            </SectionCard>
          </main>
        </div>
      </div>
    </div>
  );
}

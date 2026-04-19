import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  User,
  Shield,
  Scissors,
  Calendar,
  Users,
  BarChart3,
  Bell,
  Smartphone,
  Lock,
  Sparkles,
  QrCode,
  Zap,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogoIcon } from "@/components/LogoIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useTranslation } from "react-i18next";
import "@/styles/expanding-cards.css";

import cardBgHero from "@/assets/card-bg-hero.jpg";
import cardBgAccounts from "@/assets/card-bg-accounts.jpg";
import cardBgHow from "@/assets/card-bg-how.jpg";
import cardBgFeatures from "@/assets/card-bg-features.jpg";
import cardBgQr from "@/assets/card-bg-qr.jpg";

const cardBackgrounds: Record<string, string> = {
  hero: cardBgHero,
  accounts: cardBgAccounts,
  how: cardBgHow,
  features: cardBgFeatures,
  qr: cardBgQr,
};

const contentAnim = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
  exit: { opacity: 0, y: -6, filter: "blur(2px)", transition: { duration: 0.35, ease: "easeIn" } },
};

function HeroContent({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const { t } = useTranslation();
  const points = [t("demo.heroPoint1"), t("demo.heroPoint2"), t("demo.heroPoint3"), t("demo.heroPoint4")];

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
      <LogoIcon size="lg" />
      <Badge variant="outline" className="border-primary/30 bg-primary/15 text-primary">
        {t("demo.heroBadge")}
      </Badge>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
        {t("demo.heroTitle")}
        <br />
        <span className="text-primary">{t("demo.heroSub")}</span>
      </h1>
      <p className="text-sm text-muted-foreground max-w-lg">{t("demo.heroDesc")}</p>
      <div className="grid w-full max-w-lg gap-2">
        {points.map((point) => (
          <div
            key={point}
            className="flex items-center gap-2 rounded-lg border border-border/30 bg-card/25 px-3 py-2 text-left text-sm"
          >
            <Check className="h-4 w-4 text-primary shrink-0" />
            <span>{point}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button size="lg" onClick={() => navigate("/booking")}>
          {t("demo.bookBtn")}
        </Button>
        <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
          {t("demo.loginBtn")}
        </Button>
      </div>
    </div>
  );
}

function AccountsContent({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const { t } = useTranslation();

  const roleCards = [
    {
      role: t("demo.roleOwner"),
      icon: Shield,
      description: t("demo.ownerDesc"),
      benefits: [
        t("demo.ownerBenefit1"),
        t("demo.ownerBenefit2"),
        t("demo.ownerBenefit3"),
        t("demo.ownerBenefit4"),
        t("demo.ownerBenefit5"),
      ],
      impact: t("demo.ownerImpact"),
      cta: t("demo.ownerCta"),
      href: "/auth?email=papi@papihairdesign.sk",
    },
    {
      role: t("demo.roleEmployee"),
      icon: Scissors,
      description: t("demo.employeeDesc"),
      benefits: [
        t("demo.employeeBenefit1"),
        t("demo.employeeBenefit2"),
        t("demo.employeeBenefit3"),
        t("demo.employeeBenefit4"),
        t("demo.employeeBenefit5"),
      ],
      impact: t("demo.employeeImpact"),
      cta: t("demo.employeeCta"),
      href: "/auth?email=mato@papihairdesign.sk",
    },
    {
      role: t("demo.roleCustomer"),
      icon: User,
      description: t("demo.customerDesc"),
      benefits: [
        t("demo.customerBenefit1"),
        t("demo.customerBenefit2"),
        t("demo.customerBenefit3"),
        t("demo.customerBenefit4"),
        t("demo.customerBenefit5"),
      ],
      impact: t("demo.customerImpact"),
      cta: t("demo.customerCta"),
      href: "/booking",
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">{t("demo.demoTitle")}</h2>
      {roleCards.map((card) => (
        <div key={card.role} className="rounded-xl border border-border/30 bg-card/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <card.icon className="w-5 h-5 text-primary" />
            <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
              {card.role}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{card.description}</p>
          <ul className="space-y-1.5">
            {card.benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-xs">
            <span className="font-semibold text-primary">{t("demo.impactLabel")}:</span>{" "}
            <span className="text-foreground/85">{card.impact}</span>
          </div>
          <Button size="sm" variant="outline" className="w-full" onClick={() => navigate(card.href)}>
            {card.cta}
          </Button>
        </div>
      ))}
    </div>
  );
}

function HowContent() {
  const { t } = useTranslation();
  const packs = [
    {
      icon: Calendar,
      title: t("demo.pack1Title"),
      desc: t("demo.pack1Desc"),
      impact: t("demo.pack1Impact"),
    },
    {
      icon: Users,
      title: t("demo.pack2Title"),
      desc: t("demo.pack2Desc"),
      impact: t("demo.pack2Impact"),
    },
    {
      icon: Zap,
      title: t("demo.pack3Title"),
      desc: t("demo.pack3Desc"),
      impact: t("demo.pack3Impact"),
    },
    {
      icon: BarChart3,
      title: t("demo.pack4Title"),
      desc: t("demo.pack4Desc"),
      impact: t("demo.pack4Impact"),
    },
    {
      icon: Lock,
      title: t("demo.pack5Title"),
      desc: t("demo.pack5Desc"),
      impact: t("demo.pack5Impact"),
    },
    {
      icon: Bell,
      title: t("demo.pack6Title"),
      desc: t("demo.pack6Desc"),
      impact: t("demo.pack6Impact"),
    },
    {
      icon: Smartphone,
      title: t("demo.pack7Title"),
      desc: t("demo.pack7Desc"),
      impact: t("demo.pack7Impact"),
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t("demo.howTitle")}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {packs.map((pack) => (
          <div key={pack.title} className="rounded-xl border border-border/20 bg-card/20 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <pack.icon className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">{pack.title}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{pack.desc}</p>
            <p className="text-xs">
              <span className="font-semibold text-primary">{t("demo.impactLabel")}:</span>{" "}
              <span className="text-foreground/85">{pack.impact}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturesContent() {
  const { t } = useTranslation();
  const outcomes = [
    { icon: Calendar, title: t("demo.feat1"), desc: t("demo.feat1Sub") },
    { icon: Users, title: t("demo.feat2"), desc: t("demo.feat2Sub") },
    { icon: BarChart3, title: t("demo.feat3"), desc: t("demo.feat3Sub") },
    { icon: Bell, title: t("demo.feat4"), desc: t("demo.feat4Sub") },
    { icon: Smartphone, title: t("demo.feat5"), desc: t("demo.feat5Sub") },
    { icon: Lock, title: t("demo.feat6"), desc: t("demo.feat6Sub") },
    { icon: QrCode, title: t("demo.feat7"), desc: t("demo.feat7Sub") },
    { icon: Zap, title: t("demo.feat8"), desc: t("demo.feat8Sub") },
  ];
  const keyFunctions = [
    t("demo.keyFn1"),
    t("demo.keyFn2"),
    t("demo.keyFn3"),
    t("demo.keyFn4"),
    t("demo.keyFn5"),
    t("demo.keyFn6"),
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t("demo.featTitle")}</h2>
      <p className="text-sm text-muted-foreground">{t("demo.featLead")}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {outcomes.map((item) => (
          <div key={item.title} className="flex gap-3 items-start rounded-lg border border-border/20 bg-card/20 p-3">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <item.icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-sm">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
        <h3 className="text-sm font-semibold mb-2 text-primary">{t("demo.keyFunctionsTitle")}</h3>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {keyFunctions.map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs sm:text-sm">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function QrContent({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + "/booking")}&bgcolor=transparent&color=c8a864&format=svg`}
        alt={t("demo.qrAlt")}
        className="w-32 h-32 rounded-lg"
        loading="lazy"
      />
      <h3 className="font-semibold text-lg">{t("demo.qrTitle")}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{t("demo.qrDesc")}</p>
      <div className="grid w-full max-w-sm gap-2">
        <Button onClick={() => navigate("/booking")}>{t("demo.qrPrimaryBtn")}</Button>
        <Button variant="outline" onClick={() => navigate("/auth")}>
          {t("demo.qrSecondaryBtn")}
        </Button>
      </div>
    </div>
  );
}

export default function DemoPage() {
  const [activeCard, setActiveCard] = useState(0);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const cards = [
    { id: "hero", label: t("demo.cardPapi"), sub: t("demo.cardPapiSub"), Icon: Sparkles },
    { id: "accounts", label: t("demo.cardDemo"), sub: t("demo.cardDemoSub"), Icon: User },
    { id: "how", label: t("demo.cardHow"), sub: t("demo.cardHowSub"), Icon: Zap },
    { id: "features", label: t("demo.cardFeatures"), sub: t("demo.cardFeaturesSub"), Icon: Calendar },
    { id: "qr", label: t("demo.cardQr"), sub: t("demo.cardQrSub"), Icon: QrCode },
  ];

  const contentMap: Record<string, React.ReactNode> = {
    hero: <HeroContent navigate={navigate} />,
    accounts: <AccountsContent navigate={navigate} />,
    how: <HowContent />,
    features: <FeaturesContent />,
    qr: <QrContent navigate={navigate} />,
  };

  return (
    <div className="bg-background min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="fixed top-4 right-4 z-50 flex items-center gap-1">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="expanding-cards">
        {cards.map((card, i) => {
          const isActive = activeCard === i;
          return (
            <div
              key={card.id}
              className={`expanding-cards__option ${isActive ? "expanding-cards__option--active" : ""}`}
              onClick={() => setActiveCard(i)}
            >
              <div
                className="expanding-cards__bg"
                style={{ backgroundImage: `url(${cardBackgrounds[card.id]})` }}
              />
              {!isActive && <span className="expanding-cards__collapsed-label">{card.label}</span>}
              <div className="expanding-cards__shadow" />
              <div className="expanding-cards__label">
                <div className="expanding-cards__label-icon">
                  <card.Icon className="w-5 h-5" />
                </div>
                <div className="expanding-cards__label-info">
                  <div className="expanding-cards__label-text expanding-cards__label-main">{card.label}</div>
                  <div className="expanding-cards__label-text expanding-cards__label-sub">{card.sub}</div>
                </div>
              </div>
              <AnimatePresence mode="wait">
                {isActive && (
                  <motion.div key={card.id} className="expanding-cards__content" {...contentAnim}>
                    {contentMap[card.id]}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-4 left-0 right-0 text-center text-muted-foreground text-xs opacity-50">
        {t("demo.footer")}
      </div>
    </div>
  );
}
